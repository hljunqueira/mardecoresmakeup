import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useOrderIntegration } from "@/hooks/use-order-integration";
import { OrderWhatsAppDialog } from "@/components/ui/order-whatsapp-dialog";
import { AddPhoneDialog } from "@/components/ui/add-phone-dialog";
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Package, 
  DollarSign, 
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  MessageCircle
} from "lucide-react";
import type { Order, OrderItem, Customer } from "@shared/schema";

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
}

type OrderWithDetails = Order & {
  customer?: Customer;
  items?: OrderItem[];
};

// Tipo estendido para itens com dados do produto
type OrderItemWithProduct = OrderItem & {
  productName?: string;
  product?: {
    name: string;
    images?: string[];
  };
};

export function OrderDetailsModal({ isOpen, onClose, orderId }: OrderDetailsModalProps) {
  const { toast } = useToast();
  const {
    completeOrder,
    cancelOrder,
    isCompleting,
    isCancelling,
  } = useOrderIntegration();
  
  // Estado para controlar o modal do WhatsApp
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  
  // Estado para o modal de adicionar telefone
  const [isAddPhoneDialogOpen, setIsAddPhoneDialogOpen] = useState(false);
  
  // Estado para os itens do pedido para WhatsApp
  const [whatsAppOrderItems, setWhatsAppOrderItems] = useState<OrderItemWithProduct[]>([]);
  
  // Buscar dados do pedido
  const { data: order, isLoading } = useQuery<OrderWithDetails>({
    queryKey: ["/api/admin/orders", orderId],
    enabled: isOpen && !!orderId,
  });
  
  // Função para abrir WhatsApp (com ou sem telefone)
  const openWhatsAppDialog = () => {
    const customerPhone = customer?.phone || order?.customerPhone;
    
    if (!customerPhone) {
      // Se não tem telefone, abrir modal para adicionar
      setIsAddPhoneDialogOpen(true);
    } else {
      // Buscar os itens do pedido antes de abrir o WhatsApp
      if (order?.id) {
        fetch(`/api/admin/orders/${order.id}/items`)
          .then(res => res.json())
          .then(items => {
            const orderWithItems = {
              ...order,
              items: items
            };
            // Atualizar estado dos itens para WhatsApp
            setWhatsAppOrderItems(items);
            setIsWhatsAppDialogOpen(true);
          })
          .catch(err => {
            console.error('Erro ao buscar itens:', err);
            // Abrir mesmo sem itens
            setIsWhatsAppDialogOpen(true);
          });
      } else {
        setIsWhatsAppDialogOpen(true);
      }
    }
  };
  
  // Função chamada após adicionar telefone
  const handlePhoneAdded = (phone: string) => {
    // Abrir modal do WhatsApp após adicionar telefone
    if (order?.id) {
      fetch(`/api/admin/orders/${order.id}/items`)
        .then(res => res.json())
        .then(items => {
          // Atualizar estado dos itens para WhatsApp
          setWhatsAppOrderItems(items);
          setIsWhatsAppDialogOpen(true);
        })
        .catch(err => {
          console.error('Erro ao buscar itens após telefone:', err);
          setIsWhatsAppDialogOpen(true);
        });
    } else {
      setIsWhatsAppDialogOpen(true);
    }
  };

  // Buscar itens do pedido
  const { data: orderItems } = useQuery<OrderItemWithProduct[]>({
    queryKey: ["/api/admin/orders", orderId, "items"],
    enabled: isOpen && !!orderId,
  });

  // Buscar dados do cliente
  const { data: customer } = useQuery<Customer>({
    queryKey: ["/api/admin/customers", order?.customerId],
    enabled: isOpen && !!order?.customerId,
  });

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pendente</Badge>;
      case 'confirmed':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Confirmado</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Concluído</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'pending':
        return <Badge variant="outline" className="text-orange-600 border-orange-300">Pendente</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Pago</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Vencido</Badge>;
      default:
        return <Badge variant="secondary">{paymentStatus}</Badge>;
    }
  };

  if (!isOpen || !orderId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-petrol-700 flex items-center">
            <Package className="h-6 w-6 mr-2" />
            Detalhes do Pedido {order?.orderNumber || orderId}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-lg text-gray-500">Carregando detalhes do pedido...</div>
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* Cabeçalho do Pedido */}
            <Card className="border-petrol-200">
              <CardHeader className="bg-gradient-to-r from-petrol-50 to-blue-50">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl text-petrol-700">
                      Pedido #{formatOrderNumber(order)}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Criado em {formatDateTime(order.createdAt || '')}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {getStatusBadge(order.status || 'pending')}
                    {order.paymentMethod === 'credit' && getPaymentStatusBadge(order.paymentStatus || 'pending')}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total do Pedido</p>
                      <p className="text-xl font-bold text-petrol-700">
                        {formatCurrency(order.total || 0)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Pagamento</p>
                      <p className="font-semibold text-petrol-700">
                        {order.paymentMethod === 'credit' ? 'Crediário' :
                         order.paymentMethod === 'pix' ? 'PIX' :
                         order.paymentMethod === 'cartao' ? 'Cartão' :
                         order.paymentMethod === 'dinheiro' ? 'Dinheiro' :
                         order.paymentMethod === 'cash' ? 'Dinheiro' :
                         order.paymentMethod || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Clock className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Última Atualização</p>
                      <p className="font-semibold text-petrol-700">
                        {formatDateTime(order.updatedAt || order.createdAt || '')}
                      </p>
                    </div>
                  </div>
                </div>

                {order.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <FileText className="h-4 w-4 text-gray-500 mt-1" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Observações:</p>
                        <p className="text-sm text-gray-600">{order.notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dados do Cliente */}
            <Card className="border-petrol-200">
              <CardHeader>
                <CardTitle className="text-lg text-petrol-700 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Informações do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {customer ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-semibold text-petrol-700">{customer.name}</span>
                      </div>
                      
                      {customer.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">{customer.email}</span>
                        </div>
                      )}
                      
                      {customer.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">{customer.phone}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          Cliente desde {formatDate(customer.createdAt)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {customer.totalOrders || 0} pedidos realizados
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          Total gasto: {formatCurrency(customer.totalSpent || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <User className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Dados do cliente não encontrados</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Itens do Pedido */}
            <Card className="border-petrol-200">
              <CardHeader>
                <CardTitle className="text-lg text-petrol-700 flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Itens do Pedido ({orderItems?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orderItems && orderItems.length > 0 ? (
                  <div className="space-y-4">
                    {orderItems.map((item, index) => (
                      <div key={item.id || index} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex-1">
                          <h4 className="font-semibold text-petrol-700">
                            {item.productName || `Produto ID: ${item.productId}`}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Quantidade: {item.quantity} × {formatCurrency(item.unitPrice || 0)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-petrol-700">
                            {formatCurrency(item.totalPrice || 0)}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    <Separator />
                    
                    {/* Resumo Financeiro */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-semibold">
                          {formatCurrency(order.subtotal || 0)}
                        </span>
                      </div>
                      
                      {order.discountAmount && parseFloat(order.discountAmount.toString()) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Desconto:</span>
                          <span className="font-semibold text-green-600">
                            -{formatCurrency(order.discountAmount)}
                          </span>
                        </div>
                      )}
                      
                      {order.shippingCost && parseFloat(order.shippingCost.toString()) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Frete:</span>
                          <span className="font-semibold">
                            {formatCurrency(order.shippingCost)}
                          </span>
                        </div>
                      )}
                      
                      <Separator />
                      
                      <div className="flex justify-between text-lg font-bold">
                        <span className="text-petrol-700">Total:</span>
                        <span className="text-petrol-700">
                          {formatCurrency(order.total || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Nenhum item encontrado neste pedido</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ações */}
            <div className="flex justify-between space-x-3 pt-4">
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Fechar
                </Button>
                
                {/* Botão WhatsApp - sempre disponível */}
                <Button
                  variant="outline"
                  onClick={openWhatsAppDialog}
                  className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {(customer?.phone || order?.customerPhone) ? 'Enviar WhatsApp' : 'Adicionar Tel + WhatsApp'}
                </Button>
              </div>
              
              <div className="flex space-x-3">
                {order.status === 'pending' && (
                  <>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        completeOrder(order.id);
                        // Após concluir, mostrar automaticamente o modal do WhatsApp
                        setTimeout(() => {
                          openWhatsAppDialog();
                        }, 1000);
                        onClose();
                      }}
                      disabled={isCompleting}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {isCompleting ? 'Concluindo...' : 'Concluir Pedido'}
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                      onClick={() => {
                        cancelOrder({ orderId: order.id });
                        onClose();
                      }}
                      disabled={isCancelling}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {isCancelling ? 'Cancelando...' : 'Cancelar Venda'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>Pedido não encontrado</p>
          </div>
        )}
      </DialogContent>
      
      {/* Modal do WhatsApp */}
      {order && (
        <OrderWhatsAppDialog
          isOpen={isWhatsAppDialogOpen}
          onOpenChange={setIsWhatsAppDialogOpen}
          order={order}
          customer={customer}
          orderItems={whatsAppOrderItems.length > 0 ? whatsAppOrderItems : orderItems}
        />
      )}
      
      {/* Modal para Adicionar Telefone */}
      {order && (
        <AddPhoneDialog
          isOpen={isAddPhoneDialogOpen}
          onOpenChange={setIsAddPhoneDialogOpen}
          order={order}
          customer={customer}
          onPhoneAdded={handlePhoneAdded}
        />
      )}
    </Dialog>
  );
}