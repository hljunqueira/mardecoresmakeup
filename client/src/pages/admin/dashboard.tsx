import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AdminSidebar from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Users, 
  ShoppingCart,
  Eye
} from "lucide-react";
import type { Product, FinancialTransaction } from "@shared/schema";

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
  const { isAuthenticated } = useAdminAuth();

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
    queryKey: ["/api/products"],
    enabled: isAuthenticated,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<FinancialTransaction[]>({
    queryKey: ["/api/admin/transactions"],
    enabled: isAuthenticated,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const recentProducts = products?.slice(0, 3) || [];
  const recentTransactions = transactions?.slice(0, 3) || [];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-64 overflow-auto">
        <div className="p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-petrol-500 dark:text-gold-500 mb-2">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Visão geral do seu negócio
            </p>
          </div>

          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-green-500 to-green-600 border-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Total de Vendas</p>
                    {summaryLoading ? (
                      <Skeleton className="h-8 w-24 mt-2 bg-green-400/20" />
                    ) : (
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency(financialSummary?.totalRevenue || 0)}
                      </p>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-green-400/20 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Cupons Ativos</p>
                    <p className="text-2xl font-bold text-white">5</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-400/20 rounded-full flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Visitas</p>
                    <p className="text-2xl font-bold text-white">10.000</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-400/20 rounded-full flex items-center justify-center">
                    <Eye className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gold-500 to-gold-600 border-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gold-100 text-sm font-medium">Saldo</p>
                    {summaryLoading ? (
                      <Skeleton className="h-8 w-24 mt-2 bg-gold-400/20" />
                    ) : (
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency(financialSummary?.balance || 0)}
                      </p>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-gold-400/20 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Cash Flow Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-petrol-500 dark:text-gold-500">Fluxo de Caixa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gradient-to-br from-petrol-50 to-petrol-100 dark:from-petrol-800 dark:to-petrol-900 rounded-lg flex items-center justify-center">
                  {/* Simplified cash flow visualization */}
                  <div className="w-full h-full p-4 relative overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 800 200">
                      <defs>
                        <linearGradient id="cashFlowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="hsl(43, 64%, 52%)" stopOpacity="0.8"/>
                          <stop offset="100%" stopColor="hsl(43, 64%, 52%)" stopOpacity="0.1"/>
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0 150 Q 100 120 200 130 T 400 110 T 600 100 T 800 90"
                        stroke="hsl(43, 64%, 52%)"
                        strokeWidth="3"
                        fill="none"
                      />
                      <path
                        d="M 0 150 Q 100 120 200 130 T 400 110 T 600 100 T 800 90 L 800 200 L 0 200 Z"
                        fill="url(#cashFlowGradient)"
                      />
                      <circle cx="100" cy="125" r="4" fill="hsl(43, 64%, 52%)" />
                      <circle cx="200" cy="130" r="4" fill="hsl(43, 64%, 52%)" />
                      <circle cx="400" cy="110" r="4" fill="hsl(43, 64%, 52%)" />
                      <circle cx="600" cy="100" r="4" fill="hsl(43, 64%, 52%)" />
                      <circle cx="800" cy="90" r="4" fill="hsl(43, 64%, 52%)" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Products */}
            <Card>
              <CardHeader>
                <CardTitle className="text-petrol-500 dark:text-gold-500 flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Últimos Produtos
                </CardTitle>
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
                  ) : (
                    recentProducts.map((product) => (
                      <div key={product.id} className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-petrol-100 dark:bg-petrol-700 rounded flex items-center justify-center">
                          <Package className="h-6 w-6 text-petrol-500 dark:text-gold-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground truncate">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gold-500">
                            {formatCurrency(parseFloat(product.price))}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {product.stock} em estoque
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Financial Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-petrol-500 dark:text-gold-500">Ações Financeiras</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-green-700 dark:text-green-400">Contas a Receber</h4>
                        <p className="text-sm text-green-600 dark:text-green-500">
                          {formatCurrency(financialSummary?.pendingReceivables || 0)}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-red-700 dark:text-red-400">Contas a Pagar</h4>
                        <p className="text-sm text-red-600 dark:text-red-500">
                          {formatCurrency(financialSummary?.pendingPayables || 0)}
                        </p>
                      </div>
                      <TrendingDown className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-blue-700 dark:text-blue-400">Fluxo de Caixa</h4>
                        <p className="text-sm text-blue-600 dark:text-blue-500">Relatório mensal</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-purple-700 dark:text-purple-400">Fornecedores</h4>
                        <p className="text-sm text-purple-600 dark:text-purple-500">Gestão completa</p>
                      </div>
                      <Users className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
