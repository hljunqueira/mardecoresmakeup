import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Phone, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Order, Customer } from "@shared/schema";

interface AddPhoneDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  customer?: Customer | null;
  onPhoneAdded: (phone: string) => void;
}

export function AddPhoneDialog({ 
  isOpen, 
  onOpenChange, 
  order, 
  customer, 
  onPhoneAdded 
}: AddPhoneDialogProps) {
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation para atualizar telefone do cliente
  const updateCustomerMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      if (customer?.id) {
        // Atualizar cliente existente
        const response = await fetch(`/api/admin/customers/${customer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phoneNumber }),
        });
        if (!response.ok) throw new Error("Erro ao atualizar cliente");
        return response.json();
      } else {
        // Atualizar pedido diretamente se não houver cliente vinculado
        const response = await fetch(`/api/admin/orders/${order.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerPhone: phoneNumber }),
        });
        if (!response.ok) throw new Error("Erro ao atualizar pedido");
        return response.json();
      }
    },
    onSuccess: () => {
      toast({
        title: "Telefone adicionado com sucesso!",
        description: "Agora você pode enviar mensagens pelo WhatsApp.",
        duration: 3000,
      });
      
      // Invalidar queries para atualizar os dados
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      
      // Chamar callback com o telefone adicionado
      onPhoneAdded(phone);
      
      // Fechar modal
      onOpenChange(false);
      setPhone("");
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar telefone",
        description: "Tente novamente ou contate o suporte.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone.trim()) {
      toast({
        title: "Telefone obrigatório",
        description: "Por favor, informe o número do telefone.",
        variant: "destructive",
      });
      return;
    }

    // Validação básica de telefone
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      toast({
        title: "Telefone inválido",
        description: "Por favor, informe um telefone válido com DDD.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateCustomerMutation.mutateAsync(phone);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPhone = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica máscara: (11) 99999-9999
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4,5})(\d{4})$/, '$1-$2');
    }
    
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const customerName = customer?.name || order.customerName || 'Cliente';

  // Função para formatar número do pedido com prefixo baseado no tipo
  const formatOrderNumber = (order: any) => {
    const orderNumber = order.orderNumber || order.id;
    
    if (order.paymentMethod === 'credit') {
      // Para crediário, usar prefixo CRE
      const number = orderNumber.replace('PED', '').padStart(4, '0');
      return `CRE${number}`;
    } else {
      // Para pedidos à vista, manter PED ou usar PED se não tiver
      if (orderNumber.startsWith('PED')) {
        return orderNumber;
      } else {
        return `PED${orderNumber.padStart(4, '0')}`;
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby="add-phone-dialog-description">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-petrol-700 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mr-3">
              <Phone className="h-5 w-5 text-white" />
            </div>
            Adicionar Telefone
          </DialogTitle>
          <DialogDescription id="add-phone-dialog-description">
            Para enviar mensagens pelo WhatsApp, precisamos do telefone do cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Cliente/Pedido */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Cliente:</strong> {customerName}
              <br />
              <strong>Pedido:</strong> #{formatOrderNumber(order)}
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone do Cliente *</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(11) 99999-9999"
                maxLength={15}
                autoFocus
                className="border-green-200 focus:border-green-400"
              />
              <p className="text-xs text-gray-600">
                Formato: (11) 99999-9999 com DDD
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  onOpenChange(false);
                  setPhone("");
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={isSubmitting || !phone.trim()}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Salvar e Continuar
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}