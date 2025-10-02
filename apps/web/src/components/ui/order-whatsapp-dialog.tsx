import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Phone, 
  MessageCircle, 
  Copy, 
  ExternalLink, 
  User, 
  Package, 
  DollarSign, 
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Send,
  Clock
} from "lucide-react";
import type { Order, OrderItem, Customer } from "@shared/schema";

// Tipo estendido para itens com dados do produto
type OrderItemWithProduct = OrderItem & {
  productName?: string;
  product?: {
    name: string;
    images?: string[];
    brand?: string;
    category?: string;
  };
};

interface OrderWhatsAppDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  customer?: Customer | null;
  orderItems?: OrderItemWithProduct[];
}

type MessageType = 'cash_sale' | 'pix_sale' | 'card_sale' | 'credit_sale' | 'pending_order' | 'credit_payment' | 'custom';

export function OrderWhatsAppDialog({ 
  isOpen, 
  onOpenChange, 
  order, 
  customer, 
  orderItems 
}: OrderWhatsAppDialogProps) {
  const [customMessage, setCustomMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>('cash_sale');
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [messageSentHistory, setMessageSentHistory] = useState<Date[]>([]);

  // E-mail PIX para crediário
  const PIX_EMAIL = "mardecoresmakeup@gmail.com";

  // Determinar tipo de mensagem automaticamente baseado no método de pagamento e status
  useEffect(() => {
    if (order.paymentMethod === 'credit') {
      // Se o pedido é de crediário, verificar se é novo ou pagamento
      setMessageType(order.status === 'pending' ? 'pending_order' : 'credit_sale');
    } else if (order.paymentMethod === 'pix') {
      setMessageType('pix_sale');
    } else if (order.paymentMethod === 'cartao' || order.paymentMethod === 'card') {
      setMessageType('card_sale');
    } else {
      setMessageType(order.status === 'pending' ? 'pending_order' : 'cash_sale');
    }
  }, [order.paymentMethod, order.status]);

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleString('pt-BR');
  };

  // Função para formatar número do pedido com prefixo baseado no tipo
  const formatOrderNumber = (order: Order) => {
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

  // Gerar resumo dos produtos com mais detalhes
  const generateProductSummary = () => {
    if (!orderItems || orderItems.length === 0) {
      return "• Produtos conforme pedido";
    }
    
    return orderItems.map((item, index) => {
      const productName = item.productName || item.product?.name || `Produto ID: ${item.productId}`;
      const quantity = item.quantity || 1;
      const unitPrice = parseFloat(item.unitPrice?.toString() || '0');
      const totalPrice = parseFloat(item.totalPrice?.toString() || '0');
      const brand = item.product?.brand;
      
      // Formato detalhado: "1x LAPIS DE CONTORNO LABIAL - LUISANCE - R$ 10,00"
      let productLine = `${index + 1}. ${quantity}x ${productName}`;
      
      if (brand && brand.trim()) {
        productLine += ` - ${brand}`;
      }
      
      productLine += ` - ${formatCurrency(totalPrice)}`;
      
      return productLine;
    }).join('\n');
  };
  
  // Gerar resumo com categorias para mensagens de crediário
  const generateDetailedProductSummary = () => {
    if (!orderItems || orderItems.length === 0) {
      return "• Produtos conforme pedido";
    }
    
    // Agrupar por categoria
    const productsByCategory = orderItems.reduce((acc, item) => {
      const category = item.product?.category || 'Outros';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, typeof orderItems>);
    
    return Object.entries(productsByCategory).map(([category, items]) => {
      const categoryTotal = items.reduce((sum, item) => sum + parseFloat(item.totalPrice?.toString() || '0'), 0);
      const categoryHeader = `🔸 *${category}* (${formatCurrency(categoryTotal)})`;
      
      const categoryItems = items.map(item => {
        const productName = item.productName || item.product?.name || `Produto ID: ${item.productId}`;
        const quantity = item.quantity || 1;
        const totalPrice = parseFloat(item.totalPrice?.toString() || '0');
        return `  • ${quantity}x ${productName} - ${formatCurrency(totalPrice)}`;
      }).join('\n');
      
      return `${categoryHeader}\n${categoryItems}`;
    }).join('\n\n');
  };

  // Templates de mensagem específicos
  const messageTemplates: Record<MessageType, string> = {
    cash_sale: `✅ *COMPRA CONFIRMADA - MAR DE CORES* ✅

Olá, ${customer?.name || order.customerName || 'Cliente'}! 

🎉 Obrigado pela sua preferência! Sua compra foi confirmada com sucesso.

🛍️ *DETALHES DA COMPRA:*
📋 Pedido: *${formatOrderNumber(order)}*
📅 Data: ${formatDate(order.createdAt || new Date())}
💰 Total pago: *${formatCurrency(order.total || 0)}*
💵 Método: Dinheiro

📦 *PRODUTOS:*
${generateProductSummary()}

💳 *INFORMAÇÕES IMPORTANTES:*
🔵 PIX disponível: mardecoresmakeup@gmail.com
💵 Também aceitamos dinheiro e cartão
🌐 Consulte nosso catálogo no site mardecoresmakeup.com.br e siga nosso Instagram para nossas dicas de produtos!

✨ Obrigado pela confiança!

💙 _Mar de Cores - Realizando seus sonhos!_ 💄`,

    pix_sale: `✅ *COMPRA CONFIRMADA - MAR DE CORES* ✅

Olá, ${customer?.name || order.customerName || 'Cliente'}! 

🎉 Obrigado pela sua preferência! Sua compra via PIX foi confirmada.

🛍️ *DETALHES DA COMPRA:*
📋 Pedido: *${formatOrderNumber(order)}*
📅 Data: ${formatDate(order.createdAt || new Date())}
💰 Total pago: *${formatCurrency(order.total || 0)}*
🔵 Método: PIX

📦 *PRODUTOS:*
${generateProductSummary()}

💳 *INFORMAÇÕES IMPORTANTES:*
🔵 PIX disponível: mardecoresmakeup@gmail.com
💵 Também aceitamos dinheiro e cartão
🌐 Consulte nosso catálogo no site mardecoresmakeup.com.br e siga nosso Instagram para nossas dicas de produtos!

✨ Obrigado pela confiança!

💙 _Mar de Cores - Realizando seus sonhos!_ 💄`,

    card_sale: `✅ *COMPRA CONFIRMADA - MAR DE CORES* ✅

Olá, ${customer?.name || order.customerName || 'Cliente'}! 

🎉 Obrigado pela sua preferência! Sua compra no cartão foi confirmada.

🛍️ *DETALHES DA COMPRA:*
📋 Pedido: *${formatOrderNumber(order)}*
📅 Data: ${formatDate(order.createdAt || new Date())}
💰 Total pago: *${formatCurrency(order.total || 0)}*
💳 Método: Cartão

📦 *PRODUTOS:*
${generateProductSummary()}

💳 *INFORMAÇÕES IMPORTANTES:*
🔵 PIX disponível: mardecoresmakeup@gmail.com
💵 Também aceitamos dinheiro e cartão
🌐 Consulte nosso catálogo no site mardecoresmakeup.com.br e siga nosso Instagram para nossas dicas de produtos!

✨ Obrigado pela confiança!

💙 _Mar de Cores - Realizando seus sonhos!_ 💄`,

    credit_sale: `📋 *CREDIÁRIO APROVADO - MAR DE CORES* 📋

Olá, ${customer?.name || order.customerName || 'Cliente'}! 

🎉 Parabéns! Seu crediário foi aprovado com sucesso.

💳 *DETALHES DO CREDIÁRIO:*
📋 Pedido: *${formatOrderNumber(order)}*
📅 Data: ${formatDate(order.createdAt || new Date())}
💰 Valor total: *${formatCurrency(order.total || 0)}*
🔄 Forma: Crediário

📦 *PRODUTOS ADQUIRIDOS:*
${generateDetailedProductSummary()}

💳 *INFORMAÇÕES DE PAGAMENTO:*
🔵 PIX disponível: ${PIX_EMAIL}
💵 Também aceitamos dinheiro e cartão
📅 Próximos vencimentos serão informados

🏪 *Visite nossa loja para mais detalhes sobre as parcelas*

🌐 Consulte nosso catálogo no site mardecoresmakeup.com.br e siga nosso Instagram para nossas dicas de produtos!

✨ Obrigado pela confiança!

💙 _Mar de Cores - Realizando seus sonhos!_ 💄`,

    pending_order: `📋 *PEDIDO CRIADO - MAR DE CORES* 📋

Olá, ${customer?.name || order.customerName || 'Cliente'}! 

✅ Seu pedido foi criado com sucesso e está sendo preparado.

🛍️ *DETALHES DO PEDIDO:*
📋 Pedido: *${formatOrderNumber(order)}*
📅 Data: ${formatDate(order.createdAt || new Date())}
💰 Total: *${formatCurrency(order.total || 0)}*
${order.paymentMethod === 'credit' ? '💳 Forma: Crediário' : 
 order.paymentMethod === 'pix' ? '🔵 Método: PIX' :
 order.paymentMethod === 'cartao' || order.paymentMethod === 'card' ? '💳 Método: Cartão' :
 '💵 Método: Dinheiro'}

📦 *PRODUTOS:*
${generateDetailedProductSummary()}

${order.paymentMethod === 'credit' ? 
 `💳 *INFORMAÇÕES IMPORTANTES:*
🔵 PIX disponível: ${PIX_EMAIL}
💵 Também aceitamos dinheiro e cartão
🏪 Aguardamos você na loja para finalizar!
🌐 Consulte nosso catálogo no site mardecoresmakeup.com.br e siga nosso Instagram para nossas dicas de produtos!

✨ Obrigado pela confiança!` :
 `⏳ *PRÓXIMOS PASSOS:*
🏪 Finalize o pagamento na loja
📱 Avisaremos quando estiver pronto
🌐 Consulte nosso catálogo no site mardecoresmakeup.com.br e siga nosso Instagram para nossas dicas de produtos!

✨ Obrigado pela preferência!`}

💙 _Mar de Cores - Realizando seus sonhos!_ 💄`,

    credit_payment: `🎉 *PAGAMENTO CONFIRMADO - MAR DE CORES* 🎉

Olá, ${customer?.name || order.customerName || 'Cliente'}! 

✅ Recebemos seu pagamento! Seu crediário foi quitado com sucesso.

💳 *DETALHES DA QUITAÇÃO:*
📋 Pedido: *${formatOrderNumber(order)}*
📅 Data do pagamento: ${formatDate(new Date())}
💰 Valor quitado: *${formatCurrency(order.total || 0)}*
🔵 Método: PIX

📦 *PRODUTOS QUITADOS:*
${generateDetailedProductSummary()}

🎊 *PARABÉNS!*
Seu crediário está 100% quitado!
Todos os produtos já são seus.

🛍️ *CONTINUE COMPRANDO:*
🔵 PIX: ${PIX_EMAIL}
💵 Dinheiro e cartão na loja
🎁 Descontos especiais para clientes fiéis
🌐 Consulte nosso catálogo no site mardecoresmakeup.com.br e siga nosso Instagram para nossas dicas de produtos!

✨ Obrigado pela confiança e pontualidade!

💙 _Mar de Cores - Realizando seus sonhos!_ 💄`,

    custom: customMessage
  };

  const presetMessages = [
    {
      type: 'cash_sale' as const,
      title: 'Venda Dinheiro',
      description: 'Confirmação de compra à vista',
      icon: '💵',
      color: 'bg-green-100 text-green-800 border-green-200'
    },
    {
      type: 'pix_sale' as const,
      title: 'Venda PIX',
      description: 'Confirmação de compra via PIX',
      icon: '🔵',
      color: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    {
      type: 'card_sale' as const,
      title: 'Venda Cartão',
      description: 'Confirmação de compra no cartão',
      icon: '💳',
      color: 'bg-purple-100 text-purple-800 border-purple-200'
    },
    {
      type: 'credit_sale' as const,
      title: 'Crediário',
      description: 'Aprovação de crediário com PIX',
      icon: '📋',
      color: 'bg-orange-100 text-orange-800 border-orange-200'
    },
    {
      type: 'pending_order' as const,
      title: 'Pedido Criado',
      description: 'Informações após criação',
      icon: '⏳',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    },
    {
      type: 'credit_payment' as const,
      title: 'Quitação',
      description: 'Crediário foi quitado',
      icon: '🎉',
      color: 'bg-pink-100 text-pink-800 border-pink-200'
    },
    {
      type: 'custom' as const,
      title: 'Personalizada',
      description: 'Escreva sua própria mensagem',
      icon: '✏️',
      color: 'bg-gray-100 text-gray-800 border-gray-200'
    }
  ];

  const currentMessage = messageTemplates[messageType];

  const copyMessage = () => {
    navigator.clipboard.writeText(currentMessage);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const openWhatsApp = () => {
    const phoneNumber = customer?.phone || order.customerPhone;
    
    if (!phoneNumber) {
      alert("Cliente não possui telefone cadastrado!");
      return;
    }

    // Remove caracteres não numéricos do telefone
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Adiciona código do país se necessário (55 para Brasil)
    const phoneWithCountryCode = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    // Codifica a mensagem para URL
    const encodedMessage = encodeURIComponent(currentMessage);
    
    // Cria a URL do WhatsApp
    const whatsappUrl = `https://wa.me/${phoneWithCountryCode}?text=${encodedMessage}`;
    
    // Registra o envio
    setMessageSentHistory(prev => [...prev, new Date()]);
    
    // Abre o WhatsApp
    window.open(whatsappUrl, '_blank');
  };

  const customerPhone = customer?.phone || order.customerPhone;
  const customerName = customer?.name || order.customerName || 'Cliente';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="order-whatsapp-dialog-description">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-2xl font-bold text-green-700 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mr-3">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            Enviar Detalhes por WhatsApp
          </DialogTitle>
          <DialogDescription id="order-whatsapp-dialog-description">
            Envie os detalhes do pedido para o cliente via WhatsApp de forma profissional e automática
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Pedido e Cliente */}
          <Card className="border-green-200 bg-gradient-to-r from-green-50 to-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-petrol-700 flex items-center justify-between">
                <div className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Pedido #{formatOrderNumber(order)} - {customerName}
                </div>
                <Badge className="bg-green-100 text-green-800">
                  {order.status === 'completed' ? 'Concluído' : 'Processando'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 font-medium">Cliente</p>
                  <p className="text-lg font-bold text-petrol-700 flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    {customerName}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Telefone</p>
                  <p className="text-lg font-bold text-green-700 flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    {customerPhone || 'Não cadastrado'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Valor Total</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(order.total || 0)}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Pagamento</p>
                  <p className="font-semibold text-petrol-700">
                    {order.paymentMethod === 'credit' ? 'Crediário' :
                     order.paymentMethod === 'pix' ? 'PIX' :
                     order.paymentMethod === 'cartao' || order.paymentMethod === 'card' ? 'Cartão' :
                     'Dinheiro'}
                  </p>
                </div>
              </div>

              {/* Destaque especial para crediário com PIX */}
              {order.paymentMethod === 'credit' && (
                <Alert className="bg-blue-50 border-blue-200">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>PIX para Crediário:</strong> {PIX_EMAIL} - Facilite os pagamentos do cliente!
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {!customerPhone && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Cliente não possui telefone cadastrado. Adicione um telefone para enviar mensagens.
              </AlertDescription>
            </Alert>
          )}

          {/* Histórico de Envios */}
          {messageSentHistory.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-700 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Histórico de Envios ({messageSentHistory.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {messageSentHistory.slice(-3).map((sentDate, index) => (
                    <p key={index} className="text-xs text-blue-600">
                      • Enviado em {formatDateTime(sentDate)}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Seleção de Tipo de Mensagem */}
          <div>
            <Label className="text-base font-medium text-gray-700 mb-3 block">
              Escolha o tipo de mensagem:
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {presetMessages.map((preset) => (
                <Card 
                  key={preset.type}
                  className={`cursor-pointer transition-all duration-200 ${
                    messageType === preset.type 
                      ? 'border-green-400 bg-green-50 shadow-md scale-105' 
                      : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
                  }`}
                  onClick={() => setMessageType(preset.type)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-2">{preset.icon}</div>
                    <h3 className="font-medium text-gray-900 mb-1 text-sm">{preset.title}</h3>
                    <p className="text-xs text-gray-600">{preset.description}</p>
                    {messageType === preset.type && (
                      <Badge className="mt-2 bg-green-100 text-green-800">Selecionado</Badge>
                    )}
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
                className="min-h-[150px] border-green-200 focus:border-green-400"
              />
            </div>
          )}

          {/* Toggle entre Preview e Edição */}
          <div className="flex justify-between items-center">
            <Label className="text-base font-medium text-gray-700">
              Preview da Mensagem:
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              {isPreviewMode ? 'Modo Edição' : 'Modo Preview'}
            </Button>
          </div>

          {/* Preview/Edição da Mensagem */}
          <Card className="border-green-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-green-700">
                {isPreviewMode ? 'Preview da Mensagem' : 'Editar Mensagem'}
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={copyMessage}
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                <Copy className="h-4 w-4 mr-2" />
                {isCopied ? 'Copiado!' : 'Copiar'}
              </Button>
            </CardHeader>
            <CardContent>
              {isPreviewMode ? (
                <div className="bg-gray-50 p-4 rounded-lg border min-h-[200px]">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                    {currentMessage}
                  </pre>
                </div>
              ) : (
                <Textarea
                  value={messageType === 'custom' ? customMessage : messageTemplates[messageType]}
                  onChange={(e) => {
                    if (messageType === 'custom') {
                      setCustomMessage(e.target.value);
                    } else {
                      // Para templates pré-definidos, podemos criar uma versão editável
                      messageTemplates[messageType] = e.target.value;
                    }
                  }}
                  className="min-h-[200px] border-green-200 focus:border-green-400 font-mono text-sm"
                />
              )}
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
                {isCopied ? 'Copiado!' : 'Copiar Mensagem'}
              </Button>
              <Button
                onClick={openWhatsApp}
                disabled={!customerPhone || !currentMessage.trim()}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}