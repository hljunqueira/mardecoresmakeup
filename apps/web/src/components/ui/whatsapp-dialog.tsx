import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, MessageCircle, Copy, ExternalLink, User } from "lucide-react";
import type { CreditAccount, Customer } from "@shared/schema";

interface WhatsAppDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  creditAccount: CreditAccount;
  customer: Customer;
}

export default function WhatsAppDialog({ isOpen, onOpenChange, creditAccount, customer }: WhatsAppDialogProps) {
  const [customMessage, setCustomMessage] = useState("");
  const [messageType, setMessageType] = useState<'reminder' | 'overdue' | 'custom'>('reminder');
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('pt-BR');
  };

  const remainingAmount = parseFloat(creditAccount.remainingAmount?.toString() || "0");
  const nextPaymentDate = creditAccount.nextPaymentDate ? new Date(creditAccount.nextPaymentDate) : null;
  const isOverdue = nextPaymentDate && nextPaymentDate < new Date();

  // Modelos de mensagem pré-definidos
  const messageTemplates = {
    reminder: `🌟 *Mar de Cores* 🌟

Olá, ${customer.name}! 

Esperamos que esteja tudo bem! 

📋 *Lembrete da sua conta de crediário:*
• Conta: ${creditAccount.accountNumber}
• Valor pendente: *${formatCurrency(remainingAmount)}*
• Próximo vencimento: ${nextPaymentDate ? formatDate(nextPaymentDate) : 'A definir'}

💳 Aceitamos PIX, cartão ou dinheiro!

Qualquer dúvida, estamos aqui para ajudar! 💙

_Mar de Cores - Sempre com você!_ ✨`,

    overdue: `⚠️ *Mar de Cores* - Conta Vencida ⚠️

Olá, ${customer.name}!

Verificamos que sua conta de crediário está com o pagamento em atraso:

📋 *Detalhes da conta:*
• Conta: ${creditAccount.accountNumber}
• Valor em atraso: *${formatCurrency(remainingAmount)}*
• Data de vencimento: ${nextPaymentDate ? formatDate(nextPaymentDate) : 'A definir'}

🙏 Por favor, entre em contato conosco para regularizar a situação.

💳 Facilitamos o pagamento com PIX, cartão ou dinheiro!

_Mar de Cores - Juntos encontramos a solução!_ 💙`,

    custom: customMessage
  };

  const currentMessage = messageTemplates[messageType];

  const copyMessage = () => {
    navigator.clipboard.writeText(currentMessage);
    alert("Mensagem copiada para a área de transferência!");
  };

  const openWhatsApp = () => {
    if (!customer.phone) {
      alert("Cliente não possui telefone cadastrado!");
      return;
    }

    // Remove caracteres não numéricos do telefone
    const cleanPhone = customer.phone.replace(/\D/g, '');
    
    // Adiciona código do país se necessário (55 para Brasil)
    const phoneWithCountryCode = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    // Codifica a mensagem para URL
    const encodedMessage = encodeURIComponent(currentMessage);
    
    // Cria a URL do WhatsApp
    const whatsappUrl = `https://wa.me/${phoneWithCountryCode}?text=${encodedMessage}`;
    
    // Abre o WhatsApp
    window.open(whatsappUrl, '_blank');
  };

  const presetMessages = [
    {
      type: 'reminder' as const,
      title: 'Lembrete Amigável',
      description: 'Mensagem educada para lembrar do pagamento',
      icon: '💙'
    },
    {
      type: 'overdue' as const,
      title: 'Conta Vencida',
      description: 'Mensagem para contas em atraso',
      icon: '⚠️'
    },
    {
      type: 'custom' as const,
      title: 'Mensagem Personalizada',
      description: 'Escreva sua própria mensagem',
      icon: '✏️'
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-2xl font-bold text-green-700 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mr-3">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            Enviar WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Cliente e Conta */}
          <Card className="border-green-200 bg-gradient-to-r from-green-50 to-green-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-green-700 flex items-center">
                <User className="h-5 w-5 mr-2" />
                {customer.name} - Conta {creditAccount.accountNumber}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 font-medium">Telefone</p>
                  <p className="text-lg font-bold text-green-700 flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    {customer.phone || 'Não cadastrado'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Valor Pendente</p>
                  <p className="text-lg font-bold text-orange-600">{formatCurrency(remainingAmount)}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Status</p>
                  <Badge className={isOverdue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                    {isOverdue ? 'Vencida' : 'Em dia'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {!customer.phone && (
            <Alert>
              <Phone className="h-4 w-4" />
              <AlertDescription>
                Cliente não possui telefone cadastrado. Adicione um telefone para enviar mensagens.
              </AlertDescription>
            </Alert>
          )}

          {/* Seleção de Modelo de Mensagem */}
          <div>
            <Label className="text-base font-medium text-gray-700 mb-3 block">
              Escolha o tipo de mensagem:
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {presetMessages.map((preset) => (
                <Card 
                  key={preset.type}
                  className={`cursor-pointer transition-all duration-200 ${
                    messageType === preset.type 
                      ? 'border-green-400 bg-green-50 shadow-md' 
                      : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
                  }`}
                  onClick={() => setMessageType(preset.type)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-2">{preset.icon}</div>
                    <h3 className="font-medium text-gray-900 mb-1">{preset.title}</h3>
                    <p className="text-xs text-gray-600">{preset.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Textarea para mensagem personalizada */}
          {messageType === 'custom' && (
            <div>
              <Label className="text-base font-medium text-gray-700 mb-2 block">
                Sua mensagem personalizada:
              </Label>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Digite sua mensagem personalizada aqui..."
                className="min-h-[120px] border-green-200 focus:border-green-400"
              />
            </div>
          )}

          {/* Preview da Mensagem */}
          <Card className="border-green-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-green-700">Preview da Mensagem</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={copyMessage}
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                  {currentMessage}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex justify-between items-center pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={copyMessage}
                disabled={!currentMessage.trim()}
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar Mensagem
              </Button>
              <Button
                onClick={openWhatsApp}
                disabled={!customer.phone || !currentMessage.trim()}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}