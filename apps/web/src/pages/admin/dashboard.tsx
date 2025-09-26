import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AdminSidebar from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Users, 
  Eye,
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowRight,
  BarChart3,
  Plus,
  Calendar
} from "lucide-react";
import type { Product, FinancialTransaction, Collection, Reservation } from "@shared/schema";

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  balance: number;
  pendingReceivables: number;
  pendingPayables: number;
  totalTransactions: number;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { isAuthenticated } = useAdminAuth();

  // Atualizar hora a cada minuto
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, setLocation]);

  const { data: financialSummary, isLoading: summaryLoading } = useQuery<FinancialSummary>({
    queryKey: ["/api/admin/financial/summary"],
    enabled: isAuthenticated,
  });

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
    enabled: isAuthenticated,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<FinancialTransaction[]>({
    queryKey: ["/api/admin/transactions"],
    enabled: isAuthenticated,
  });

  const { data: collections, isLoading: collectionsLoading } = useQuery<Collection[]>({
    queryKey: ["/api/admin/collections"],
    enabled: isAuthenticated,
  });

  const { data: reservations, isLoading: reservationsLoading } = useQuery<Reservation[]>({
    queryKey: ["/api/admin/reservations"],
    enabled: isAuthenticated,
  });

  const { data: siteViews } = useQuery({
    queryKey: ["/api/analytics/views"],
    queryFn: async () => {
      const response = await fetch('/api/analytics/views');
      if (response.ok) {
        const data = await response.json();
        return data.views;
      }
      return null;
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Cálculos de estatísticas
  const totalProducts = products?.length || 0;
  const activeProducts = products?.filter(p => p.active !== false).length || 0;
  const lowStockProducts = products?.filter(p => (p.stock || 0) <= (p.minStock || 5)).length || 0;
  const featuredProducts = products?.filter(p => p.featured).length || 0;
  
  const totalCollections = collections?.length || 0;
  const activeCollections = collections?.filter(c => c.active !== false).length || 0;
  
  // Estatísticas de reservas
  const totalReservations = reservations?.length || 0;
  const activeReservations = reservations?.filter(r => r.status === 'active').length || 0;
  const soldReservations = reservations?.filter(r => r.status === 'sold').length || 0;
  const totalReservedValue = reservations?.reduce((sum, r) => {
    if (r.status === 'active') {
      return sum + (r.quantity * parseFloat(r.unitPrice.toString()));
    }
    return sum;
  }, 0) || 0;
  
  const recentProducts = products?.slice(0, 3) || [];
  const recentTransactions = transactions?.slice(0, 4) || [];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-64 overflow-auto bg-white">
        <div className="p-6 lg:p-8">
          {/* Header Melhorado */}
          <div className="mb-10 flex justify-between items-start">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-petrol-700">
                Painel de Controle
              </h1>
              <p className="text-lg text-petrol-600 font-medium">
                {formatDate(currentTime)}
              </p>
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 rounded-full">
                  <Clock className="h-4 w-4 text-green-600" />
                  <span className="text-green-700 font-medium">{formatTime(currentTime)}</span>
                </div>
                <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-full">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-700 font-medium">Sistema Online</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setLocation("/admin/produtos")}
                className="flex items-center space-x-2 border-petrol-300 text-petrol-700 hover:bg-petrol-50 hover:border-petrol-400"
              >
                <Plus className="h-4 w-4" />
                <span>Novo Produto</span>
              </Button>
              <Button 
                onClick={() => setLocation("/admin/relatorios")}
                className="bg-petrol-700 hover:bg-petrol-800 text-white flex items-center space-x-2 shadow-lg"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Ver Relatórios</span>
              </Button>
            </div>
          </div>

          {/* Cards de Resumo Melhorados */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
            <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium mb-1">Receitas Totais</p>
                    {summaryLoading ? (
                      <Skeleton className="h-8 w-24 mt-2 bg-emerald-400/20" />
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-white mb-1">
                          {formatCurrency(financialSummary?.totalRevenue || 0)}
                        </p>
                        <p className="text-emerald-100 text-xs">
                          {(financialSummary?.totalTransactions || 0)} transações
                        </p>
                      </>
                    )}
                  </div>
                  <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <DollarSign className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium mb-1">Produtos</p>
                    <p className="text-3xl font-bold text-white mb-2">{totalProducts}</p>
                    <div className="flex items-center space-x-2">
                      <Badge className="text-xs bg-white/20 text-white border-0 hover:bg-white/30">
                        {activeProducts} ativos
                      </Badge>
                    </div>
                  </div>
                  <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <Package className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-violet-500 via-violet-600 to-violet-700 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-violet-100 text-sm font-medium mb-1">Visualizações do Site</p>
                    <p className="text-3xl font-bold text-white mb-2">{siteViews?.total || 0}</p>
                    <div className="flex items-center space-x-2">
                      <Badge className="text-xs bg-white/20 text-white border-0 hover:bg-white/30">
                        {siteViews?.today || 0} hoje
                      </Badge>
                      <Badge className="text-xs bg-white/20 text-white border-0 hover:bg-white/30">
                        {siteViews?.thisWeek || 0} esta semana
                      </Badge>
                    </div>
                  </div>
                  <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <Eye className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-sm font-medium mb-1">Saldo</p>
                    {summaryLoading ? (
                      <Skeleton className="h-8 w-24 mt-2 bg-amber-400/20" />
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-white mb-1">
                          {formatCurrency(financialSummary?.balance || 0)}
                        </p>
                        <p className="text-amber-100 text-xs">
                          {(financialSummary?.balance || 0) >= 0 ? 'Positivo' : 'Negativo'}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <TrendingUp className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-indigo-100 text-sm font-medium mb-1">Reservas</p>
                    <p className="text-3xl font-bold text-white mb-2">{totalReservations}</p>
                    <div className="flex items-center space-x-2">
                      <Badge className="text-xs bg-white/20 text-white border-0 hover:bg-white/30">
                        {activeReservations} ativas
                      </Badge>
                      <Badge className="text-xs bg-white/20 text-white border-0 hover:bg-white/30">
                        {formatCurrency(totalReservedValue)}
                      </Badge>
                    </div>
                  </div>
                  <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <Calendar className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alertas Importantes */}
          {(financialSummary?.balance || 0) < 0 && (
            <div className="mb-10">
              <Alert className="border-red-200 bg-red-50 shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                  <AlertDescription className="text-red-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full">
                      <div>
                        <p className="font-semibold text-lg">Saldo negativo detectado</p>
                        <p className="text-sm mt-1">Revise suas finanças para equilibrar o orçamento.</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="mt-3 sm:mt-0 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                        onClick={() => setLocation("/admin/financeiro")}
                      >
                        Ver detalhes <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </AlertDescription>
                </div>
              </Alert>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8 mb-10">
            {/* Transações Recentes */}
            <Card className="lg:col-span-1 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-petrol-600 dark:text-gold-500 flex items-center text-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                      <DollarSign className="h-4 w-4 text-white" />
                    </div>
                    Transações Recentes
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setLocation("/admin/financeiro")}
                    className="text-petrol-500 hover:text-petrol-600 hover:bg-petrol-50"
                  >
                    Ver todas <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactionsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))
                  ) : recentTransactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma transação ainda</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => setLocation("/admin/financeiro")}
                      >
                        Adicionar transação
                      </Button>
                    </div>
                  ) : (
                    recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 p-2 rounded-md transition-colors">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transaction.type === 'income' 
                            ? 'bg-green-100 dark:bg-green-900/30' 
                            : 'bg-red-100 dark:bg-red-900/30'
                        }`}>
                          {transaction.type === 'income' ? (
                            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{transaction.description}</p>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <span>{transaction.category}</span>
                            <Badge 
                              variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {transaction.status === 'pending' ? 'Pendente' : 
                               transaction.status === 'completed' ? 'Concluído' : 'Cancelado'}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${
                            transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'}
                            {formatCurrency(parseFloat(transaction.amount))}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {transaction.date ? new Date(transaction.date).toLocaleDateString('pt-BR') : 'Hoje'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Produtos Recentes Melhorados */}
            <Card className="lg:col-span-1 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-petrol-600 dark:text-gold-500 flex items-center text-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                      <Package className="h-4 w-4 text-white" />
                    </div>
                    Últimos Produtos
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setLocation("/admin/produtos")}
                    className="text-petrol-500 hover:text-petrol-600 hover:bg-petrol-50"
                  >
                    Ver todos <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {productsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <Skeleton className="h-12 w-12 rounded" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))
                  ) : recentProducts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum produto ainda</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => setLocation("/admin/produtos")}
                      >
                        Criar primeiro produto
                      </Button>
                    </div>
                  ) : (
                    recentProducts.map((product) => (
                      <div key={product.id} className="flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 p-2 rounded-md transition-colors">
                        <div className="w-12 h-12 bg-petrol-100 dark:bg-petrol-700 rounded flex items-center justify-center relative">
                          <Package className="h-6 w-6 text-petrol-500 dark:text-gold-500" />
                          {product.featured && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gold-500 rounded-full border border-white dark:border-gray-800" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{product.name}</p>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <span>{product.category || 'Sem categoria'}</span>
                            {!product.active && (
                              <Badge variant="secondary" className="text-xs">Inativo</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gold-500">
                            {formatCurrency(parseFloat(product.price))}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {product.stock || 0} un.
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {recentProducts.length > 0 && (
                  <div className="pt-4 border-t mt-4">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Total de produtos:</span>
                      <span className="font-medium">{totalProducts}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Produtos ativos:</span>
                      <span className="font-medium text-green-600">{activeProducts}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Em destaque:</span>
                      <span className="font-medium text-gold-600">{featuredProducts}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ações Rápidas */}
            <Card className="lg:col-span-1 border border-petrol-200 shadow-lg bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-petrol-700 flex items-center text-lg">
                  <div className="w-8 h-8 bg-petrol-100 rounded-lg flex items-center justify-center mr-3">
                    <TrendingUp className="h-4 w-4 text-petrol-700" />
                  </div>
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => setLocation("/admin/produtos")}
                  className="w-full justify-start bg-white border border-petrol-200 text-petrol-700 hover:bg-petrol-50 hover:border-petrol-300 transition-all duration-300"
                  variant="outline"
                >
                  <Package className="h-4 w-4 mr-3" />
                  Adicionar Produto
                </Button>
                
                <Button 
                  onClick={() => setLocation("/admin/reservas")}
                  className="w-full justify-start bg-white border border-petrol-200 text-petrol-700 hover:bg-petrol-50 hover:border-petrol-300 transition-all duration-300"
                  variant="outline"
                >
                  <Calendar className="h-4 w-4 mr-3" />
                  Ver Reservas
                </Button>
                
                <Button 
                  onClick={() => setLocation("/admin/financeiro")}
                  className="w-full justify-start bg-white border border-petrol-200 text-petrol-700 hover:bg-petrol-50 hover:border-petrol-300 transition-all duration-300"
                  variant="outline"
                >
                  <DollarSign className="h-4 w-4 mr-3" />
                  Nova Transação
                </Button>
                
                <div className="pt-6 border-t border-petrol-200">
                  <h4 className="font-semibold text-base text-petrol-700 mb-4 flex items-center">
                    <div className="w-6 h-6 bg-petrol-100 rounded-md flex items-center justify-center mr-2">
                      <DollarSign className="h-3 w-3 text-petrol-700" />
                    </div>
                    Resumo Financeiro
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-green-700">A Receber:</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(financialSummary?.pendingReceivables || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="text-sm font-medium text-red-700">A Pagar:</span>
                      <span className="font-bold text-red-600">
                        {formatCurrency(financialSummary?.pendingPayables || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-petrol-50 rounded-lg border border-petrol-200">
                      <span className="text-sm font-bold text-petrol-700">Saldo:</span>
                      <span className={`font-bold text-lg ${
                        (financialSummary?.balance || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(financialSummary?.balance || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
