import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminSidebar from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useToast } from "@/hooks/use-toast";
import { useOrderIntegration } from "@/hooks/use-order-integration";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewOrderModal } from "@/components/ui/new-order-modal";
import { OrderDetailsModal } from "@/components/ui/order-details-modal";
import { OrderWhatsAppDialog } from "@/components/ui/order-whatsapp-dialog";
import { AddPhoneDialog } from "@/components/ui/add-phone-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  ShoppingCart,
  CreditCard,
  Search,
  Filter,
  Package,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  DollarSign,
  Trash2,
  Plus,
  Phone,
  Mail,
  FileText,
  MessageCircle,
  Loader2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product, Customer, Order, OrderItem } from "@shared/schema";

// Tipo estendido para pedidos com dados do cliente
type OrderWithCustomer = Order & {
  customer?: Customer;
  customerName?: string | null;
  customerPhone?: string | null;
  items?: OrderItem[];
  dueDate?: string | Date | null;
};

export default function AdminOrders() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<'cash' | 'credit'>('cash');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Estado para o modal do WhatsApp
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const [selectedOrderForWhatsApp, setSelectedOrderForWhatsApp] = useState<OrderWithCustomer | null>(null);
  
  // Estado para o modal de adicionar telefone
  const [isAddPhoneDialogOpen, setIsAddPhoneDialogOpen] = useState(false);
  const [selectedOrderForPhone, setSelectedOrderForPhone] = useState<OrderWithCustomer | null>(null);
  const { isAuthenticated } = useAdminAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    confirmOrder,
    completeOrder,
    cancelOrder,
    isConfirming,
    isCompleting,
    isCancelling,
    forceSyncAll
  } = useOrderIntegration();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, setLocation]);

  // Queries
  const { data: rawOrders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
    enabled: isAuthenticated,
  });

  const { data: customers, isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/admin/customers"],
    enabled: isAuthenticated,
  });

  // Mutations para ações dos pedidos - SUBSTITUÍDAS pelo hook de integração
  // Agora usamos confirmOrder, completeOrder e cancelOrder do useOrderIntegration()

  // Mutation para deletar pedido
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Erro ao deletar pedido');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pedido deletado com sucesso!",
        description: "O pedido foi removido permanentemente do sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao deletar pedido",
        description: "Não foi possível deletar o pedido. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteOrder = async (orderId: string) => {
    setIsDeleting(true);
    try {
      await deleteOrderMutation.mutateAsync(orderId);
    } finally {
      setIsDeleting(false);
    }
  };

  // Combinar dados de pedidos com clientes
  const orders = (rawOrders?.map(order => {
    const customer = customers?.find((c: Customer) => c.id === order.customerId);
    return {
      ...order,
      customer,
      // Priorizar customerName do pedido, depois o nome do customer
      customerName: order.customerName || customer?.name || null,
      customerPhone: order.customerPhone || customer?.phone || null,
      dueDate: order.deliveryDate, // Usar deliveryDate como dueDate
    } as OrderWithCustomer;
  }) || []) as OrderWithCustomer[];

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
  const formatOrderNumber = (order: OrderWithCustomer) => {
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

  // Cálculos básicos para contadores
  const allOrders = orders || [];
  
  // Pendentes - TODOS os pedidos
  const pendingOrders = allOrders.filter(order => order.status === 'pending').length;

  const openNewOrderModal = (type: 'cash' | 'credit') => {
    setOrderType(type);
    setIsNewOrderModalOpen(true);
  };

  const openOrderDetails = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsOrderDetailsModalOpen(true);
  };

  const closeOrderDetails = () => {
    setSelectedOrderId(null);
    setIsOrderDetailsModalOpen(false);
  };

  // Função para abrir o modal do WhatsApp
  const openWhatsAppDialog = (order: OrderWithCustomer) => {
    const customerPhone = order.customerPhone || order.customer?.phone;
    
    if (!customerPhone) {
      // Se não tem telefone, abrir modal para adicionar
      setSelectedOrderForPhone(order);
      setIsAddPhoneDialogOpen(true);
    } else {
      // Buscar os itens do pedido antes de abrir o WhatsApp
      fetch(`/api/admin/orders/${order.id}/items`)
        .then(res => res.json())
        .then(items => {
          const orderWithItems = {
            ...order,
            items: items
          };
          setSelectedOrderForWhatsApp(orderWithItems);
          setIsWhatsAppDialogOpen(true);
        })
        .catch(err => {
          console.error('Erro ao buscar itens:', err);
          // Abrir mesmo sem itens
          setSelectedOrderForWhatsApp(order);
          setIsWhatsAppDialogOpen(true);
        });
    }
  };
  
  // Função chamada após adicionar telefone
  const handlePhoneAdded = (phone: string) => {
    if (selectedOrderForPhone) {
      // Atualizar o pedido com o novo telefone
      const updatedOrder = {
        ...selectedOrderForPhone,
        customerPhone: phone
      };
      
      // Buscar os itens do pedido antes de abrir o WhatsApp
      fetch(`/api/admin/orders/${updatedOrder.id}/items`)
        .then(res => res.json())
        .then(items => {
          const orderWithItems = {
            ...updatedOrder,
            items: items
          };
          setSelectedOrderForWhatsApp(orderWithItems);
          setIsWhatsAppDialogOpen(true);
        })
        .catch(err => {
          console.error('Erro ao buscar itens após telefone:', err);
          // Abrir mesmo sem itens
          setSelectedOrderForWhatsApp(updatedOrder);
          setIsWhatsAppDialogOpen(true);
        });
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-64 overflow-auto bg-white">
        <div className="p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8 flex justify-between items-start">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-petrol-700 flex items-center">
                <ShoppingCart className="h-10 w-10 mr-3 text-petrol-600" />
                Gestão de Pedidos
              </h1>
              <p className="text-lg text-petrol-600">
                Sistema completo de vendas à vista e crediário
              </p>
            </div>
            <div className="flex space-x-3">
              <Button 
                onClick={() => setLocation("/admin/relatorios")}
                variant="outline"
                className="border-petrol-300 text-petrol-700 hover:bg-petrol-50 flex items-center space-x-2"
              >
                <FileText className="h-4 w-4" />
                <span>Ver Relatórios</span>
              </Button>
            </div>
          </div>

          {/* Botões Principais */}
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={() => openNewOrderModal('cash')}
                className="h-20 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center space-x-3">
                  <DollarSign className="h-8 w-8" />
                  <div className="text-left">
                    <div className="text-xl">Novo Pedido à Vista</div>
                    <div className="text-sm opacity-90">Pagamento em dinheiro, cartão ou PIX</div>
                  </div>
                </div>
              </Button>

              <Button 
                onClick={() => openNewOrderModal('credit')}
                className="h-20 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-8 w-8" />
                  <div className="text-left">
                    <div className="text-xl">Novo Pedido Crediário</div>
                    <div className="text-sm opacity-90">Adicionar à conta ou criar nova</div>
                  </div>
                </div>
              </Button>
            </div>
          </div>

          {/* Sistema de Abas */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dashboard" className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4" />
                <span>Pedidos à Vista</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4" />
                <span>Pedidos Crediário</span>
              </TabsTrigger>
            </TabsList>

            {/* Aba de Pedidos à Vista */}
            <TabsContent value="dashboard" className="space-y-6">
              {/* Filtros */}
              <Card className="shadow-sm border-petrol-200">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Buscar por número do pedido, cliente..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 border-petrol-200 focus:border-petrol-400"
                        />
                      </div>
                    </div>
                    <div className="sm:w-48">
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="border-petrol-200 focus:border-petrol-400">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os Status</SelectItem>
                          <SelectItem value="pending">Pendentes</SelectItem>
                          <SelectItem value="confirmed">Confirmados</SelectItem>
                          <SelectItem value="completed">Concluídos</SelectItem>
                          <SelectItem value="cancelled">Cancelados</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lista de Pedidos à Vista */}
              <Card className="shadow-lg border-petrol-100">
                <CardHeader>
                  <CardTitle className="text-petrol-700 flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Pedidos à Vista ({orders?.filter(order => order.paymentMethod !== 'credit')?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ordersLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                          <Skeleton className="w-12 h-12 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-1/4" />
                          </div>
                          <Skeleton className="w-20 h-8" />
                          <Skeleton className="w-24 h-8" />
                        </div>
                      ))}
                    </div>
                  ) : !orders || orders.length === 0 ? (
                    <div className="text-center py-16">
                      <ShoppingCart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-xl font-medium text-gray-600 mb-2">
                        Nenhum pedido encontrado
                      </h3>
                      <p className="text-gray-500 mb-6">
                        Comece criando seu primeiro pedido usando os botões acima
                      </p>
                      <div className="flex justify-center space-x-3">
                        <Button
                          onClick={() => openNewOrderModal('cash')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Pedido à Vista
                        </Button>
                        <Button
                          onClick={() => openNewOrderModal('credit')}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pedido Crediário
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders
                        .filter(order => {
                          // Filtrar apenas pedidos à vista (não crediário)
                          const isNotCredit = order.paymentMethod !== 'credit';
                          const matchesSearch = !searchTerm || 
                            order.id?.toString().includes(searchTerm) ||
                            order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            order.customerPhone?.includes(searchTerm);
                          const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
                          return isNotCredit && matchesSearch && matchesStatus;
                        })
                        .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
                        .map((order) => (
                          <div key={order.id} className="border border-petrol-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-petrol-100 rounded-full flex items-center justify-center">
                                  {order.paymentMethod === 'credit' ? (
                                    <CreditCard className="h-6 w-6 text-petrol-600" />
                                  ) : (
                                    <DollarSign className="h-6 w-6 text-green-600" />
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-lg text-petrol-700">
                                    Pedido #{formatOrderNumber(order)}
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    {formatDateTime(order.createdAt || '')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                {getStatusBadge(order.status || 'pending')}
                                {order.paymentMethod === 'credit' && getPaymentStatusBadge(order.paymentStatus || 'pending')}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-gray-500 mb-1">Cliente</p>
                                <p className="font-medium text-petrol-700">{order.customerName || 'N/A'}</p>
                                {order.customerPhone && (
                                  <p className="text-sm text-gray-600 flex items-center">
                                    <Phone className="h-3 w-3 mr-1" />
                                    {order.customerPhone}
                                  </p>
                                )}
                              </div>
                              
                              <div>
                                <p className="text-sm text-gray-500 mb-1">Pagamento</p>
                                <p className="font-medium text-petrol-700">
                                  {order.paymentMethod === 'credit' ? 'Crediário' :
                                   order.paymentMethod === 'pix' ? 'PIX' :
                                   order.paymentMethod === 'cartao' ? 'Cartão' :
                                   order.paymentMethod === 'dinheiro' ? 'Dinheiro' :
                                   order.paymentMethod === 'cash' ? 'Dinheiro' :
                                   order.paymentMethod || 'N/A'}
                                </p>
                                {order.paymentMethod === 'credit' && order.dueDate && (
                                  <p className="text-sm text-gray-600">
                                    Vence: {formatDate(order.dueDate)}
                                  </p>
                                )}
                              </div>
                              
                              <div>
                                <p className="text-sm text-gray-500 mb-1">Total</p>
                                <p className="font-bold text-xl text-petrol-700">
                                  {formatCurrency(order.total || 0)}
                                </p>
                                {order.items && (
                                  <p className="text-sm text-gray-600">
                                    {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-petrol-300 text-petrol-700 hover:bg-petrol-50"
                                  onClick={() => openOrderDetails(order.id)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver Detalhes
                                </Button>
                              
                              {/* Botão WhatsApp - sempre disponível */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                                onClick={() => openWhatsAppDialog(order)}
                              >
                                <MessageCircle className="h-4 w-4 mr-1" />
                                {order.customerPhone || order.customer?.phone ? 'WhatsApp' : 'Adicionar Tel + WhatsApp'}
                              </Button>
                              
                              {order.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => {
                                      completeOrder(order.id);
                                      // Após concluir, mostrar automaticamente o modal do WhatsApp
                                      setTimeout(() => {
                                        openWhatsAppDialog(order);
                                      }, 1500);
                                    }}
                                    disabled={isCompleting}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    {isCompleting ? 'Concluindo...' : 'Concluir'}
                                  </Button>
                                  
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-red-300 text-red-700 hover:bg-red-50"
                                    onClick={() => cancelOrder({ orderId: order.id })}
                                    disabled={isCancelling}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    {isCancelling ? 'Cancelando...' : 'Cancelar Venda'}
                                  </Button>
                                </>
                              )}
                              
                              {/* Botão de Delete com Confirmação */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-red-300 text-red-700 hover:bg-red-50"
                                    disabled={deleteOrderMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    {deleteOrderMutation.isPending ? 'Deletando...' : 'Deletar'}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Exclusão do Pedido</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja deletar o pedido #{formatOrderNumber(order)}?
                                      <br />
                                      <strong>Esta ação não pode ser desfeita.</strong>
                                      <br /><br />
                                      <span className="text-sm text-gray-600">
                                        Cliente: {order.customerName || 'N/A'}
                                        <br />
                                        Total: {formatCurrency(order.total || 0)}
                                      </span>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteOrder(order.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Sim, Deletar Pedido
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba de Pedidos Crediário */}
            <TabsContent value="history" className="space-y-6">
              {/* Filtros */}
              <Card className="shadow-sm border-blue-200">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Buscar por número do pedido, cliente..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 border-blue-200 focus:border-blue-400"
                        />
                      </div>
                    </div>
                    <div className="sm:w-48">
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="border-blue-200 focus:border-blue-400">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os Status</SelectItem>
                          <SelectItem value="pending">Pendentes</SelectItem>
                          <SelectItem value="confirmed">Confirmados</SelectItem>
                          <SelectItem value="completed">Concluídos</SelectItem>
                          <SelectItem value="cancelled">Cancelados</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lista de Pedidos Crediário */}
              <Card className="shadow-lg border-blue-100">
                <CardHeader>
                  <CardTitle className="text-blue-700 flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Pedidos Crediário ({orders?.filter(order => order.paymentMethod === 'credit')?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ordersLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                          <Skeleton className="w-12 h-12 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-1/4" />
                          </div>
                          <Skeleton className="w-20 h-8" />
                          <Skeleton className="w-24 h-8" />
                        </div>
                      ))}
                    </div>
                  ) : !orders?.filter(order => order.paymentMethod === 'credit') || orders.filter(order => order.paymentMethod === 'credit').length === 0 ? (
                    <div className="text-center py-16">
                      <CreditCard className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-xl font-medium text-gray-600 mb-2">
                        Nenhum pedido de crediário encontrado
                      </h3>
                      <p className="text-gray-500 mb-6">
                        Quando houver pedidos de crediário, eles aparecerão aqui
                      </p>
                      <Button
                        onClick={() => openNewOrderModal('credit')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Novo Pedido Crediário
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders
                        .filter(order => {
                          // Filtrar apenas pedidos de crediário
                          const isCredit = order.paymentMethod === 'credit';
                          const matchesSearch = !searchTerm || 
                            order.id?.toString().includes(searchTerm) ||
                            order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            order.customerPhone?.includes(searchTerm);
                          const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
                          return isCredit && matchesSearch && matchesStatus;
                        })
                        .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
                        .map((order) => (
                          <div key={order.id} className="border border-blue-200 rounded-lg p-6 hover:shadow-md transition-shadow bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                  <CreditCard className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-lg text-blue-700">
                                    Pedido #{formatOrderNumber(order)}
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    {formatDateTime(order.createdAt || '')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                {getStatusBadge(order.status || 'pending')}
                                {getPaymentStatusBadge(order.paymentStatus || 'pending')}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-gray-500 mb-1">Cliente</p>
                                <p className="font-medium text-blue-700">{order.customerName || 'N/A'}</p>
                                {order.customerPhone && (
                                  <p className="text-sm text-gray-600 flex items-center">
                                    <Phone className="h-3 w-3 mr-1" />
                                    {order.customerPhone}
                                  </p>
                                )}
                              </div>
                              
                              <div>
                                <p className="text-sm text-gray-500 mb-1">Pagamento</p>
                                <p className="font-medium text-blue-700">Crediário</p>
                                {order.dueDate && (
                                  <p className="text-sm text-gray-600">
                                    Vence: {formatDate(order.dueDate)}
                                  </p>
                                )}
                              </div>
                              
                              <div>
                                <p className="text-sm text-gray-500 mb-1">Total</p>
                                <p className="font-bold text-xl text-blue-700">
                                  {formatCurrency(order.total || 0)}
                                </p>
                                {order.items && (
                                  <p className="text-sm text-gray-600">
                                    {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                onClick={() => openOrderDetails(order.id)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver Detalhes
                              </Button>
                            
                              {/* Botão WhatsApp - sempre disponível */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                                onClick={() => openWhatsAppDialog(order)}
                              >
                                <MessageCircle className="h-4 w-4 mr-1" />
                                {order.customerPhone || order.customer?.phone ? 'WhatsApp' : 'Adicionar Tel + WhatsApp'}
                              </Button>
                              
                              {order.status === 'pending' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-red-300 text-red-700 hover:bg-red-50"
                                    onClick={() => cancelOrder({ orderId: order.id })}
                                    disabled={isCancelling}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    {isCancelling ? 'Cancelando...' : 'Cancelar Crediário'}
                                  </Button>
                                </>
                              )}
                              
                              {/* Botão de Delete com Confirmação */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-red-300 text-red-700 hover:bg-red-50"
                                    disabled={deleteOrderMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    {deleteOrderMutation.isPending ? 'Deletando...' : 'Deletar'}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Exclusão do Pedido de Crediário</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja deletar o pedido de crediário #{formatOrderNumber(order)}?
                                      <br />
                                      <strong>Esta ação não pode ser desfeita.</strong>
                                      <br /><br />
                                      <span className="text-sm text-gray-600">
                                        Cliente: {order.customerName || 'N/A'}
                                        <br />
                                        Total: {formatCurrency(order.total || 0)}
                                      </span>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteOrder(order.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Sim, Deletar Pedido
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modal de Detalhes do Pedido */}
      <OrderDetailsModal
        isOpen={isOrderDetailsModalOpen}
        onClose={closeOrderDetails}
        orderId={selectedOrderId}
      />

      {/* Modal de Novo Pedido */}
      <NewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        orderType={orderType}
      />
      
      {/* Modal do WhatsApp */}
      {selectedOrderForWhatsApp && (
        <OrderWhatsAppDialog
          isOpen={isWhatsAppDialogOpen}
          onOpenChange={setIsWhatsAppDialogOpen}
          order={selectedOrderForWhatsApp}
          customer={selectedOrderForWhatsApp.customer}
          orderItems={selectedOrderForWhatsApp.items}
        />
      )}
      
      {/* Modal para Adicionar Telefone */}
      {selectedOrderForPhone && (
        <AddPhoneDialog
          isOpen={isAddPhoneDialogOpen}
          onOpenChange={setIsAddPhoneDialogOpen}
          order={selectedOrderForPhone}
          customer={selectedOrderForPhone.customer}
          onPhoneAdded={handlePhoneAdded}
        />
      )}
    </div>
  );
}