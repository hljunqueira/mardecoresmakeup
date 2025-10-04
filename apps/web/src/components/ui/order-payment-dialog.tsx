import { useState, useEffect } from "react";
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
import { DollarSign, Calendar, CreditCard, AlertCircle, CheckCircle, Banknote, CreditCardIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Order, Customer, CreditAccount } from "@shared/schema";

interface OrderPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  customer: Customer;
  paymentType: 'partial' | 'total';
}

export default function OrderPaymentDialog({ 
  isOpen, 
  onOpenChange, 
  order, 
  customer, 
  paymentType 
}: OrderPaymentDialogProps) {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [creditAccount, setCreditAccount] = useState<CreditAccount | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  const orderTotal = parseFloat(order.total?.toString() || "0");
  
  // Buscar ou criar conta de crediário quando o modal abrir
  useEffect(() => {
    if (isOpen && order && customer) {
      findOrCreateCreditAccount();
    }
  }, [isOpen, order, customer]);
  
  // Pré-preencher valor baseado no tipo de pagamento
  useEffect(() => {
    if (creditAccount) {
      const currentTotalAmount = Math.max(0, parseFloat(creditAccount.totalAmount?.toString() || "0") || orderTotal);
      const currentPaidAmount = Math.max(0, parseFloat(creditAccount.paidAmount?.toString() || "0"));
      const currentRemainingAmount = Math.max(0, currentTotalAmount - currentPaidAmount);
      
      if (paymentType === 'total' && currentRemainingAmount > 0) {
        setPaymentAmount(currentRemainingAmount.toFixed(2));
      } else if (paymentType === 'partial') {
        setPaymentAmount(""); // Deixar vazio para pagamento parcial
      }
    }
  }, [paymentType, creditAccount, orderTotal]);
  
  const findOrCreateCreditAccount = async () => {
    try {
      // Primeiro, buscar contas de crediário existentes
      const accountsResponse = await apiRequest("GET", "/api/admin/credit-accounts");
      const accounts = await accountsResponse.json();
      
      // Procurar conta ativa para este pedido específico ou cliente
      const existingAccount = accounts.find((account: CreditAccount) => 
        (account.customerId === customer.id && account.status === 'active') ||
        (account.notes && account.notes.includes(order.id))
      );
      
      if (existingAccount) {
        // Verificar se os valores estão corretos
        const totalAmount = parseFloat(existingAccount.totalAmount?.toString() || "0");
        const paidAmount = parseFloat(existingAccount.paidAmount?.toString() || "0");
        let remainingAmount = parseFloat(existingAccount.remainingAmount?.toString() || "0");
        
        // Se remainingAmount está zerado mas deveria ter valor, recalcular
        if (remainingAmount === 0 && totalAmount > 0 && paidAmount < totalAmount) {
          remainingAmount = totalAmount - paidAmount;
        }
        
        // Se a conta não tem valores corretos, usar os valores do pedido
        if (totalAmount === 0) {
          const updatedAccountData = {
            totalAmount: orderTotal,
            paidAmount: paidAmount,
            remainingAmount: orderTotal - paidAmount,
          };
          
          await apiRequest("PUT", `/api/admin/credit-accounts/${existingAccount.id}`, updatedAccountData);
          
          // Atualizar o objeto local
          existingAccount.totalAmount = orderTotal;
          existingAccount.remainingAmount = orderTotal - paidAmount;
        } else if (remainingAmount !== (totalAmount - paidAmount)) {
          // Corrigir remainingAmount se estiver inconsistente
          remainingAmount = totalAmount - paidAmount;
          await apiRequest("PUT", `/api/admin/credit-accounts/${existingAccount.id}`, {
            remainingAmount: remainingAmount
          });
          existingAccount.remainingAmount = remainingAmount;
        }
        
        setCreditAccount(existingAccount);
        return;
      }
      
      // Se não existe, criar uma nova conta baseada no pedido
      const accountData = {
        customerId: customer.id,
        accountNumber: `CR${Date.now().toString().slice(-6)}`,
        totalAmount: orderTotal,
        paidAmount: 0,
        remainingAmount: orderTotal,
        installments: 1,
        installmentValue: orderTotal,
        paymentFrequency: 'monthly',
        status: 'active',
        notes: `Conta criada automaticamente para pedido ${order.orderNumber} (ID: ${order.id})`,
      };
      
      const response = await apiRequest("POST", "/api/admin/credit-accounts", accountData);
      const newAccount = await response.json();
      
      console.log('💳 Nova conta de crediário criada:', newAccount);
      setCreditAccount(newAccount);
      
      // Invalidar queries para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-accounts"] });
      
    } catch (error) {
      console.error('Erro ao buscar/criar conta de crediário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da conta de crediário.",
        variant: "destructive",
      });
    }
  };
  
  const processPaymentMutation = useMutation({
    mutationFn: async (paymentData: {
      amount: number;
      method: string;
      notes: string;
    }) => {
      if (!creditAccount) throw new Error("Conta de crediário não encontrada");
      
      setIsProcessing(true);
      
      // Usar valores calculados corretamente
      const currentPaidAmount = Math.max(0, parseFloat(creditAccount.paidAmount?.toString() || "0"));
      const currentTotalAmount = Math.max(0, parseFloat(creditAccount.totalAmount?.toString() || "0") || orderTotal);
      const currentRemainingAmount = Math.max(0, currentTotalAmount - currentPaidAmount);
      
      const newPaidAmount = currentPaidAmount + paymentData.amount;
      const newRemainingAmount = Math.max(0, currentRemainingAmount - paymentData.amount);
      const willBePaidOff = newRemainingAmount === 0;
      
      // 1. Registrar o pagamento (o backend já faz as atualizações automaticamente)
      const paymentResponse = await apiRequest("POST", "/api/admin/credit-payments", {
        creditAccountId: creditAccount.id,
        amount: paymentData.amount,
        paymentMethod: paymentData.method,
        notes: paymentData.notes,
        status: 'completed'
      });
      
      console.log('✅ Pagamento registrado, backend irá sincronizar automaticamente');
      
      return { payment: paymentResponse, willBePaidOff };
    },
    onSuccess: (data) => {
      console.log('✅ Pagamento processado com sucesso:', data);
      
      // Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/financial/summary"] });
      
      // Mensagem de sucesso personalizada
      const message = data.willBePaidOff 
        ? "Pedido quitado com sucesso! Status atualizado automaticamente."
        : "Pagamento registrado com sucesso!";
        
      toast({
        title: paymentType === 'total' ? "Pedido Quitado!" : "Pagamento Registrado!",
        description: message,
      });
      
      setPaymentAmount("");
      setNotes("");
      onOpenChange(false);
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error('Erro ao processar pagamento:', error);
      toast({
        title: "Erro ao processar pagamento",
        description: "Tente novamente ou contate o suporte.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const paymentValue = parseFloat(paymentAmount) || 0;
    
    if (!paymentAmount || paymentValue <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido para o pagamento",
        variant: "destructive",
      });
      return;
    }
    
    if (remainingAmount <= 0 && order.status === 'completed') {
      toast({
        title: "Pedido já quitado",
        description: "Este pedido já foi totalmente quitado.",
        variant: "destructive",
      });
      return;
    }
    
    // 🔄 Se o pedido está pendente mas não há valor restante, algo está errado
    if (remainingAmount <= 0 && order.status === 'pending') {
      toast({
        title: "Erro de sincronização",
        description: "Pedido pendente mas sem valor restante. Recarregue a página.",
        variant: "destructive",
      });
      return;
    }
    
    if (paymentValue > remainingAmount) {
      toast({
        title: "Valor excede pendência",
        description: `O valor do pagamento (${formatCurrency(paymentValue)}) não pode ser maior que o valor pendente (${formatCurrency(remainingAmount)})`,
        variant: "destructive",
      });
      return;
    }
    
    processPaymentMutation.mutate({
      amount: paymentValue,
      method: paymentMethod,
      notes: notes.trim()
    });
  };
  
  if (!creditAccount) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Carregando...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-petrol-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Valores seguros - garantir que nunca sejam negativos ou incorretos
  const totalAmount = Math.max(0, parseFloat(creditAccount?.totalAmount?.toString() || "0") || orderTotal);
  const paidAmount = Math.max(0, parseFloat(creditAccount?.paidAmount?.toString() || "0"));
  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const paymentValue = Math.max(0, parseFloat(paymentAmount) || 0);
  const willBePaidOff = paymentValue >= remainingAmount && paymentValue > 0;
  
  // 🔄 Verificar se há realmente valor pendente
  const hasPendingAmount = remainingAmount > 0 && order.status === 'pending';
  const isOrderActuallyPaidOff = remainingAmount <= 0 && order.status === 'completed';
  
  // Calcular valores após o pagamento
  const amountAfterPayment = Math.max(0, remainingAmount - paymentValue);
  const paidAfterPayment = paidAmount + paymentValue;
  const progressAfterPayment = totalAmount > 0 ? (paidAfterPayment / totalAmount) * 100 : 0;
  const currentProgress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-2xl font-bold text-petrol-700 flex items-center">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
              paymentType === 'total' 
                ? 'bg-gradient-to-br from-green-500 to-green-600' 
                : 'bg-gradient-to-br from-blue-500 to-blue-600'
            }`}>
              {paymentType === 'total' ? (
                <Banknote className="h-5 w-5 text-white" />
              ) : (
                <CreditCardIcon className="h-5 w-5 text-white" />
              )}
            </div>
            {paymentType === 'total' ? 'Pagamento Total' : 'Pagamento Parcial'}
          </DialogTitle>
          <DialogDescription>
            {paymentType === 'total' 
              ? 'Quitar completamente este pedido de crediário'
              : 'Registrar um pagamento parcial do pedido de crediário'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Informações do Pedido */}
          <Card className="border-petrol-200 bg-gradient-to-r from-petrol-50 to-petrol-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-petrol-700 flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Pedido #{order.orderNumber} - {customer.name}
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
                  <span>{currentProgress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${currentProgress}%` }}
                  />
                </div>
                
                {/* Preview do progresso após pagamento */}
                {paymentValue > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1 text-blue-600">
                      <span>Após pagamento</span>
                      <span>{progressAfterPayment.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          willBePaidOff 
                            ? 'bg-gradient-to-r from-green-500 to-green-600' 
                            : 'bg-gradient-to-r from-blue-500 to-blue-600'
                        }`}
                        style={{ width: `${Math.min(100, progressAfterPayment)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Formulário de Pagamento */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Valor do Pagamento */}
            <div className="space-y-2">
              <Label htmlFor="paymentAmount" className="text-sm font-medium text-gray-700">
                Valor do Pagamento *
              </Label>
              
              {/* Alerta quando pedido já quitado */}
              {isOrderActuallyPaidOff && (
                <Alert className="border-green-200 bg-green-50 mb-4">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Pedido já quitado!</strong> Este pedido não possui valor pendente para pagamento.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Alerta quando pedido pendente com valores corretos */}
              {hasPendingAmount && (
                <Alert className="border-blue-200 bg-blue-50 mb-4">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Pagamento disponível:</strong> Você pode pagar até {formatCurrency(remainingAmount)}.
                  </AlertDescription>
                </Alert>
              )}
              <div className="relative">
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  min={hasPendingAmount ? "0.01" : "0"}
                  max={hasPendingAmount ? remainingAmount : undefined}
                  value={paymentAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPaymentAmount(value);
                  }}
                  placeholder="0,00"
                  className="pl-8 text-lg font-medium border-2 border-gray-200 focus:border-blue-500 transition-colors"
                  required
                  disabled={!hasPendingAmount}
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                  R$
                </span>
              </div>
              
              {/* Sugestões de valores rápidos */}
              {paymentType === 'partial' && hasPendingAmount && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs text-gray-600">Sugestões:</span>
                  {[remainingAmount * 0.25, remainingAmount * 0.5, remainingAmount * 0.75, remainingAmount].map((suggestion, index) => {
                    const labels = ['25%', '50%', '75%', '100%'];
                    return (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={() => setPaymentAmount(suggestion.toFixed(2))}
                      >
                        {labels[index]} (R$ {suggestion.toFixed(2)})
                      </Button>
                    );
                  })}
                </div>
              )}
              
              {paymentValue > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-2">Após este pagamento:</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-blue-600">{formatCurrency(paidAfterPayment)} pagos</span>
                    </div>
                    <div>
                      <span className="text-orange-600">{formatCurrency(amountAfterPayment)} restante</span>
                    </div>
                  </div>
                  {willBePaidOff && (
                    <div className="mt-2">
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        Pedido será quitado
                      </Badge>
                    </div>
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
                placeholder={`Ex: ${paymentType === 'total' ? 'Quitação total do pedido' : 'Pagamento parcial'} - ${new Date().toLocaleDateString('pt-BR')}`}
                rows={3}
                className="resize-none"
              />
            </div>
            
            {/* Preview */}
            {paymentValue > 0 && (
              <Alert className={`border-${willBePaidOff ? 'green' : 'blue'}-200 bg-${willBePaidOff ? 'green' : 'blue'}-50`}>
                <CheckCircle className={`h-4 w-4 text-${willBePaidOff ? 'green' : 'blue'}-600`} />
                <AlertDescription className={`text-${willBePaidOff ? 'green' : 'blue'}-800`}>
                  <div className="space-y-1">
                    <p><strong>Resumo do Pagamento:</strong></p>
                    <p>• Valor: {formatCurrency(paymentValue)}</p>
                    <p>• Método: {paymentMethod.replace('_', ' ').toUpperCase()}</p>
                    <p>• Status após pagamento: {willBePaidOff ? 'PEDIDO QUITADO' : 'PAGAMENTO PARCIAL'}</p>
                    {willBePaidOff && <p>• Estoque será atualizado automaticamente</p>}
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
                className={`px-8 ${
                  paymentType === 'total' 
                    ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800' 
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                } text-white`}
                disabled={isProcessing || remainingAmount <= 0 || !paymentAmount || paymentValue <= 0}
              >
                {isProcessing ? "Processando..." : 
                  `${paymentType === 'total' ? 'Quitar Pedido' : 'Registrar Pagamento'} ${formatCurrency(paymentValue)}`
                }
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}