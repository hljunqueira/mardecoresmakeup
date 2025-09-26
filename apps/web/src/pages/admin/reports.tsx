import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AdminSidebar from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { apiRequest } from "@/lib/queryClient";
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  DollarSign,
  Calendar,
  Download
} from "lucide-react";
import type { Product } from "@shared/schema";

interface ReportData {
  totalSales: number;
  totalRevenue: number;
  totalProducts: number;
  totalReservations?: number;
  activeReservations?: number;
  reservedValue?: number;
  topProducts: Array<{
    product: Product;
    sales: number;
    revenue: number;
  }>;
  salesByMonth: Array<{
    month: string;
    sales: number;
    revenue: number;
  }>;
  lowStockProducts: Product[];
}

export default function AdminReports() {
  const [, setLocation] = useLocation();
  const [dateRange, setDateRange] = useState("30"); // Last 30 days
  const { isAuthenticated } = useAdminAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, setLocation]);

  const { data: reportData, isLoading } = useQuery<ReportData>({
    queryKey: ["/api/admin/reports", dateRange],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/admin/reports?period=${dateRange}`);
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const exportReport = () => {
    if (!reportData) return;
    
    // Criar dados para exportação
    const exportData = {
      titulo: "Relatório de Vendas - Mar de Cores",
      periodo: `Últimos ${dateRange} dias`,
      dataExportacao: new Date().toLocaleDateString('pt-BR'),
      metricas: {
        totalVendas: reportData.totalSales,
        receitaTotal: formatCurrency(reportData.totalRevenue),
        totalProdutos: reportData.totalProducts,
        produtosEstoqueBaixo: reportData.lowStockProducts?.length || 0
      },
      topProdutos: reportData.topProducts?.map(item => ({
        nome: item.product.name,
        vendas: item.sales,
        receita: formatCurrency(item.revenue),
        preco: formatCurrency(parseFloat(item.product.price))
      })),
      vendasPorMes: reportData.salesByMonth
    };
    
    // Criar e baixar arquivo JSON
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-mar-de-cores-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-64 overflow-auto">
        <div className="p-6 lg:p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-petrol-500 dark:text-gold-500 mb-2">
                Relatórios
              </h1>
              <p className="text-muted-foreground">
                Análise completa do desempenho da sua loja
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 3 meses</SelectItem>
                  <SelectItem value="365">Último ano</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={exportReport}
                className="bg-petrol-500 hover:bg-petrol-600"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          {/* Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-8 w-32 mb-2" />
                    <Skeleton className="h-4 w-16" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total de Vendas</p>
                        <p className="text-2xl font-bold">{reportData?.totalSales}</p>
                        <p className="text-xs text-green-600 flex items-center">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          +12% vs período anterior
                        </p>
                      </div>
                      <ShoppingCart className="h-8 w-8 text-petrol-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
                        <p className="text-2xl font-bold">{formatCurrency(reportData?.totalRevenue || 0)}</p>
                        <p className="text-xs text-green-600 flex items-center">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          +8% vs período anterior
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-gold-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Produtos</p>
                        <p className="text-2xl font-bold">{reportData?.totalProducts}</p>
                        <p className="text-xs text-blue-600 flex items-center">
                          <Package className="h-3 w-3 mr-1" />
                          {reportData?.lowStockProducts?.length} com estoque baixo
                        </p>
                      </div>
                      <Package className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Reservas</p>
                        <p className="text-2xl font-bold">{reportData?.totalReservations || 0}</p>
                        <p className="text-xs text-indigo-600 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {reportData?.activeReservations || 0} ativas
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-indigo-500" />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Gráficos e Análises */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Vendas por Mês */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Vendas por Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="space-y-4">
                    {reportData?.salesByMonth?.length ? (
                      reportData.salesByMonth.map((data) => (
                        <div key={data.month} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{data.month}</span>
                          <div className="flex items-center space-x-4">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-petrol-500 h-2 rounded-full" 
                                style={{ 
                                  width: `${reportData.salesByMonth.length > 0 ? 
                                    (data.sales / Math.max(...reportData.salesByMonth.map(m => m.sales))) * 100 : 0}%` 
                                }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-16 text-right">
                              {data.sales} vendas
                            </span>
                            <span className="text-sm font-medium w-20 text-right">
                              {formatCurrency(data.revenue)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum dado de vendas encontrado</p>
                        <p className="text-xs mt-1">As vendas aparecerão aqui conforme forem realizadas</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Produtos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Produtos Mais Vendidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reportData?.topProducts?.map((item, index) => (
                      <div key={item.product.id} className="flex items-center space-x-4">
                        <div className="relative">
                          <img 
                            src={item.product.images?.[0] || "https://images.unsplash.com/photo-1586495777744-4413f21062fa"} 
                            alt={item.product.name}
                            className="h-12 w-12 object-cover rounded"
                          />
                          <Badge className="absolute -top-2 -left-2 h-5 w-5 text-xs">
                            {index + 1}
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm truncate">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.sales} vendas • {formatCurrency(item.revenue)}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {formatCurrency(parseFloat(item.product.price))}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}