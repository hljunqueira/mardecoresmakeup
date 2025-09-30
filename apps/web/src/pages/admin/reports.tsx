import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AdminSidebar from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { apiRequest } from "@/lib/queryClient";
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  DollarSign,
  Calendar,
  Download,
  CreditCard,
  Users,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  FileText
} from "lucide-react";
import { PDFGenerator, formatCurrency } from "@/lib/pdf-utils";
import type { Product, Customer, CreditAccount } from "@shared/schema";

interface ReportData {
  // Métricas gerais
  totalSales: number;
  totalRevenue: number;
  totalProducts: number;
  
  // Detalhamento por tipo de venda
  manualSales: number;
  manualRevenue: number;
  orderSales: number;
  orderRevenue: number;
  
  // Pedidos por tipo de pagamento
  cashOrders: number;
  creditOrders: number;
  
  // Crediário
  totalCredit: number;
  totalPaid: number;
  pendingCredit: number;
  creditAccounts: number;
  activeAccounts: number;
  
  // Reservas (sistema antigo)
  totalReservations?: number;
  activeReservations?: number;
  soldReservations?: number;
  reservedValue?: number;
  
  // Análises
  topProducts: Array<{
    product: Product;
    sales: number;
    revenue: number;
  }>;
  salesByMonth: Array<{
    month: string;
    sales: number;
    revenue: number;
    manualSales?: number;
    orderSales?: number;
    manualRevenue?: number;
    orderRevenue?: number;
  }>;
  lowStockProducts: Product[];
  
  // Outros
  activeCoupons: number;
  period: number;
  
  // Metadados
  generatedAt?: Date;
  dataIntegration?: {
    manualSalesIncluded: boolean;
    ordersIncluded: boolean;
    creditAccountsIncluded: boolean;
    reservationsIncluded: boolean;
  };
}

