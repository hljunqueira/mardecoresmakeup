import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, X, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Customer } from "@shared/schema";

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated?: (customer: any) => void;
  onCustomerUpdated?: (customer: any) => void;
  customer?: Customer | null; // Para edição
  mode?: 'create' | 'edit';
}

interface CustomerFormData {
  name: string;
  phone: string;
}

export default function CustomerModal({ 
  isOpen, 
  onClose, 
  onCustomerCreated, 
  onCustomerUpdated,
  customer = null,
  mode = 'create'
}: CustomerModalProps) {
  const [customerData, setCustomerData] = useState<CustomerFormData>({
    name: "",
    phone: "",
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const isEditMode = mode === 'edit' && customer;
  
  // Preencher dados quando estiver em modo de edição
  useEffect(() => {
    if (isEditMode && customer) {
      setCustomerData({
        name: customer.name || "",
        phone: customer.phone || "",
      });
    } else {
      setCustomerData({ name: "", phone: "" });
    }
  }, [isEditMode, customer]);

  // Mutation para criar cliente
  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const response = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar cliente");
      return response.json();
    },
    onSuccess: (newCustomer) => {
      toast({
        title: "Cliente criado com sucesso!",
        description: "O cliente foi adicionado ao sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-accounts"] });
      setCustomerData({ name: "", phone: "" });
      if (onCustomerCreated) {
        onCustomerCreated(newCustomer);
      }
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar cliente",
        description: "Tente novamente ou contate o suporte.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation para editar cliente
  const updateCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      if (!customer?.id) throw new Error("ID do cliente não encontrado");
      
      const response = await fetch(`/api/admin/customers/${customer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar cliente");
      return response.json();
    },
    onSuccess: (updatedCustomer) => {
      toast({
        title: "Cliente atualizado com sucesso!",
        description: "As informações do cliente foram atualizadas.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-accounts"] });
      if (onCustomerUpdated) {
        onCustomerUpdated(updatedCustomer);
      }
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar cliente",
        description: "Tente novamente ou contate o suporte.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome do cliente.",
        variant: "destructive",
      });
      return;
    }
    
    if (isEditMode) {
      updateCustomerMutation.mutate(customerData);
    } else {
      createCustomerMutation.mutate(customerData);
    }
  };

  const handleClose = () => {
    setCustomerData({ name: "", phone: "" });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" aria-describedby="customer-form-description">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              {isEditMode ? (
                <Edit className="h-5 w-5 text-petrol-600" />
              ) : (
                <UserPlus className="h-5 w-5 text-petrol-600" />
              )}
              <span>{isEditMode ? 'Editar Cliente' : 'Novo Cliente'}</span>
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
          <DialogDescription id="customer-form-description">
            {isEditMode ? 'Edite as informações do cliente' : 'Cadastre um novo cliente no sistema'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">Nome Completo *</Label>
            <Input
              id="customerName"
              value={customerData.name}
              onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
              placeholder="Nome completo"
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="customerPhone">Telefone</Label>
            <Input
              id="customerPhone"
              value={customerData.phone}
              onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
              placeholder="(11) 99999-9999"
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-petrol-600 hover:bg-petrol-700"
              disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
            >
              {(createCustomerMutation.isPending || updateCustomerMutation.isPending) ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {isEditMode ? 'Atualizando...' : 'Criando...'}
                </>
              ) : (
                isEditMode ? 'Atualizar Cliente' : 'Criar Cliente'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}