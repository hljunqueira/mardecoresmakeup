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
  ShoppingCart,
  Eye,
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowRight,
  BarChart3,
  Plus
} from "lucide-react";
import type { Product, FinancialTransaction, Collection, Coupon } from "@shared/schema";

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

  const { data: coupons, isLoading: couponsLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/admin/coupons"],
    enabled: isAuthenticated,
  });

  const { data: activeCoupons } = useQuery<number>({
    queryKey: ["/api/admin/coupons/active/count"],
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
  
  const totalCoupons = coupons?.length || 0;
  const activeCouponsCount = coupons?.filter(c => c.active !== false).length || 0;
  
  const recentProducts = products?.slice(0, 3) || [];
  const recentTransactions = transactions?.slice(0, 4) || [];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-64 overflow-auto">
        <div className="p-6 lg:p-8">
          {/* Header Melhorado */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-petrol-500 dark:text-gold-500 mb-2">
                Painel de Controle
              </h1>
              <p className="text-muted-foreground mb-1">
                {formatDate(currentTime)}
              </p>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(currentTime)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Sistema Online</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setLocation("/admin/produtos")}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Novo Produto</span>
              </Button>
              <Button 
                onClick={() => setLocation("/admin/relatorios")}
                className="bg-petrol-500 hover:bg-petrol-600 flex items-center space-x-2"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Ver Relatórios</span>
              </Button>
            </div>
          </div>

          {/* Cards de Resumo Melhorados */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-green-500 to-green-600 border-none hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Receitas Totais</p>
                    {summaryLoading ? (
                      <Skeleton className="h-8 w-24 mt-2 bg-green-400/20" />
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-white">
                          {formatCurrency(financialSummary?.totalRevenue || 0)}
                        </p>
                        <p className="text-green-100 text-xs mt-1">
                          {(financialSummary?.totalTransactions || 0)} transações
                        </p>
                      </>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-green-400/20 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-none hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Produtos</p>
                    <p className="text-2xl font-bold text-white">{totalProducts}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="secondary" className="text-xs bg-blue-400/20 text-blue-100">
                        {activeProducts} ativos
                      </Badge>
                      {lowStockProducts > 0 && (
                        <Badge variant="destructive" className="text-xs bg-red-500/20 text-red-100">
                          {lowStockProducts} baixo estoque
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-blue-400/20 rounded-full flex items-center justify-center">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-none hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Visualizações do Site</p>
                    <p className="text-2xl font-bold text-white">{siteViews?.total || 0}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="secondary" className="text-xs bg-purple-400/20 text-purple-100">
                        {siteViews?.today || 0} hoje
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-purple-400/20 text-purple-100">
                        {siteViews?.thisWeek || 0} esta semana
                      </Badge>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-purple-400/20 rounded-full flex items-center justify-center">
                    <Eye className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gold-500 to-gold-600 border-none hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gold-100 text-sm font-medium">Saldo</p>
                    {summaryLoading ? (
                      <Skeleton className="h-8 w-24 mt-2 bg-gold-400/20" />
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-white">
                          {formatCurrency(financialSummary?.balance || 0)}
                        </p>
                        <p className="text-gold-100 text-xs mt-1">
                          {(financialSummary?.balance || 0) >= 0 ? 'Positivo' : 'Negativo'}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-gold-400/20 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alertas Importantes */}
          {(lowStockProducts > 0 || (financialSummary?.balance || 0) < 0) && (
            <div className="mb-8 space-y-4">
              {lowStockProducts > 0 && (
                <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-amber-700 dark:text-amber-400">
                    <strong>{lowStockProducts} produto(s)</strong> com estoque baixo precisam de reposição.
                    <Button 
                      variant="link" 
                      className="ml-2 p-0 h-auto text-amber-700 dark:text-amber-400"
                      onClick={() => setLocation("/admin/produtos")}
                    >
                      Ver produtos <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              {(financialSummary?.balance || 0) < 0 && (
                <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-700 dark:text-red-400">
                    <strong>Saldo negativo</strong> detectado. Revise suas finanças.
                    <Button 
                      variant="link" 
                      className="ml-2 p-0 h-auto text-red-700 dark:text-red-400"
                      onClick={() => setLocation("/admin/financeiro")}
                    >
                      Ver detalhes <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8 mb-8">
            {/* Transações Recentes */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-petrol-500 dark:text-gold-500 flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Transações Recentes
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setLocation("/admin/financeiro")}
                    className="text-petrol-500 hover:text-petrol-600"
                  >
                    Ver todas <ArrowRight className="h-3 w-3 ml-1" />
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
            <Card className="lg:col-span-1">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-petrol-500 dark:text-gold-500 flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Últimos Produtos
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setLocation("/admin/produtos")}
                    className="text-petrol-500 hover:text-petrol-600"
                  >
                    Ver todos <ArrowRight className="h-3 w-3 ml-1" />
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
                            {(product.stock || 0) <= (product.minStock || 5) && (
                              <Badge variant="destructive" className="text-xs">Estoque baixo</Badge>
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
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-petrol-500 dark:text-gold-500">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => setLocation("/admin/produtos")}
                  className="w-full justify-start bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  variant="outline"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Adicionar Produto
                </Button>
                
                <Button 
                  onClick={() => setLocation("/admin/financeiro")}
                  className="w-full justify-start bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                  variant="outline"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Nova Transação
                </Button>
                
                <Button 
                  onClick={() => setLocation("/admin/cupons")}
                  className="w-full justify-start bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                  variant="outline"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Criar Cupom
                </Button>
                
                <Button 
                  onClick={() => setLocation("/admin/colecoes")}
                  className="w-full justify-start bg-gold-50 dark:bg-gold-900/20 border-gold-200 dark:border-gold-800 text-gold-700 dark:text-gold-600 hover:bg-gold-100 dark:hover:bg-gold-900/30"
                  variant="outline"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Nova Coleção
                </Button>
                
                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-sm text-muted-foreground mb-3">Resumo Financeiro</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">A Receber:</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(financialSummary?.pendingReceivables || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">A Pagar:</span>
                      <span className="font-medium text-red-600">
                        {formatCurrency(financialSummary?.pendingPayables || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-medium border-t pt-2">
                      <span>Saldo:</span>
                      <span className={`${
                        (financialSummary?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
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