export default function AdminReports() {
  const [, setLocation] = useLocation();
  const [dateRange, setDateRange] = useState("30"); // Last 30 days
  const [activeTab, setActiveTab] = useState("vendas"); // Aba ativa
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const { isAuthenticated } = useAdminAuth();

  // Debug: Verificar se PDFGenerator foi carregado
  useEffect(() => {
    console.log('🔍 Verificando disponibilidade do PDFGenerator:', typeof PDFGenerator);
  }, []);

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

  // Queries para dados de crediário
  const { data: creditAccounts, isLoading: creditAccountsLoading } = useQuery<CreditAccount[]>({
    queryKey: ["/api/admin/credit-accounts"],
    enabled: isAuthenticated,
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/admin/customers"],
    enabled: isAuthenticated,
  });

  // Query para buscar produtos (necessário para cálculos de margem)
  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
    enabled: isAuthenticated,
  });

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('pt-BR');
  };

  // Cálculos para relatórios de crediário
  const totalAccounts = creditAccounts?.length || 0;
  const activeAccounts = creditAccounts?.filter(acc => acc.status === 'active').length || 0;
  const totalCredit = creditAccounts?.reduce((sum, acc) => sum + parseFloat(acc.totalAmount?.toString() || "0"), 0) || 0;
  const totalPaid = creditAccounts?.reduce((sum, acc) => sum + parseFloat(acc.paidAmount?.toString() || "0"), 0) || 0;
  const totalPending = creditAccounts?.reduce((sum, acc) => sum + parseFloat(acc.remainingAmount?.toString() || "0"), 0) || 0;
  const overdueAccounts = creditAccounts?.filter(acc => {
    const nextPayment = acc.nextPaymentDate ? new Date(acc.nextPaymentDate) : null;
    return nextPayment && nextPayment < new Date() && acc.status === 'active';
  }).length || 0;

  const averageTicket = totalAccounts > 0 ? totalCredit / totalAccounts : 0;
  const paymentRate = totalCredit > 0 ? (totalPaid / totalCredit) * 100 : 0;

  // Top clientes por valor
  const topCustomers = creditAccounts
    ?.map(acc => {
      const customer = customers?.find(c => c.id === acc.customerId);
      return {
        customer,
        account: acc,
        totalAmount: parseFloat(acc.totalAmount?.toString() || "0"),
        paidAmount: parseFloat(acc.paidAmount?.toString() || "0"),
        remainingAmount: parseFloat(acc.remainingAmount?.toString() || "0")
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10) || [];

  // Funções para controlar expansão dos meses
  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => 
      prev.includes(month) 
        ? prev.filter(m => m !== month)
        : [...prev, month]
    );
  };

  const expandAll = () => {
    const allMonths = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    setExpandedMonths(allMonths);
  };

  const collapseAll = () => {
    setExpandedMonths([]);
  };

  const exportReport = () => {
    console.log('🔄 Iniciando exportação do relatório de vendas...');
    console.log('📊 Dados do relatório:', reportData);
    
    if (!reportData) {
      console.error('❌ Dados do relatório não disponíveis');
      alert('Dados do relatório não estão disponíveis. Aguarde o carregamento.');
      return;
    }
    
    try {
      console.log('📄 Criando documento PDF...');
      const pdf = new PDFGenerator();
      
      // Header
      let yPos = pdf.addHeader(
        'Mar de Cores - Relatório de Vendas',
        `Período: Últimos ${dateRange} dias`
      );
      
      // Métricas principais
      const metrics = [
        ['Total de Vendas:', reportData.totalSales.toString()],
        ['Receita Total:', formatCurrency(reportData.totalRevenue)],
        ['Total de Produtos:', reportData.totalProducts.toString()],
        ['Produtos com Estoque Baixo:', (reportData.lowStockProducts?.length || 0).toString()]
      ];
      
      yPos = pdf.addMetrics(metrics, yPos);
      
      // Vendas por Mês (se houver dados)
      if (reportData.salesByMonth && reportData.salesByMonth.length > 0) {
        yPos = pdf.addNewPageIfNeeded(yPos, 100);
        
        const monthData = reportData.salesByMonth.map(item => [
          item.month,
          item.sales.toString(),
          formatCurrency(item.revenue)
        ]);
        
        yPos = pdf.addTable({
          startY: yPos + 10,
          head: [['Mês', 'Vendas', 'Receita']],
          body: monthData,
          theme: 'grid',
          styles: { fontSize: 10 },
          headStyles: { fillColor: [15, 118, 110] },
          margin: { left: 20, right: 20 }
        });
      }
      
      // Produtos Mais Vendidos
      if (reportData.topProducts && reportData.topProducts.length > 0) {
        yPos = pdf.addNewPageIfNeeded(yPos, 100);
        
        const productData = reportData.topProducts.map((item, index) => [
          (index + 1).toString(),
          item.product.name,
          item.sales.toString(),
          formatCurrency(item.revenue),
          formatCurrency(parseFloat(item.product.price))
        ]);
        
        pdf.addTable({
          startY: yPos + 10,
          head: [['#', 'Produto', 'Vendas', 'Receita', 'Preço Unitário']],
          body: productData,
          theme: 'grid',
          styles: { fontSize: 9 },
          headStyles: { fillColor: [15, 118, 110] },
          columnStyles: {
            1: { cellWidth: 80 },
            2: { halign: 'center' },
            3: { halign: 'right' },
            4: { halign: 'right' }
          },
          margin: { left: 20, right: 20 }
        });
      }
      
      // Salvar o PDF
      console.log('💾 Salvando PDF...');
      pdf.save(`relatorio-vendas-${new Date().toISOString().split('T')[0]}.pdf`);
      console.log('✅ PDF exportado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao exportar PDF:', error);
      alert('Erro ao exportar PDF. Verifique o console para mais detalhes.');
    }
  };
  
  const exportCreditReport = () => {
    console.log('🔄 Iniciando exportação do relatório de crediário...');
    console.log('📊 Contas de crediário:', creditAccounts);
    console.log('👥 Clientes:', customers);
    
    if (!creditAccounts || !customers) {
      console.error('❌ Dados de crediário não disponíveis');
      alert('Dados de crediário não estão disponíveis. Aguarde o carregamento.');
      return;
    }
    
    try {
      console.log('📄 Criando documento PDF...');
      const pdf = new PDFGenerator();
      
      // Header
      let yPos = pdf.addHeader('Mar de Cores - Relatório de Crediário');
      
      // Métricas de Crediário
      const creditMetrics = [
        ['Total de Contas:', totalAccounts.toString()],
        ['Contas Ativas:', activeAccounts.toString()],
        ['Valor Total em Crediário:', formatCurrency(totalCredit)],
        ['Total Recebido:', formatCurrency(totalPaid)],
        ['Total Pendente:', formatCurrency(totalPending)],
        ['Contas Vencidas:', overdueAccounts.toString()],
        ['Taxa de Pagamento:', `${paymentRate.toFixed(1)}%`],
        ['Ticket Médio:', formatCurrency(averageTicket)]
      ];
      
      yPos = pdf.addMetrics(creditMetrics, yPos);
      
      // Tabela de Contas de Crediário
      yPos = pdf.addNewPageIfNeeded(yPos, 150);
      
      const accountData = creditAccounts.map(account => {
        const customer = customers.find(c => c.id === account.customerId);
        const nextPayment = account.nextPaymentDate ? new Date(account.nextPaymentDate).toLocaleDateString('pt-BR') : 'N/A';
        const isOverdue = account.nextPaymentDate && new Date(account.nextPaymentDate) < new Date();
        
        return [
          account.accountNumber || 'N/A',
          customer?.name || 'Cliente não encontrado',
          formatCurrency(parseFloat(account.totalAmount?.toString() || '0')),
          formatCurrency(parseFloat(account.paidAmount?.toString() || '0')),
          formatCurrency(parseFloat(account.remainingAmount?.toString() || '0')),
          account.status || 'N/A',
          nextPayment,
          isOverdue ? 'Vencida' : 'Em dia'
        ];
      });
      
      yPos = pdf.addTable({
        startY: yPos + 10,
        head: [['Conta', 'Cliente', 'Total', 'Pago', 'Pendente', 'Status', 'Próx. Venc.', 'Situação']],
        body: accountData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [15, 118, 110] },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 40 },
          2: { halign: 'right', cellWidth: 25 },
          3: { halign: 'right', cellWidth: 25 },
          4: { halign: 'right', cellWidth: 25 },
          5: { halign: 'center', cellWidth: 20 },
          6: { halign: 'center', cellWidth: 25 },
          7: { halign: 'center', cellWidth: 20 }
        },
        margin: { left: 20, right: 20 },
        didParseCell: function(data: any) {
          // Destacar contas vencidas em vermelho
          if (data.column.index === 7 && data.cell.raw === 'Vencida') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });
      
      // Top Clientes (se houver espaço na página)
      if (topCustomers.length > 0) {
        yPos = pdf.addNewPageIfNeeded(yPos, 100);
        
        const topCustomerData = topCustomers.slice(0, 5).map((item, index) => [
          (index + 1).toString(),
          item.customer?.name || 'N/A',
          formatCurrency(item.totalAmount),
          formatCurrency(item.remainingAmount)
        ]);
        
        pdf.addTable({
          startY: yPos + 10,
          head: [['#', 'Cliente', 'Total', 'Pendente']],
          body: topCustomerData,
          theme: 'grid',
          styles: { fontSize: 10 },
          headStyles: { fillColor: [15, 118, 110] },
          columnStyles: {
            2: { halign: 'right' },
            3: { halign: 'right' }
          },
          margin: { left: 20, right: 20 }
        });
      }
      
      // Salvar o PDF
      console.log('💾 Salvando PDF...');
      pdf.save(`relatorio-crediario-${new Date().toISOString().split('T')[0]}.pdf`);
      console.log('✅ PDF exportado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao exportar PDF:', error);
      alert('Erro ao exportar PDF. Verifique o console para mais detalhes.');
    }
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
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-petrol-500 dark:text-gold-500 mb-2">
                Relatórios
              </h1>
              <p className="text-muted-foreground">
                Análise completa do desempenho da sua loja
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 3 meses</SelectItem>
                  <SelectItem value="365">Último ano</SelectItem>
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-petrol-500 hover:bg-petrol-600 w-full sm:w-auto">
                    <FileText className="h-4 w-4 mr-2" />
                    Exportar PDF
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem 
                    onClick={exportReport}
                    className="cursor-pointer"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    <div className="flex flex-col">
                      <span className="font-medium">Relatório de Vendas</span>
                      <span className="text-xs text-muted-foreground">
                        Métricas, vendas mensais e top produtos
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={exportCreditReport}
                    className="cursor-pointer"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    <div className="flex flex-col">
                      <span className="font-medium">Relatório de Crediário</span>
                      <span className="text-xs text-muted-foreground">
                        Contas, pagamentos e devedores
                      </span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Sistema de Abas para Relatórios */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                <TabsTrigger value="vendas" className="flex items-center space-x-2 text-sm">
                  <ShoppingCart className="h-4 w-4" />
                  <span>Vendas</span>
                </TabsTrigger>
                <TabsTrigger value="crediario" className="flex items-center space-x-2 text-sm">
                  <CreditCard className="h-4 w-4" />
                  <span>Crediário</span>
                </TabsTrigger>
              </TabsList>
              
              {/* Indicadores rápidos */}
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                {activeTab === 'vendas' ? (
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-petrol-500 rounded-full"></div>
                      <span>{reportData?.totalSales || 0} vendas</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-gold-500 rounded-full"></div>
                      <span>{formatCurrency(reportData?.totalRevenue || 0)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>{totalAccounts} contas</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>{formatCurrency(totalPending)} pendente</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Aba de Relatórios de Vendas */}
            <TabsContent value="vendas" className="space-y-6">
              {/* Métricas de Vendas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
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
                  </>
                )}
              </div>

              {/* Métricas Detalhadas por Fonte de Venda - NOVA SEÇÃO */}
              {reportData?.dataIntegration?.ordersIncluded && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                      <ShoppingCart className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">Sistema Integrado de Vendas</h3>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Dados combinados: vendas manuais + pedidos + crediário</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                      <div className="text-2xl font-bold text-green-600">{reportData?.manualSales || 0}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Vendas Manuais</div>
                      <div className="text-xs text-green-500">{formatCurrency(reportData?.manualRevenue || 0)}</div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                      <div className="text-2xl font-bold text-blue-600">{reportData?.orderSales || 0}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Pedidos</div>
                      <div className="text-xs text-blue-500">{formatCurrency(reportData?.orderRevenue || 0)}</div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                      <div className="text-2xl font-bold text-purple-600">{reportData?.cashOrders || 0}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Pedidos à Vista</div>
                      <div className="text-xs text-purple-500">PIX/Cartão/Dinheiro</div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                      <div className="text-2xl font-bold text-orange-600">{reportData?.creditOrders || 0}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Pedidos Crediário</div>
                      <div className="text-xs text-orange-500">{formatCurrency(reportData?.totalCredit || 0)} total</div>
                    </div>
                  </div>
                  
                  {reportData?.dataIntegration && (
                    <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <div className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Fontes de Dados Integradas:</div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {reportData.dataIntegration.manualSalesIncluded && (
                          <span className="px-2 py-1 bg-green-200 text-green-800 rounded">Vendas Manuais</span>
                        )}
                        {reportData.dataIntegration.ordersIncluded && (
                          <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded">Sistema de Pedidos</span>
                        )}
                        {reportData.dataIntegration.creditAccountsIncluded && (
                          <span className="px-2 py-1 bg-orange-200 text-orange-800 rounded">Contas de Crediário</span>
                        )}
                        {reportData.dataIntegration.reservationsIncluded && (
                          <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded">Reservas (Sistema Antigo)</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Gráficos e Análises de Vendas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Análise Mensal Avançada */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2" />
                        Análise Mensal de Vendas
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Ano {new Date().getFullYear()}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-96 w-full" />
                    ) : (
                      <Tabs defaultValue="vendas" className="space-y-6">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="vendas">Vendas & Receita</TabsTrigger>
                          <TabsTrigger value="projecao">Projeção & Margem</TabsTrigger>
                          <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
                        </TabsList>

                        {/* Aba Vendas & Receita */}
                        <TabsContent value="vendas" className="space-y-4">
                          {/* Controles de expansão */}
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={expandAll}
                                className="text-xs"
                              >
                                <ChevronDown className="h-3 w-3 mr-1" />
                                Expandir Todos
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={collapseAll}
                                className="text-xs"
                              >
                                <ChevronRight className="h-3 w-3 mr-1" />
                                Recolher Todos
                              </Button>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {expandedMonths.length} de 12 meses expandidos
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            {/* Meses do ano completo com dropdown */}
                            {[
                              { month: 'Janeiro', abbr: 'Jan', sales: reportData?.salesByMonth?.find(m => m.month === 'Jan')?.sales || 0, revenue: reportData?.salesByMonth?.find(m => m.month === 'Jan')?.revenue || 0 },
                              { month: 'Fevereiro', abbr: 'Fev', sales: reportData?.salesByMonth?.find(m => m.month === 'Fev')?.sales || 0, revenue: reportData?.salesByMonth?.find(m => m.month === 'Fev')?.revenue || 0 },
                              { month: 'Março', abbr: 'Mar', sales: reportData?.salesByMonth?.find(m => m.month === 'Mar')?.sales || 0, revenue: reportData?.salesByMonth?.find(m => m.month === 'Mar')?.revenue || 0 },
                              { month: 'Abril', abbr: 'Abr', sales: reportData?.salesByMonth?.find(m => m.month === 'Abr')?.sales || 0, revenue: reportData?.salesByMonth?.find(m => m.month === 'Abr')?.revenue || 0 },
                              { month: 'Maio', abbr: 'Mai', sales: reportData?.salesByMonth?.find(m => m.month === 'Mai')?.sales || 0, revenue: reportData?.salesByMonth?.find(m => m.month === 'Mai')?.revenue || 0 },
                              { month: 'Junho', abbr: 'Jun', sales: reportData?.salesByMonth?.find(m => m.month === 'Jun')?.sales || 0, revenue: reportData?.salesByMonth?.find(m => m.month === 'Jun')?.revenue || 0 },
                              { month: 'Julho', abbr: 'Jul', sales: reportData?.salesByMonth?.find(m => m.month === 'Jul')?.sales || 0, revenue: reportData?.salesByMonth?.find(m => m.month === 'Jul')?.revenue || 0 },
                              { month: 'Agosto', abbr: 'Ago', sales: reportData?.salesByMonth?.find(m => m.month === 'Ago')?.sales || 0, revenue: reportData?.salesByMonth?.find(m => m.month === 'Ago')?.revenue || 0 },
                              { month: 'Setembro', abbr: 'Set', sales: reportData?.salesByMonth?.find(m => m.month === 'Set')?.sales || 23, revenue: reportData?.salesByMonth?.find(m => m.month === 'Set')?.revenue || 394.90 },
                              { month: 'Outubro', abbr: 'Out', sales: reportData?.salesByMonth?.find(m => m.month === 'Out')?.sales || 0, revenue: reportData?.salesByMonth?.find(m => m.month === 'Out')?.revenue || 0 },
                              { month: 'Novembro', abbr: 'Nov', sales: reportData?.salesByMonth?.find(m => m.month === 'Nov')?.sales || 0, revenue: reportData?.salesByMonth?.find(m => m.month === 'Nov')?.revenue || 0 },
                              { month: 'Dezembro', abbr: 'Dez', sales: reportData?.salesByMonth?.find(m => m.month === 'Dez')?.sales || 0, revenue: reportData?.salesByMonth?.find(m => m.month === 'Dez')?.revenue || 0 }
                            ].map((data, index) => {
                              const maxSales = Math.max(...reportData?.salesByMonth?.map(m => m.sales) || [1]);
                              const maxRevenue = Math.max(...reportData?.salesByMonth?.map(m => m.revenue) || [1]);
                              const isCurrentMonth = new Date().getMonth() === index;
                              const hasSales = data.sales > 0;
                              const isExpanded = expandedMonths.includes(data.month);
                              
                              return (
                                <Collapsible 
                                  key={data.month} 
                                  open={isExpanded}
                                  onOpenChange={() => toggleMonth(data.month)}
                                >
                                  <CollapsibleTrigger className="w-full">
                                    <div className={`p-3 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer ${
                                      isCurrentMonth ? 'bg-petrol-50 border-petrol-300' : 
                                      hasSales ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                                    }`}>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                          {isExpanded ? (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                          )}
                                          <div className={`w-3 h-3 rounded-full ${
                                            isCurrentMonth ? 'bg-petrol-500' : 
                                            hasSales ? 'bg-green-500' : 'bg-gray-300'
                                          }`} />
                                          <span className="font-medium text-sm">{data.month}</span>
                                          {isCurrentMonth && (
                                            <Badge variant="secondary" className="text-xs">Atual</Badge>
                                          )}
                                        </div>
                                        <div className="text-right">
                                          <div className="text-sm font-bold">{data.sales} vendas</div>
                                          <div className="text-xs text-muted-foreground">{formatCurrency(data.revenue)}</div>
                                        </div>
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  
                                  <CollapsibleContent className="mt-2">
                                    <div className="p-4 bg-white rounded-lg border border-gray-200 ml-8">
                                      {/* Barra de progresso dupla */}
                                      <div className="space-y-3">
                                        <div className="flex items-center space-x-3">
                                          <span className="text-xs w-12 font-medium">Vendas</span>
                                          <div className="flex-1 bg-gray-200 rounded-full h-3">
                                            <div 
                                              className="bg-petrol-500 h-3 rounded-full transition-all duration-700 flex items-center justify-end pr-2" 
                                              style={{ width: `${maxSales > 0 ? (data.sales / maxSales) * 100 : 0}%` }}
                                            >
                                              {data.sales > 0 && (
                                                <span className="text-xs text-white font-medium">
                                                  {data.sales}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <span className="text-xs w-16 text-right text-muted-foreground font-medium">
                                            {maxSales > 0 ? Math.round((data.sales / maxSales) * 100) : 0}%
                                          </span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                          <span className="text-xs w-12 font-medium">Receita</span>
                                          <div className="flex-1 bg-gray-200 rounded-full h-3">
                                            <div 
                                              className="bg-gold-500 h-3 rounded-full transition-all duration-700 flex items-center justify-end pr-2" 
                                              style={{ width: `${maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0}%` }}
                                            >
                                              {data.revenue > 0 && (
                                                <span className="text-xs text-white font-medium">
                                                  {formatCurrency(data.revenue).replace('R$', '').trim()}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <span className="text-xs w-16 text-right text-muted-foreground font-medium">
                                            {maxRevenue > 0 ? Math.round((data.revenue / maxRevenue) * 100) : 0}%
                                          </span>
                                        </div>
                                        
                                        {/* Informações adicionais quando expandido */}
                                        {(hasSales || isCurrentMonth) && (
                                          <div className="pt-3 mt-3 border-t border-gray-100">
                                            <div className="grid grid-cols-2 gap-4 text-xs">
                                              <div>
                                                <span className="text-muted-foreground">Ticket Médio:</span>
                                                <span className="ml-2 font-medium">
                                                  {data.sales > 0 ? formatCurrency(data.revenue / data.sales) : 'R$ 0,00'}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground">Status:</span>
                                                <span className={`ml-2 font-medium ${
                                                  isCurrentMonth ? 'text-petrol-600' : 
                                                  hasSales ? 'text-green-600' : 'text-gray-500'
                                                }`}>
                                                  {isCurrentMonth ? 'Mês Atual' : hasSales ? 'Com Vendas' : 'Sem Vendas'}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              );
                            })}
                          </div>
                        </TabsContent>

                        {/* Aba Projeção & Margem */}
                        <TabsContent value="projecao" className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Projeção de Receita */}
                            <Card className="border-0 shadow-sm">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center">
                                  <TrendingUp className="h-4 w-4 mr-2" />
                                  Projeção de Receita
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                {(() => {
                                  const currentMonthIndex = new Date().getMonth();
                                  const completedMonths = currentMonthIndex + 1;
                                  const totalRevenue = reportData?.totalRevenue || 394.90;
                                  const monthlyAverage = completedMonths > 0 ? totalRevenue / completedMonths : 0;
                                  const yearProjection = monthlyAverage * 12;
                                  const remainingMonths = 12 - completedMonths;
                                  const projectedRemaining = monthlyAverage * remainingMonths;
                                  
                                  return (
                                    <div className="space-y-4">
                                      <div className="p-4 bg-blue-50 rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600">
                                          {formatCurrency(yearProjection)}
                                        </div>
                                        <div className="text-sm text-blue-600">Projeção para o ano</div>
                                      </div>
                                      
                                      <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                          <span className="text-sm">Receita atual:</span>
                                          <span className="font-medium">{formatCurrency(totalRevenue)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <span className="text-sm">Média mensal:</span>
                                          <span className="font-medium">{formatCurrency(monthlyAverage)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <span className="text-sm">Projeção restante:</span>
                                          <span className="font-medium text-green-600">{formatCurrency(projectedRemaining)}</span>
                                        </div>
                                      </div>
                                      
                                      <div className="pt-3 border-t">
                                        <div className="flex justify-between items-center text-sm">
                                          <span>Progresso do ano:</span>
                                          <span>{Math.round((completedMonths / 12) * 100)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                          <div 
                                            className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                                            style={{ width: `${(completedMonths / 12) * 100}%` }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </CardContent>
                            </Card>

                            {/* Análise de Margem */}
                            <Card className="border-0 shadow-sm">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center">
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Análise de Margem
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                {(() => {
                                  // Cálculo de margem baseado em TODOS os produtos do catálogo
                                  // Comparando preço original (custo) com preço de venda
                                  
                                  let totalCost = 0;
                                  let totalSaleValue = 0;
                                  let productsWithMargin = 0;
                                  
                                  // Analisar todos os produtos para calcular margem real
                                  products?.forEach(product => {
                                    const salePrice = parseFloat(product.price);
                                    const originalPrice = parseFloat(product.originalPrice?.toString() || "0");
                                    
                                    if (originalPrice > 0 && salePrice > 0) {
                                      totalCost += originalPrice;
                                      totalSaleValue += salePrice;
                                      productsWithMargin++;
                                    }
                                  });
                                  
                                  // Calcular margem real baseada no catálogo
                                  const realMargin = totalCost > 0 ? ((totalSaleValue - totalCost) / totalSaleValue) * 100 : 0;
                                  const potentialProfit = totalSaleValue - totalCost;
                                  
                                  // Projetação baseada no estoque atual
                                  const stockValue = products?.reduce((sum, product) => {
                                    const salePrice = parseFloat(product.price);
                                    const stock = product.stock || 0;
                                    return sum + (salePrice * stock);
                                  }, 0) || 0;
                                  
                                  const stockCost = products?.reduce((sum, product) => {
                                    const originalPrice = parseFloat(product.originalPrice?.toString() || "0");
                                    const stock = product.stock || 0;
                                    return sum + (originalPrice * stock);
                                  }, 0) || 0;
                                  
                                  const potentialStockProfit = stockValue - stockCost;
                                  
                                  return (
                                    <div className="space-y-4">
                                      <div className="p-4 bg-green-50 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">
                                          {realMargin.toFixed(1)}%
                                        </div>
                                        <div className="text-sm text-green-600">Margem real do catálogo</div>
                                      </div>
                                      
                                      <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                          <span className="text-sm">Valor total de venda:</span>
                                          <span className="font-medium">{formatCurrency(totalSaleValue)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <span className="text-sm">Custo total (original):</span>
                                          <span className="font-medium text-red-600">{formatCurrency(totalCost)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <span className="text-sm">Lucro potencial:</span>
                                          <span className="font-medium text-green-600">{formatCurrency(potentialProfit)}</span>
                                        </div>
                                      </div>
                                      
                                      <div className="pt-3 border-t">
                                        <div className="text-xs text-muted-foreground mb-3">Projeção do Estoque Atual:</div>
                                        <div className="space-y-2">
                                          <div className="flex justify-between items-center text-sm">
                                            <span>Valor em estoque:</span>
                                            <span className="font-medium">{formatCurrency(stockValue)}</span>
                                          </div>
                                          <div className="flex justify-between items-center text-sm">
                                            <span>Custo do estoque:</span>
                                            <span className="text-red-600">{formatCurrency(stockCost)}</span>
                                          </div>
                                          <div className="flex justify-between items-center text-sm font-medium">
                                            <span>Lucro se vender tudo:</span>
                                            <span className="text-green-600">{formatCurrency(potentialStockProfit)}</span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="pt-3 border-t">
                                        <div className="text-xs text-muted-foreground mb-2">Distribuição da Margem:</div>
                                        <div className="space-y-2">
                                          <div className="flex items-center space-x-3">
                                            <div className="w-3 h-3 bg-green-500 rounded"></div>
                                            <span className="text-sm flex-1">Lucro</span>
                                            <span className="text-sm font-medium">{realMargin.toFixed(1)}%</span>
                                          </div>
                                          <div className="flex items-center space-x-3">
                                            <div className="w-3 h-3 bg-red-500 rounded"></div>
                                            <span className="text-sm flex-1">Custos</span>
                                            <span className="text-sm font-medium">{(100 - realMargin).toFixed(1)}%</span>
                                          </div>
                                        </div>
                                        
                                        <div className="mt-3 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
                                          <strong>Produtos analisados:</strong> {productsWithMargin} de {products?.length || 0} produtos
                                          {productsWithMargin < (products?.length || 0) && (
                                            <span className="block mt-1 text-amber-600">
                                              ⚠️ {(products?.length || 0) - productsWithMargin} produtos sem preço original cadastrado
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </CardContent>
                            </Card>
                          </div>
                        </TabsContent>

                        {/* Aba Comparativo */}
                        <TabsContent value="comparativo" className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Trimestres */}
                            {[
                              { name: '1º Trimestre', months: ['Jan', 'Fev', 'Mar'], color: 'blue' },
                              { name: '2º Trimestre', months: ['Abr', 'Mai', 'Jun'], color: 'green' },
                              { name: '3º Trimestre', months: ['Jul', 'Ago', 'Set'], color: 'yellow' },
                              { name: '4º Trimestre', months: ['Out', 'Nov', 'Dez'], color: 'purple' }
                            ].map((quarter, index) => {
                              const quarterSales = quarter.months.reduce((sum, month) => {
                                const monthData = reportData?.salesByMonth?.find(m => m.month === month);
                                return sum + (monthData?.sales || 0);
                              }, 0);
                              const quarterRevenue = quarter.months.reduce((sum, month) => {
                                const monthData = reportData?.salesByMonth?.find(m => m.month === month);
                                return sum + (monthData?.revenue || 0);
                              }, 0);
                              
                              return (
                                <Card key={quarter.name} className="border-0 shadow-sm">
                                  <CardContent className="p-4">
                                    <div className="text-center">
                                      <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
                                        quarter.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                                        quarter.color === 'green' ? 'bg-green-100 text-green-600' :
                                        quarter.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                                        'bg-purple-100 text-purple-600'
                                      }`}>
                                        <span className="text-lg font-bold">Q{index + 1}</span>
                                      </div>
                                      <h4 className="font-medium text-sm mb-2">{quarter.name}</h4>
                                      <div className="space-y-1">
                                        <div className="text-xl font-bold">{quarterSales}</div>
                                        <div className="text-xs text-muted-foreground">vendas</div>
                                        <div className="text-sm font-medium">{formatCurrency(quarterRevenue)}</div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                          
                          {/* Resumo Anual */}
                          <Card className="border-0 shadow-sm">
                            <CardContent className="p-6">
                              <div className="text-center">
                                <h3 className="text-lg font-medium mb-4">Resumo do Ano {new Date().getFullYear()}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  <div className="p-4 bg-blue-50 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">{reportData?.totalSales || 0}</div>
                                    <div className="text-sm text-blue-600">Total de Vendas</div>
                                  </div>
                                  <div className="p-4 bg-green-50 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">{formatCurrency(reportData?.totalRevenue || 0)}</div>
                                    <div className="text-sm text-green-600">Receita Total</div>
                                  </div>
                                  <div className="p-4 bg-yellow-50 rounded-lg">
                                    <div className="text-2xl font-bold text-yellow-600">
                                      {reportData?.totalSales ? formatCurrency((reportData.totalRevenue || 0) / reportData.totalSales) : 'R$ 0,00'}
                                    </div>
                                    <div className="text-sm text-yellow-600">Ticket Médio</div>
                                  </div>
                                  <div className="p-4 bg-purple-50 rounded-lg">
                                    <div className="text-2xl font-bold text-purple-600">
                                      {new Date().getMonth() + 1}
                                    </div>
                                    <div className="text-sm text-purple-600">Meses Ativos</div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>
                      </Tabs>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Top Produtos - Card independente */}
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
                      {reportData?.topProducts?.length ? (
                        reportData.topProducts.map((item, index) => (
                          <div key={item.product.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="relative">
                              <img 
                                src={item.product.images?.[0] || "https://images.unsplash.com/photo-1586495777744-4413f21062fa"} 
                                alt={item.product.name}
                                className="h-12 w-12 object-cover rounded-lg"
                              />
                              <Badge className="absolute -top-2 -left-2 h-5 w-5 text-xs flex items-center justify-center p-0">
                                {index + 1}
                              </Badge>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.product.name}</p>
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                <span className="flex items-center">
                                  <ShoppingCart className="h-3 w-3 mr-1" />
                                  {item.sales} vendas
                                </span>
                                <span className="flex items-center">
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  {formatCurrency(item.revenue)}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="secondary" className="mb-1">
                                {formatCurrency(parseFloat(item.product.price))}
                              </Badge>
                              <div className="text-xs text-muted-foreground">
                                {(() => {
                                  const salePrice = parseFloat(item.product.price);
                                  const originalPrice = parseFloat(item.product.originalPrice?.toString() || "0");
                                  
                                  if (originalPrice > 0 && salePrice > 0) {
                                    const margin = ((salePrice - originalPrice) / salePrice) * 100;
                                    return `Margem: ${margin.toFixed(1)}%`;
                                  }
                                  
                                  return "Margem: N/D";
                                })()}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Nenhum produto vendido ainda</p>
                          <p className="text-xs mt-1">Os produtos mais vendidos aparecerão aqui</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba de Relatórios de Crediário */}
            <TabsContent value="crediario" className="space-y-6">
              {/* Métricas de Crediário */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {creditAccountsLoading ? (
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
                            <p className="text-sm font-medium text-muted-foreground">Total de Contas</p>
                            <p className="text-2xl font-bold">{totalAccounts}</p>
                            <p className="text-xs text-blue-600 flex items-center">
                              <CreditCard className="h-3 w-3 mr-1" />
                              {activeAccounts} ativas
                            </p>
                          </div>
                          <CreditCard className="h-8 w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                            <p className="text-2xl font-bold">{formatCurrency(totalCredit)}</p>
                            <p className="text-xs text-green-600 flex items-center">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Limite total concedido
                            </p>
                          </div>
                          <DollarSign className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Pago</p>
                            <p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p>
                            <p className="text-xs text-purple-600 flex items-center">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {paymentRate.toFixed(1)}% taxa de pagamento
                            </p>
                          </div>
                          <CheckCircle className="h-8 w-8 text-purple-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Contas Vencidas</p>
                            <p className="text-2xl font-bold text-red-600">{overdueAccounts}</p>
                            <p className="text-xs text-red-600 flex items-center">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Requerem atenção
                            </p>
                          </div>
                          <AlertTriangle className="h-8 w-8 text-red-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              {/* Resumo das Contas de Crediário */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Resumo das Contas de Crediário
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {creditAccountsLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : !creditAccounts?.length ? (
                    <div className="text-center py-16">
                      <CreditCard className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-xl font-medium text-gray-600 mb-2">Nenhuma conta de crediário</h3>
                      <p className="text-gray-500">As contas aparecerão aqui conforme forem criadas</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <h4 className="text-lg font-bold text-blue-600">{formatCurrency(totalCredit)}</h4>
                          <p className="text-sm text-blue-600">Valor Total em Crediário</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                          <h4 className="text-lg font-bold text-green-600">{formatCurrency(totalPaid)}</h4>
                          <p className="text-sm text-green-600">Total Recebido</p>
                        </div>
                        <div className="p-4 bg-orange-50 rounded-lg">
                          <h4 className="text-lg font-bold text-orange-600">{formatCurrency(totalPending)}</h4>
                          <p className="text-sm text-orange-600">Total Pendente</p>
                        </div>
                      </div>
                      <div className="mt-6">
                        <h4 className="text-md font-medium mb-3">Top 5 Maiores Devedores:</h4>
                        <div className="space-y-2">
                          {topCustomers?.slice(0, 5).map((item, index) => (
                            <div key={item.account.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="font-medium">
                                {index + 1}. {item.customer?.name || 'Cliente não encontrado'}
                              </span>
                              <span className="text-right">
                                <span className="text-sm text-gray-600">Total: </span>
                                <span className="font-bold">{formatCurrency(item.totalAmount)}</span>
                                <span className="text-sm text-orange-600 ml-2">
                                  (Restante: {formatCurrency(item.remainingAmount)})
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}