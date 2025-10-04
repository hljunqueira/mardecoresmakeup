import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { DollarSign, Calendar, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import type { CreditAccount, Customer } from "@shared/schema";

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  creditAccount: CreditAccount;
  customer: Customer;
}

export default function PaymentDialog({ isOpen, onOpenChange, creditAccount, customer }: PaymentDialogProps) {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const queryClient = useQueryClient();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  const remainingAmount = parseFloat(creditAccount.remainingAmount?.toString() || "0");
  const totalAmount = parseFloat(creditAccount.totalAmount?.toString() || "0");
  const paidAmount = parseFloat(creditAccount.paidAmount?.toString() || "0");
  
  const calculateNewValues = (payment: number) => {
    const newPaidAmount = paidAmount + payment;
    const newRemainingAmount = Math.max(0, remainingAmount - payment);
    return { newPaidAmount, newRemainingAmount };
  };
  
  const paymentValue = parseFloat(paymentAmount) || 0;
  const { newPaidAmount, newRemainingAmount } = calculateNewValues(paymentValue);
  const willBePaidOff = newRemainingAmount === 0;
  
  const processPaymentMutation = useMutation({
    mutationFn: async (paymentData: {
      amount: number;
      method: string;
      notes: string;
    }) => {
      setIsProcessing(true);
      
      // 1. Registrar o pagamento
      const paymentResponse = await apiRequest("POST", "/api/admin/credit-payments", {
        creditAccountId: creditAccount.id,
        amount: paymentData.amount,
        paymentMethod: paymentData.method,
        notes: paymentData.notes,
        status: 'completed'
      });
      
      // 2. Atualizar a conta de crediário
      const updatedAccountData = {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        status: willBePaidOff ? 'paid_off' : 'active',
        ...(willBePaidOff && { closedAt: new Date().toISOString() })
      };
      
      const accountResponse = await apiRequest("PUT", `/api/admin/credit-accounts/${creditAccount.id}`, updatedAccountData);
      
      // 🎯 NOVO FLUXO: Se a conta foi quitada, finalizar automaticamente as reservas
      if (willBePaidOff) {
        console.log('🎉 Conta quitada! Iniciando finalização automática das reservas...');
        
        try {
          const finalizationResponse = await apiRequest("POST", `/api/admin/credit-accounts/${creditAccount.id}/finalize-reservations`, {});
          const finalizationResult = await finalizationResponse.json();
          console.log('✅ Finalização automática concluída:', finalizationResult);
          
          // Mostrar toast de sucesso sobre a finalização automática
          if (finalizationResult.success && finalizationResult.reservationsProcessed > 0) {
            console.log('🎆 Exibindo notificação de finalização automática');
            // Toast será mostrado via onSuccess
          }
        } catch (finalizationError) {
          console.error('❌ Erro na finalização automática:', finalizationError);
          // Não falha o pagamento, apenas loga o erro
        }
      }
      
      // 3. Atualizar o totalSpent do cliente
      const currentTotalSpent = parseFloat(customer.totalSpent?.toString() || "0");
      const newTotalSpent = currentTotalSpent + paymentData.amount;
      
      await apiRequest("PUT", `/api/admin/customers/${customer.id}`, {
        totalSpent: newTotalSpent.toString()
      });
      
      return { payment: paymentResponse, account: accountResponse };
    },
    onSuccess: (data) => {
      // Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/financial/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/financial/consolidated"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/financial/sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      
      // Forçar refetch do dashboard financeiro
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/admin/financial"] });
        queryClient.refetchQueries({ queryKey: ["/api/admin/dashboard"] });
      }, 500);
      
      // Mensagem de sucesso personalizada
      if (willBePaidOff) {
        console.log('🎆 Conta quitada! Produtos automaticamente reduzidos do estoque e vendas registradas.');
      }
      
      setPaymentAmount("");
      setNotes("");
      onOpenChange(false);
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error('❌ Erro ao processar pagamento:', error);
      setIsProcessing(false);
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentAmount || paymentValue <= 0) {
      alert("Por favor, insira um valor válido para o pagamento");
      return;
    }
    
    if (paymentValue > remainingAmount) {
      alert(`O valor do pagamento (${formatCurrency(paymentValue)}) não pode ser maior que o valor pendente (${formatCurrency(remainingAmount)})`);
      return;
    }
    
    processPaymentMutation.mutate({
      amount: paymentValue,
      method: paymentMethod,
      notes: notes.trim()
    });
  };
  
  const suggestedAmounts = [
    { label: "50%", value: remainingAmount * 0.5 },
    { label: "Total", value: remainingAmount },
    { label: "R$ 50", value: 50 },
    { label: "R$ 100", value: 100 }
  ].filter(suggestion => suggestion.value <= remainingAmount && suggestion.value > 0);
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="payment-dialog-description">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-2xl font-bold text-petrol-700 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mr-3">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            Registrar Pagamento
          </DialogTitle>
          <DialogDescription id="payment-dialog-description">
            Registre um pagamento da conta de crediário do cliente
          </DialogDescription>
        </DialogHeader>
        
        {/* Informações da Conta */}
        <div className="space-y-6">
          <Card className="border-petrol-200 bg-gradient-to-r from-petrol-50 to-petrol-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-petrol-700 flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                {creditAccount.accountNumber} - {customer.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 font-medium">Valor Total</p>
                  <p className="text-lg font-bold text-petrol-700">{formatCurrency(totalAmount)}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Já Pago</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(paidAmount)}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Pendente</p>
                  <p className="text-lg font-bold text-orange-600">{formatCurrency(remainingAmount)}</p>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span>Progresso do Pagamento</span>
                  <span>{((paidAmount / totalAmount) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${(paidAmount / totalAmount) * 100}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Formulário de Pagamento */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Valores Sugeridos */}
            {suggestedAmounts.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Valores Sugeridos
                </Label>
                <div className="flex flex-wrap gap-2">
                  {suggestedAmounts.map((suggestion) => (
                    <Button
                      key={suggestion.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-petrol-300 text-petrol-700 hover:bg-petrol-50"
                      onClick={() => setPaymentAmount(suggestion.value.toFixed(2))}
                    >
                      {suggestion.label}
                      {suggestion.label !== "50%" && suggestion.label !== "Total" && 
                        ` (${formatCurrency(suggestion.value)})`
                      }
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Valor do Pagamento */}
            <div className="space-y-2">
              <Label htmlFor="paymentAmount" className="text-sm font-medium text-gray-700">
                Valor do Pagamento *
              </Label>
              <div className="relative">
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remainingAmount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0,00"
                  className="pl-8 text-lg font-medium"
                  required
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                  R$
                </span>
              </div>
              {paymentValue > 0 && (
                <div className="text-xs text-gray-600 mt-1">
                  Após este pagamento: <strong className="text-green-600">{formatCurrency(newPaidAmount)} pagos</strong> • 
                  <strong className="text-orange-600"> {formatCurrency(newRemainingAmount)} restante</strong>
                  {willBePaidOff && (
                    <Badge className="ml-2 bg-green-100 text-green-800 border-green-200">
                      Conta será quitada
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            {/* Método de Pagamento */}
            <div className="space-y-2">
              <Label htmlFor="paymentMethod" className="text-sm font-medium text-gray-700">
                Método de Pagamento *
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                Observações (opcional)
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Pagamento referente à parcela de janeiro..."
                rows={3}
                className="resize-none"
              />
            </div>
            
            {/* Preview */}
            {paymentValue > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="space-y-1">
                    <p><strong>Resumo do Pagamento:</strong></p>
                    <p>• Valor: {formatCurrency(paymentValue)}</p>
                    <p>• Método: {paymentMethod.replace('_', ' ').toUpperCase()}</p>
                    <p>• Status da conta após pagamento: {willBePaidOff ? 'QUITADA' : 'ATIVA'}</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Botões */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8"
                disabled={isProcessing || !paymentAmount || paymentValue <= 0 || paymentValue > remainingAmount}
              >
                {isProcessing ? "Processando..." : `Registrar Pagamento de ${formatCurrency(paymentValue)}`}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}