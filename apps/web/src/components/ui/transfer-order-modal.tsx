import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowRightLeft, X, Users, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import type { Customer, Order } from "@shared/schema";

interface TransferOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  currentCustomer: Customer | null;
  onTransferCompleted?: () => void;
}

export default function TransferOrderModal({ 
  isOpen, 
  onClose, 
  order, 
  currentCustomer,
  onTransferCompleted 
}: TransferOrderModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todos os clientes ativos
  const { data: customers, isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/admin/customers"],
    enabled: isOpen,
  });

  // Filtrar clientes (excluir o cliente atual do pedido)
  const availableCustomers = customers?.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    const isNotCurrentCustomer = customer.id !== currentCustomer?.id;
    return matchesSearch && isNotCurrentCustomer;
  }) || [];

  // Mutation para transferir pedido
  const transferOrderMutation = useMutation({
    mutationFn: async (newCustomerId: string) => {
      if (!order) throw new Error("Pedido não encontrado");
      
      setIsTransferring(true);
      
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: newCustomerId,
          transferredAt: new Date().toISOString(),
          transferredFrom: currentCustomer?.id,
        }),
      });
      
      if (!response.ok) throw new Error("Erro ao transferir pedido");
      return response.json();
    },
    onSuccess: (updatedOrder) => {
      toast({
        title: "Pedido transferido com sucesso!",
        description: `Pedido transferido para ${selectedCustomer?.name}`,
      });
      
      // Invalidar queries para atualizar as listas
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-accounts"] });
      
      if (onTransferCompleted) {
        onTransferCompleted();
      }
      
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Erro ao transferir pedido",
        description: "Tente novamente ou contate o suporte.",
        variant: "destructive",
      });
      setIsTransferring(false);
    },
  });

  const handleTransfer = () => {
    if (!selectedCustomer) {
      toast({
        title: "Cliente não selecionado",
        description: "Por favor, selecione um cliente para transferir o pedido.",
        variant: "destructive",
      });
      return;
    }

    transferOrderMutation.mutate(selectedCustomer.id);
  };

  const handleClose = () => {
    setSearchTerm("");
    setSelectedCustomer(null);
    setIsTransferring(false);
    onClose();
  };

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  };

  const formatOrderNumber = (order: Order) => {
    const orderNumber = order.orderNumber || order.id;
    if (order.paymentMethod === 'credit') {
      const number = orderNumber.replace('PED', '').padStart(4, '0');
      return `CRE${number}`;
    }
    return orderNumber.startsWith('PED') ? orderNumber : `PED${orderNumber.padStart(4, '0')}`;
  };

  if (!order || !currentCustomer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-petrol-700 flex items-center">
              <ArrowRightLeft className="h-6 w-6 mr-3 text-petrol-600" />
              Transferir Pedido
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Transferir pedido para outro cliente cadastrado no sistema
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Informações do Pedido Atual */}
          <Card className="border-petrol-200 bg-gradient-to-r from-petrol-50 to-petrol-100">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 font-medium">Pedido</p>
                  <p className="font-bold text-petrol-700">#{formatOrderNumber(order)}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Cliente Atual</p>
                  <p className="font-bold text-petrol-700">{currentCustomer.name}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Valor Total</p>
                  <p className="font-bold text-petrol-700">{formatCurrency(order.total || 0)}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Status</p>
                  <p className="font-bold text-petrol-700 capitalize">{order.status || 'pending'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Busca de Clientes */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold text-gray-700">
              Selecionar Novo Cliente
            </Label>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar cliente por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-petrol-200 focus:border-petrol-400"
              />
            </div>

            {/* Lista de Clientes */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {customersLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-petrol-600 mx-auto" />
                  <p className="text-gray-500 mt-2">Carregando clientes...</p>
                </div>
              ) : availableCustomers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">
                    {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente disponível'}
                  </p>
                </div>
              ) : (
                availableCustomers.map((customer) => (
                  <Card
                    key={customer.id}
                    className={`cursor-pointer border-2 transition-all duration-200 ${
                      selectedCustomer?.id === customer.id
                        ? 'border-petrol-500 bg-petrol-50'
                        : 'border-gray-200 hover:border-petrol-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-petrol-100 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-petrol-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{customer.name}</p>
                          <p className="text-sm text-gray-500">
                            {customer.phone || 'Sem telefone'}
                          </p>
                        </div>
                        {selectedCustomer?.id === customer.id && (
                          <div className="w-5 h-5 bg-petrol-600 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isTransferring}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleTransfer}
              className="bg-petrol-600 hover:bg-petrol-700 text-white"
              disabled={!selectedCustomer || isTransferring}
            >
              {isTransferring ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Transferindo...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transferir Pedido
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}