import { useEffect, useState } from "react";
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
import { useStockUpdate } from "@/hooks/use-stock-update";
import { ReservationManageModal } from "@/components/ui/reservation-manage-modal";
import PaymentDialog from "@/components/ui/payment-dialog";
import WhatsAppDialog from "@/components/ui/whatsapp-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Calendar,
  Search,
  Filter,
  Package,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Eye,
  MoreHorizontal,
  TrendingUp,
  DollarSign,
  Trash2,
  Plus,
  Edit,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Users,
  Store,
  ShoppingCart,
  FileText,
  Settings
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
import type { Product, Reservation, Customer, CreditAccount } from "@shared/schema";

// Schemas para validação de formulários
const customerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos").optional(),
  dateOfBirth: z.string().optional(),
  cpf: z.string().optional(),
});

const creditAccountSchema = z.object({
  customerId: z.string().min(1, "Selecione um cliente"),
  totalAmount: z.number().min(0, "Valor deve ser positivo"),
  installments: z.number().min(1, "Parcelas devem ser pelo menos 1"),
  paymentFrequency: z.enum(["weekly", "monthly"]),
  nextPaymentDate: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;
type CreditAccountFormData = z.infer<typeof creditAccountSchema>;

export default function AdminReservationsAndCredit() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("credit-accounts");
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isCreditAccountDialogOpen, setIsCreditAccountDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const [selectedAccountForPayment, setSelectedAccountForPayment] = useState<{ account: CreditAccount; customer: Customer } | null>(null);
  const [selectedAccountForWhatsApp, setSelectedAccountForWhatsApp] = useState<{ account: CreditAccount; customer: Customer } | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingCreditAccount, setEditingCreditAccount] = useState<CreditAccount | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { isAuthenticated } = useAdminAuth();
  const queryClient = useQueryClient();
  const { 
    isReservationManageDialogOpen,
    currentReservation,
    openReservationManageDialog,
    confirmReservationSale,
    returnReservationToStock,
    deleteReservation,
    cancelReservationManage,
    isLoading: isStockUpdateLoading
  } = useStockUpdate();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, setLocation]);

  const { data: reservations, isLoading: reservationsLoading, refetch: refetchReservations } = useQuery<Reservation[]>({
    queryKey: ["/api/admin/reservations"],
    enabled: isAuthenticated,
  });

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
    enabled: isAuthenticated,
  });

  // Queries para clientes e contas de crediário
  const { data: customers, isLoading: customersLoading, refetch: refetchCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/admin/customers"],
    enabled: isAuthenticated,
  });

  const { data: creditAccounts, isLoading: creditAccountsLoading, refetch: refetchCreditAccounts } = useQuery<CreditAccount[]>({
    queryKey: ["/api/admin/credit-accounts"],
    enabled: isAuthenticated,
  });

  // Mutações para clientes
  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const response = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao criar cliente');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      setIsCustomerDialogOpen(false);
      customerForm.reset();
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CustomerFormData }) => {
      const response = await fetch(`/api/admin/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao atualizar cliente');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      setIsCustomerDialogOpen(false);
      setEditingCustomer(null);
      customerForm.reset();
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const response = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Erro ao excluir cliente');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-accounts"] });
      setIsDeleteDialogOpen(false);
      setCustomerToDelete(null);
    },
  });

  // Mutações para contas de crediário
  const createCreditAccountMutation = useMutation({
    mutationFn: async (data: CreditAccountFormData) => {
      const response = await fetch('/api/admin/credit-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao criar conta de crediário');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-accounts"] });
      setIsCreditAccountDialogOpen(false);
      setEditingCreditAccount(null);
      creditAccountForm.reset();
    },
  });

  const updateCreditAccountMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreditAccountFormData }) => {
      console.log('🔄 Iniciando atualização da conta:', id, data);
      const response = await fetch(`/api/admin/credit-accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na atualização:', response.status, errorText);
        throw new Error(`Erro ao atualizar conta de crediário: ${response.status}`);
      }
      const result = await response.json();
      console.log('✅ Conta atualizada com sucesso:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('✅ onSuccess - invalidando queries e fechando modal');
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-accounts"] });
      setIsCreditAccountDialogOpen(false);
      setEditingCreditAccount(null);
      creditAccountForm.reset();
    },
    onError: (error) => {
      console.error('❌ onError - Erro na mutação:', error);
    },
  });

  // Formulários
  const customerForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: "",
      dateOfBirth: "",
      cpf: "",
    },
  });

  const creditAccountForm = useForm<CreditAccountFormData>({
    resolver: zodResolver(creditAccountSchema),
    defaultValues: {
      customerId: "",
      totalAmount: 0,
      installments: 1,
      paymentFrequency: "monthly" as const,
      nextPaymentDate: "",
      notes: "",
    },
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Ativa</Badge>;
      case 'sold':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Vendida</Badge>;
      case 'returned':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Devolvida</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'sold':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'returned':
        return <RefreshCw className="h-4 w-4 text-gray-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  // Filtrar reservas
  const filteredReservations = reservations?.filter(reservation => {
    const product = products?.find(p => p.id === reservation.productId);
    const matchesSearch = reservation.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  // Handlers para formulários
  const handleCreateCustomer = (data: CustomerFormData) => {
    createCustomerMutation.mutate(data);
  };

  const handleUpdateCustomer = (data: CustomerFormData) => {
    if (editingCustomer) {
      updateCustomerMutation.mutate({ id: editingCustomer.id, data });
    }
  };
  const handleCreateCreditAccount = (data: CreditAccountFormData) => {
    createCreditAccountMutation.mutate(data);
  };

  const handleUpdateCreditAccount = (data: CreditAccountFormData) => {
    if (editingCreditAccount) {
      updateCreditAccountMutation.mutate({ id: editingCreditAccount.id, data });
    }
  };
  const openCustomerDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      customerForm.reset({
        name: customer.name,
        phone: customer.phone || "",
        dateOfBirth: customer.dateOfBirth || "",
        cpf: customer.cpf || "",
      });
    } else {
      setEditingCustomer(null);
      customerForm.reset();
    }
    setIsCustomerDialogOpen(true);
  };
  const openCreditAccountDialog = (account?: CreditAccount) => {
    if (account) {
      setEditingCreditAccount(account);
      creditAccountForm.reset({
        customerId: account.customerId,
        totalAmount: parseFloat(account.totalAmount?.toString() || "0"),
        installments: account.installments || 1,
        paymentFrequency: (account.paymentFrequency as "weekly" | "monthly") || "monthly",
        nextPaymentDate: account.nextPaymentDate ? new Date(account.nextPaymentDate).toISOString().split('T')[0] : "",
        notes: account.notes || "",
      });
    } else {
      setEditingCreditAccount(null);
      creditAccountForm.reset();
    }
    setIsCreditAccountDialogOpen(true);
  };

  const openPaymentDialog = (account: CreditAccount, customer: Customer) => {
    setSelectedAccountForPayment({ account, customer });
    setIsPaymentDialogOpen(true);
  };

  const openWhatsAppDialog = (account: CreditAccount, customer: Customer) => {
    setSelectedAccountForWhatsApp({ account, customer });
    setIsWhatsAppDialogOpen(true);
  };

  const openDeleteDialog = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteCustomer = () => {
    if (customerToDelete) {
      deleteCustomerMutation.mutate(customerToDelete.id);
    }
  };

  // Estatísticas
  const totalReservations = reservations?.length || 0;
  const activeReservations = reservations?.filter(r => r.status === 'active').length || 0;
  const soldReservations = reservations?.filter(r => r.status === 'sold').length || 0;
  const totalReservedValue = reservations?.reduce((sum, r) => {
    if (r.status === 'active') {
      return sum + (r.quantity * parseFloat(r.unitPrice.toString()));
    }
    return sum;
  }, 0) || 0;

  // Estatísticas de crediário
  const totalCustomers = customers?.length || 0;
  const totalCreditAccounts = creditAccounts?.length || 0;
  const totalCreditLimit = creditAccounts?.reduce((sum, account) => {
    return sum + parseFloat(account.totalAmount?.toString() || "0");
  }, 0) || 0;
  const totalCreditUsed = creditAccounts?.reduce((sum, account) => {
    return sum + parseFloat(account.paidAmount?.toString() || "0");
  }, 0) || 0;

  const handleOpenReservationDialog = (reservation: Reservation) => {
    const product = products?.find(p => p.id === reservation.productId);
    if (product) {
      openReservationManageDialog(product, reservation);
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
                <CreditCard className="h-10 w-10 mr-3 text-petrol-600" />
                Gestão de Crediário
              </h1>
              <p className="text-lg text-petrol-600">
                Gerencie contas de crediário, clientes e pagamentos de forma centralizada
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

          {/* Dashboard Principal - Informações Essenciais do Crediário */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total de Clientes */}
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium mb-1">Total de Clientes</p>
                    <p className="text-3xl font-bold text-white">{totalCustomers}</p>
                    <p className="text-blue-200 text-xs mt-1">Cadastrados</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-400/20 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contas de Crediário */}
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium mb-1">Contas Ativas</p>
                    <p className="text-3xl font-bold text-white">{totalCreditAccounts}</p>
                    <p className="text-emerald-200 text-xs mt-1">Em funcionamento</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-400/20 rounded-full flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Valor Total em Crediário */}
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium mb-1">Valor Total</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(totalCreditLimit)}</p>
                    <p className="text-purple-200 text-xs mt-1">Limite disponível</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-400/20 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ticket Médio */}
            <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-sm font-medium mb-1">Ticket Médio</p>
                    <p className="text-2xl font-bold text-white">
                      {totalCustomers > 0 ? formatCurrency(totalCreditLimit / totalCustomers) : formatCurrency(0)}
                    </p>
                    <p className="text-amber-200 text-xs mt-1">Por cliente</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-400/20 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>



          {/* Sistema de Abas Unificado */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="credit-accounts" className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4" />
                <span>Contas Ativas</span>
              </TabsTrigger>
              <TabsTrigger value="customers" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Clientes</span>
              </TabsTrigger>
            </TabsList>

            {/* Aba de Contas Ativas - FASE 1.3 Nova Interface por Cliente */}
            <TabsContent value="credit-accounts" className="space-y-6">
              {/* Filtros */}
              <Card className="shadow-sm border-petrol-200">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Buscar por cliente ou número da conta..."
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
                          <SelectItem value="all">Todas as Contas</SelectItem>
                          <SelectItem value="active">Ativas</SelectItem>
                          <SelectItem value="overdue">Vencidas</SelectItem>
                          <SelectItem value="paid">Pagas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lista de Contas por Cliente - Layout do Plano */}
              <Card className="shadow-lg border-petrol-100">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-petrol-700 flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Contas Ativas por Cliente ({totalCreditAccounts})
                  </CardTitle>
                  <Button onClick={() => openCreditAccountDialog()} className="bg-petrol-600 hover:bg-petrol-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Conta
                  </Button>
                </CardHeader>
                <CardContent>
                  {creditAccountsLoading || customersLoading ? (
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
                  ) : !creditAccounts || creditAccounts.length === 0 ? (
                    <div className="text-center py-16">
                      <CreditCard className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-xl font-medium text-gray-600 mb-2">
                        {searchTerm || statusFilter !== 'all' ? 'Nenhuma conta encontrada' : 'Nenhuma conta de crediário ainda'}
                      </h3>
                      <p className="text-gray-500 mb-6">
                        {searchTerm || statusFilter !== 'all' 
                          ? 'Tente ajustar os filtros de busca'
                          : 'Comece migrando as reservas existentes ou criando novas contas'
                        }
                      </p>
                      {!searchTerm && statusFilter === 'all' && (
                        <div className="flex flex-col space-y-3">
                          <Button
                            onClick={() => openCreditAccountDialog()}
                            className="bg-petrol-600 hover:bg-petrol-700"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Criar Nova Conta
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setActiveTab("history")}
                            className="border-petrol-300 text-petrol-700 hover:bg-petrol-50"
                          >
                            <Calendar className="h-4 w-4 mr-2" />
                            Ver Reservas para Migração
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {creditAccounts.map((account) => {
                        const customer = customers?.find(c => c.id === account.customerId);
                        const remainingAmount = parseFloat(account.remainingAmount?.toString() || "0");
                        const paidAmount = parseFloat(account.paidAmount?.toString() || "0");
                        const totalAmount = parseFloat(account.totalAmount?.toString() || "0");
                        const nextPaymentDate = account.nextPaymentDate ? new Date(account.nextPaymentDate) : null;
                        const isOverdue = nextPaymentDate && nextPaymentDate < new Date();
                        
                        return (
                          <div key={account.id} className={`border-2 rounded-xl p-6 transition-all duration-200 hover:shadow-lg ${
                            isOverdue ? 'border-red-200 bg-red-50' : 'border-petrol-200 bg-white hover:border-petrol-300'
                          }`}>
                            {/* Cabeçalho da Conta - Layout do Plano */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                  isOverdue ? 'bg-red-100' : 'bg-petrol-100'
                                }`}>
                                  <CreditCard className={`h-6 w-6 ${
                                    isOverdue ? 'text-red-600' : 'text-petrol-600'
                                  }`} />
                                </div>
                                <div>
                                  <h3 className="text-xl font-bold text-gray-900">
                                    Cliente: {customer?.name || 'Cliente não encontrado'} ({account.accountNumber})
                                  </h3>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {isOverdue && (
                                  <Badge className="bg-red-100 text-red-800 border-red-200">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Vencida
                                  </Badge>
                                )}
                                <Badge className={account.status === 'active' ? 
                                  'bg-green-100 text-green-800 border-green-200' : 
                                  'bg-gray-100 text-gray-800 border-gray-200'
                                }>
                                  {account.status === 'active' ? 'Ativa' : 
                                   account.status === 'closed' ? 'Fechada' : 'Suspensa'}
                                </Badge>
                              </div>
                            </div>

                            {/* Produtos da Conta - Layout conforme o plano */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                              <h4 className="text-sm font-medium text-gray-700 mb-3">Produtos nesta conta:</h4>
                              <div className="space-y-2">
                                {/* Dados condicionais baseados no número de parcelas */}
                                {account.installments === 1 ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-gray-600">- Produtos diversos</span>
                                      <span className="font-medium">{formatCurrency(totalAmount)}</span>
                                    </div>
                                    <div className="flex justify-end">
                                      <span className="text-sm text-gray-500">(Venc: {nextPaymentDate ? formatDate(nextPaymentDate) : 'A definir'})</span>
                                    </div>
                                  </div>
                                ) : (
                                  // Exemplo de múltiplas parcelas - será substituído por dados reais na FASE 3
                                  Array.from({ length: Math.min(account.installments || 1, 3) }).map((_, index) => {
                                    const installmentValue = totalAmount / (account.installments || 1);
                                    const dueDate = new Date();
                                    dueDate.setMonth(dueDate.getMonth() + index);
                                    
                                    return (
                                      <div key={index} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                          <span className="text-gray-600">- Parcela {index + 1}</span>
                                          <span className="font-medium">{formatCurrency(installmentValue)}</span>
                                        </div>
                                        <div className="flex justify-end">
                                          <span className="text-sm text-gray-500">(Venc: {formatDate(dueDate)})</span>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>

                            {/* Informações da Conta */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  <span className="text-gray-500">Pago:</span>
                                  <span className="font-medium text-green-600">{formatCurrency(paidAmount)}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Clock className="h-4 w-4 text-gray-500" />
                                  <span className="text-gray-500">Parcelas:</span>
                                  <span className="font-medium">{account.installments}x</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {customer?.phone && (
                                  <div className="flex items-center space-x-2">
                                    <Phone className="h-4 w-4 text-gray-500" />
                                    <span className="text-gray-500">Telefone:</span>
                                    <span className="font-medium">{customer.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Botões de Ação - Conforme o Plano */}
                            <div className="flex flex-wrap gap-3">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="border-petrol-300 text-petrol-700 hover:bg-petrol-50"
                                onClick={() => openCreditAccountDialog(account)}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Editar Crediário
                              </Button>
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => customer && openPaymentDialog(account, customer)}
                              >
                                <DollarSign className="h-4 w-4 mr-2" />
                                Registrar Pagamento
                              </Button>
                              {customer?.phone && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="border-green-300 text-green-700 hover:bg-green-50"
                                  onClick={() => customer && openWhatsAppDialog(account, customer)}
                                >
                                  <Phone className="h-4 w-4 mr-2" />
                                  WhatsApp
                                </Button>
                              )}
                            </div>

                            {/* Observações */}
                            {account.notes && (
                              <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                                <p className="text-sm text-blue-800">
                                  <strong>Observações:</strong> {account.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba de Clientes */}
            <TabsContent value="customers" className="space-y-6">
              <Card className="shadow-lg border-petrol-100">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-petrol-700 flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Gestão de Clientes ({totalCustomers})
                  </CardTitle>
                  <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => openCustomerDialog()} className="bg-petrol-600 hover:bg-petrol-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Cliente
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
                        </DialogTitle>
                      </DialogHeader>
                      <Form {...customerForm}>
                        <form onSubmit={customerForm.handleSubmit(editingCustomer ? handleUpdateCustomer : handleCreateCustomer)} className="space-y-4">
                          <FormField
                            control={customerForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Nome completo" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={customerForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefone</FormLabel>
                                <FormControl>
                                  <Input placeholder="(11) 99999-9999" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={customerForm.control}
                            name="cpf"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>CPF</FormLabel>
                                <FormControl>
                                  <Input placeholder="000.000.000-00" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => setIsCustomerDialogOpen(false)}>
                              Cancelar
                            </Button>
                            <Button type="submit" disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}>
                              {editingCustomer ? 'Atualizar' : 'Criar'}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {customersLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : !customers || customers.length === 0 ? (
                    <div className="text-center py-16">
                      <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-xl font-medium text-gray-600 mb-2">Nenhum cliente cadastrado</h3>
                      <p className="text-gray-500 mb-6">Comece criando seu primeiro cliente</p>
                      <Button onClick={() => openCustomerDialog()} className="bg-petrol-600 hover:bg-petrol-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Primeiro Cliente
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Total Gasto</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customers.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell>{customer.phone || 'N/A'}</TableCell>
                            <TableCell>{formatCurrency(customer.totalSpent || 0)}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openCustomerDialog(customer)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openDeleteDialog(customer)}
                                  className="border-red-300 text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>



            {/* Aba de Histórico - FASE 1.2 Completa */}
          </Tabs>

          {/* Dialog para Nova Conta de Crediário */}
          <Dialog open={isCreditAccountDialogOpen} onOpenChange={setIsCreditAccountDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingCreditAccount ? 'Editar Conta de Crediário' : 'Nova Conta de Crediário'}
                </DialogTitle>
              </DialogHeader>
              <Form {...creditAccountForm}>
                <form onSubmit={creditAccountForm.handleSubmit(editingCreditAccount ? handleUpdateCreditAccount : handleCreateCreditAccount)} className="space-y-4">
                  <FormField
                    control={creditAccountForm.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um cliente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {customers?.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={creditAccountForm.control}
                    name="totalAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Total *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={creditAccountForm.control}
                    name="installments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de Parcelas *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            placeholder="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={creditAccountForm.control}
                    name="paymentFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequência de Pagamento *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="monthly">Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={creditAccountForm.control}
                    name="nextPaymentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Vencimento</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={creditAccountForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Observações opcionais..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreditAccountDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createCreditAccountMutation.isPending || updateCreditAccountMutation.isPending}>
                      {editingCreditAccount ? 'Atualizar' : 'Criar Conta'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Dialog de Confirmação de Exclusão de Cliente */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Confirmar Exclusão</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-gray-700">
                  Tem certeza que deseja excluir o cliente <strong>{customerToDelete?.name}</strong>?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                    <div className="text-sm text-red-700">
                      <p className="font-medium">Atenção!</p>
                      <p>Esta ação não pode ser desfeita. Todas as contas de crediário associadas a este cliente também serão removidas.</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDeleteDialogOpen(false)}
                    disabled={deleteCustomerMutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={confirmDeleteCustomer}
                    disabled={deleteCustomerMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {deleteCustomerMutation.isPending ? 'Excluindo...' : 'Excluir Cliente'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* WhatsApp Dialog */}
      {selectedAccountForWhatsApp && (
        <WhatsAppDialog
          isOpen={isWhatsAppDialogOpen}
          onOpenChange={setIsWhatsAppDialogOpen}
          creditAccount={selectedAccountForWhatsApp.account}
          customer={selectedAccountForWhatsApp.customer}
        />
      )}
      
      {/* Payment Dialog */}
      {selectedAccountForPayment && (
        <PaymentDialog
          isOpen={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          creditAccount={selectedAccountForPayment.account}
          customer={selectedAccountForPayment.customer}
        />
      )}
      
      {/* Reservation Management Modal */}
      <ReservationManageModal
        isOpen={isReservationManageDialogOpen}
        onConfirmSale={confirmReservationSale}
        onReturnToStock={returnReservationToStock}
        onDeleteReservation={deleteReservation}
        onCancel={cancelReservationManage}
        isLoading={isStockUpdateLoading}
        product={currentReservation?.product || null}
        reservation={currentReservation?.reservation || null}
      />
    </div>
  );
}