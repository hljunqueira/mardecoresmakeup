import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminSidebar from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderDetailsModal } from "@/components/ui/order-details-modal";
import { OrderWhatsAppDialog } from "@/components/ui/order-whatsapp-dialog";
import OrderPaymentDialog from "@/components/ui/order-payment-dialog";
import CustomerModal from "@/components/ui/customer-modal";
import TransferOrderModal from "@/components/ui/transfer-order-modal";
import { 
  Search,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  DollarSign,
  Plus,
  CreditCard,
  Users,
  ShoppingCart,
  FileText,
  Receipt,
  MessageCircle,
  MoreHorizontal,
  CreditCardIcon,
  BanknoteIcon,
  HistoryIcon,
  UserPlus,
  Edit,
  Trash2,
  ArrowRightLeft
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Product, Customer, Order, OrderItem, CreditAccount } from "@shared/schema";

export default function AdminCrediario() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("credit-orders");
  
  // Estados para os modais
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Estados para o modal de pagamento
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<Customer | null>(null);
  const [paymentType, setPaymentType] = useState<'partial' | 'total'>('partial');
  
  // Estado para o modal de novo cliente
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerModalMode, setCustomerModalMode] = useState<'create' | 'edit'>('create');
  
  // Estado para confirmação de exclusão
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Estado para transferência de pedidos
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [orderToTransfer, setOrderToTransfer] = useState<Order | null>(null);
  const [customerForTransfer, setCustomerForTransfer] = useState<Customer | null>(null);
  
  const { isAuthenticated } = useAdminAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, setLocation]);

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
    enabled: isAuthenticated,
  });

  // Queries para clientes e pedidos de crediário
  const { data: customers, isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/admin/customers"],
    enabled: isAuthenticated,
  });

  // Query para buscar contas de crediário
  const { data: creditAccounts, isLoading: creditAccountsLoading } = useQuery<CreditAccount[]>({
    queryKey: ["/api/admin/credit-accounts"],
    enabled: isAuthenticated,
  });

  // Query para buscar pedidos de crediário
  const { data: allOrders, isLoading: creditOrdersLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
    enabled: isAuthenticated,
  });

  const creditOrders = allOrders?.filter(order => order.paymentMethod === 'credit') || [];

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
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Concluído</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  // Filtrar pedidos de crediário
  const filteredCreditOrders = creditOrders?.filter(order => {
    const customer = customers?.find(c => c.id === order.customerId);
    const matchesSearch = customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  // Estatísticas baseadas em pedidos de crediário
  const totalCustomers = customers?.length || 0;
  const totalCreditOrders = creditOrders?.length || 0;
  const pendingCreditOrders = creditOrders?.filter(order => order.status === 'pending').length || 0;
  const completedCreditOrders = creditOrders?.filter(order => order.status === 'completed').length || 0;
  
  const totalCreditOrderValue = creditOrders?.reduce((sum, order) => {
    return sum + parseFloat(order.total?.toString() || "0");
  }, 0) || 0;
  
  const pendingCreditOrderValue = creditOrders?.filter(order => order.status === 'pending').reduce((sum, order) => {
    return sum + parseFloat(order.total?.toString() || "0");
  }, 0) || 0;
  
  const paidCreditOrderValue = creditOrders?.filter(order => order.status === 'completed').reduce((sum, order) => {
    return sum + parseFloat(order.total?.toString() || "0");
  }, 0) || 0;

  // Funções para abrir os modais de pagamento
  const openPartialPaymentModal = (order: Order) => {
    const customer = customers?.find(c => c.id === order.customerId);
    if (!customer) return;
    
    setSelectedOrderForPayment(order);
    setSelectedCustomerForPayment(customer);
    setPaymentType('partial');
    setIsPaymentModalOpen(true);
  };

  const openTotalPaymentModal = (order: Order) => {
    const customer = customers?.find(c => c.id === order.customerId);
    if (!customer) return;
    
    setSelectedOrderForPayment(order);
    setSelectedCustomerForPayment(customer);
    setPaymentType('total');
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedOrderForPayment(null);
    setSelectedCustomerForPayment(null);
  };
  
  // Função para lidar com a criação de cliente
  const handleCustomerCreated = (newCustomer: Customer) => {
    setIsCustomerModalOpen(false);
    // Invalidar queries para atualizar a lista
    queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
  };
  
  // Função para lidar com a atualização de cliente
  const handleCustomerUpdated = (updatedCustomer: Customer) => {
    setIsCustomerModalOpen(false);
    setEditingCustomer(null);
    // Invalidar queries para atualizar a lista
    queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
  };
  
  // Função para abrir modal de novo cliente
  const openNewCustomerModal = () => {
    setCustomerModalMode('create');
    setEditingCustomer(null);
    setIsCustomerModalOpen(true);
  };
  
  // Função para abrir modal de edição de cliente
  const openEditCustomerModal = (customer: Customer) => {
    setCustomerModalMode('edit');
    setEditingCustomer(customer);
    setIsCustomerModalOpen(true);
  };
  
  // Função para abrir dialog de confirmação de exclusão
  const openDeleteConfirmation = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteDialogOpen(true);
  };
  
  // Função para confirmar exclusão de cliente
  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    
    try {
      const response = await fetch(`/api/admin/customers/${customerToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Erro ao excluir cliente');
      }
      
      toast({
        title: "Cliente excluído com sucesso!",
        description: `${customerToDelete.name} foi removido do sistema.`,
      });
      
      // Invalidar queries para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-accounts"] });
      
    } catch (error) {
      toast({
        title: "Erro ao excluir cliente",
        description: "Tente novamente ou contate o suporte.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setCustomerToDelete(null);
    }
  };
  
  // Função para abrir modal de transferência
  const openTransferModal = (order: Order) => {
    const customer = customers?.find(c => c.id === order.customerId);
    if (!customer) return;
    
    setOrderToTransfer(order);
    setCustomerForTransfer(customer);
    setIsTransferModalOpen(true);
  };
  
  // Função para lidar com transferência concluída
  const handleTransferCompleted = () => {
    setIsTransferModalOpen(false);
    setOrderToTransfer(null);
    setCustomerForTransfer(null);
  };

  // Funções para abrir os modais
  const openDetailsModal = (order: Order) => {
    setSelectedOrderId(order.id);
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const openWhatsAppModal = (order: Order) => {
    setSelectedOrder(order);
    setIsWhatsAppModalOpen(true);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedOrderId(null);
    setSelectedOrder(null);
  };

  const closeWhatsAppModal = () => {
    setIsWhatsAppModalOpen(false);
    setSelectedOrder(null);
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
                <CreditCard className="h-10 w-10 mr-3 text-petrol-600" />
                Gestão de Crediário
              </h1>
              <p className="text-lg text-petrol-600">
                Gerencie pedidos de crediário e clientes
              </p>
            </div>
            <div className="flex space-x-3">
              <Button 
                onClick={() => setLocation("/admin/pedidos")}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50 flex items-center space-x-2"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Novo Pedido Crediário</span>
              </Button>
              <Button 
                onClick={() => setLocation("/admin/relatorios")}
                variant="outline"
                className="border-petrol-300 text-petrol-700 hover:bg-petrol-50 flex items-center space-x-2"
              >
                <FileText className="h-4 w-4" />
                <span>Relatórios</span>
              </Button>
            </div>
          </div>

          {/* Dashboard Principal - Métricas de Crediário */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Valor a Receber */}
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium mb-4">Valor a Receber</p>
                    <p className="text-2xl font-bold text-white mb-2">{formatCurrency(pendingCreditOrderValue)}</p>
                    <p className="text-purple-200 text-xs mt-1">Valor pendente</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-400/20 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Já Recebido */}
            <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-sm font-medium mb-4">Já Recebido</p>
                    <p className="text-2xl font-bold text-white mb-2">{formatCurrency(paidCreditOrderValue)}</p>
                    <p className="text-amber-200 text-xs mt-1">Pagamentos efetuados</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-400/20 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total de Pedidos */}
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium mb-4">Total de Pedidos</p>
                    <p className="text-3xl font-bold text-white mb-2">{totalCreditOrders}</p>
                    <p className="text-emerald-200 text-xs mt-1">{pendingCreditOrders} pendentes</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-400/20 rounded-full flex items-center justify-center">
                    <Receipt className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total de Clientes */}
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium mb-4">Total de Clientes</p>
                    <p className="text-3xl font-bold text-white mb-2">{totalCustomers}</p>
                    <p className="text-blue-200 text-xs mt-1">Cadastrados</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-400/20 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sistema de Abas */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="credit-orders" className="flex items-center space-x-2">
                <Receipt className="h-4 w-4" />
                <span>Pedidos Crediário</span>
              </TabsTrigger>
              <TabsTrigger value="customers" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Gestão de Clientes</span>
              </TabsTrigger>
            </TabsList>

            {/* Aba de Pedidos de Crediário */}
            <TabsContent value="credit-orders" className="space-y-6">
              {/* Filtros */}
              <Card className="shadow-sm border-petrol-200">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Buscar por cliente ou ID do pedido..."
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
                          <SelectItem value="all">Todos os Pedidos</SelectItem>
                          <SelectItem value="pending">Pendentes</SelectItem>
                          <SelectItem value="completed">Concluídos</SelectItem>
                          <SelectItem value="cancelled">Cancelados</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lista de Pedidos de Crediário */}
              <Card className="shadow-lg border-petrol-100">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-petrol-700 flex items-center">
                    <Receipt className="h-5 w-5 mr-2" />
                    Pedidos de Crediário ({totalCreditOrders})
                  </CardTitle>
                  <Button 
                    onClick={() => setLocation("/admin/pedidos")}
                    className="bg-petrol-600 hover:bg-petrol-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Pedido Crediário
                  </Button>
                </CardHeader>
                <CardContent>
                  {creditOrdersLoading || customersLoading ? (
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
                  ) : !creditOrders || creditOrders.length === 0 ? (
                    <div className="text-center py-16">
                      <Receipt className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-xl font-medium text-gray-600 mb-2">
                        {searchTerm || statusFilter !== 'all' ? 'Nenhum pedido encontrado' : 'Nenhum pedido de crediário ainda'}
                      </h3>
                      <p className="text-gray-500 mb-6">
                        {searchTerm || statusFilter !== 'all' 
                          ? 'Tente ajustar os filtros de busca'
                          : 'Os pedidos de crediário aparecerão aqui quando criados'
                        }
                      </p>
                      {!searchTerm && statusFilter === 'all' && (
                        <Button
                          onClick={() => setLocation("/admin/pedidos")}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Fazer Primeiro Pedido Crediário
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID do Pedido</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Valor Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCreditOrders.map((order) => {
                            const customer = customers?.find(c => c.id === order.customerId);
                            
                            return (
                              <TableRow key={order.id}>
                                <TableCell className="font-medium">#{formatOrderNumber(order)}</TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-petrol-100 rounded-full flex items-center justify-center">
                                      <Users className="h-4 w-4 text-petrol-600" />
                                    </div>
                                    <span>{customer?.name || 'Cliente não encontrado'}</span>
                                  </div>
                                </TableCell>
                                <TableCell>{formatDate(order.createdAt || new Date())}</TableCell>
                                <TableCell className="font-medium">
                                  {formatCurrency(order.total || 0)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    {getStatusIcon(order.status || 'pending')}
                                    {getStatusBadge(order.status || 'pending')}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Pagamentos</DropdownMenuLabel>
                                      <DropdownMenuItem 
                                        onClick={() => openPartialPaymentModal(order)}
                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      >
                                        <CreditCardIcon className="h-4 w-4 mr-2" />
                                        Pagamento Parcial
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => openTotalPaymentModal(order)}
                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      >
                                        <BanknoteIcon className="h-4 w-4 mr-2" />
                                        Pagamento Total
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuLabel>Gerência</DropdownMenuLabel>
                                      <DropdownMenuItem 
                                        onClick={() => openTransferModal(order)}
                                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                      >
                                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                                        Transferir Cliente
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                      <DropdownMenuItem onClick={() => openWhatsAppModal(order)}>
                                        <MessageCircle className="h-4 w-4 mr-2" />
                                        WhatsApp
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openDetailsModal(order)}>
                                        <Receipt className="h-4 w-4 mr-2" />
                                        Ver Detalhes
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba de Gestão de Clientes */}
            <TabsContent value="customers" className="space-y-6">
              <Card className="shadow-lg border-petrol-100">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-petrol-700 flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Clientes ({totalCustomers})
                  </CardTitle>
                  <Button 
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="bg-petrol-600 hover:bg-petrol-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Cliente
                  </Button>
                </CardHeader>
                <CardContent>
                  {customersLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                          <Skeleton className="w-12 h-12 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-1/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !customers || customers.length === 0 ? (
                    <div className="text-center py-16">
                      <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-xl font-medium text-gray-600 mb-2">
                        Nenhum cliente cadastrado ainda
                      </h3>
                      <p className="text-gray-500 mb-6">
                        Os clientes são criados automaticamente ao fazer pedidos de crediário
                      </p>
                      <div className="flex space-x-3 justify-center">
                        <Button
                          onClick={openNewCustomerModal}
                          className="bg-petrol-600 hover:bg-petrol-700"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Novo Cliente
                        </Button>
                        <Button
                          onClick={() => setLocation("/admin/pedidos")}
                          variant="outline"
                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Fazer Primeiro Pedido
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {customers.map((customer) => {
                        const customerOrders = creditOrders?.filter(order => order.customerId === customer.id) || [];
                        const totalSpent = customerOrders.reduce((sum, order) => sum + parseFloat(order.total?.toString() || "0"), 0);
                        
                        return (
                          <Card key={customer.id} className="border-petrol-200 hover:border-petrol-400 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-petrol-100 rounded-full flex items-center justify-center">
                                    <Users className="h-5 w-5 text-petrol-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">{customer.name}</h4>
                                    <p className="text-sm text-gray-500">{customer.phone || 'Sem telefone'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openEditCustomerModal(customer)}
                                    className="text-petrol-600 hover:text-petrol-700 hover:bg-petrol-50"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openDeleteConfirmation(customer)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Pedidos:</span>
                                  <span className="font-medium">{customerOrders.length}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Total gasto:</span>
                                  <span className="font-medium">{formatCurrency(totalSpent)}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Modal de Detalhes do Pedido */}
      {selectedOrderId && (
        <OrderDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={closeDetailsModal}
          orderId={selectedOrderId}
        />
      )}
      
      {/* Modal do WhatsApp */}
      {selectedOrder && (
        <OrderWhatsAppDialog
          isOpen={isWhatsAppModalOpen}
          onOpenChange={closeWhatsAppModal}
          order={selectedOrder}
          customer={customers?.find(c => c.id === selectedOrder.customerId)}
          orderItems={[]} // Será carregado pelo próprio modal
        />
      )}
      
      {/* Modal de Pagamento */}
      {selectedOrderForPayment && selectedCustomerForPayment && (
        <OrderPaymentDialog
          isOpen={isPaymentModalOpen}
          onOpenChange={closePaymentModal}
          order={selectedOrderForPayment}
          customer={selectedCustomerForPayment}
          paymentType={paymentType}
        />
      )}
      
      {/* Modal de Cliente (Novo/Editar) */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => {
          setIsCustomerModalOpen(false);
          setEditingCustomer(null);
        }}
        onCustomerCreated={handleCustomerCreated}
        onCustomerUpdated={handleCustomerUpdated}
        customer={editingCustomer}
        mode={customerModalMode}
      />
      
      {/* Modal de Transferência de Pedido */}
      {orderToTransfer && customerForTransfer && (
        <TransferOrderModal
          isOpen={isTransferModalOpen}
          onClose={() => {
            setIsTransferModalOpen(false);
            setOrderToTransfer(null);
            setCustomerForTransfer(null);
          }}
          order={orderToTransfer}
          currentCustomer={customerForTransfer}
          onTransferCompleted={handleTransferCompleted}
        />
      )}
      
      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              <span>Excluir Cliente</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{customerToDelete?.name}</strong>?
              <br />
              <span className="text-red-600 font-medium mt-2 block">
                Esta ação não pode ser desfeita.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setCustomerToDelete(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}