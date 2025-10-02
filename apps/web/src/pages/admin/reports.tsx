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
  TrendingDown,
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
  FileText,
  Target,
  PieChart,
  Calculator,
  Info
} from "lucide-react";
import { PDFGenerator, formatCurrency } from "@/lib/pdf-utils";
import type { Product, Customer, CreditAccount, Order } from "@shared/schema";

// Type definitions for financial data
type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string;
  createdAt: string;
};

type OrderWithCustomer = Order & {
  customer?: Customer;
};

interface ReportData {
  totalSales: number;
  totalRevenue: number;
  totalProducts: number;
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
  const [dateRange, setDateRange] = useState("30");
  const [activeTab, setActiveTab] = useState("vendas");
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

  const { data: creditAccounts, isLoading: creditAccountsLoading } = useQuery<CreditAccount[]>({
    queryKey: ["/api/admin/credit-accounts"],
    enabled: isAuthenticated,
    refetchInterval: 2000, // Atualizar a cada 2 segundos
    staleTime: 0, // Considerar dados imediatamente desatualizados
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/admin/customers"],
    enabled: isAuthenticated,
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
    enabled: isAuthenticated,
  });

  const { data: orders } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
    enabled: isAuthenticated,
    refetchInterval: 2000, // Atualizar a cada 2 segundos
    staleTime: 0, // Considerar dados imediatamente desatualizados
  });

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/transactions"],
    enabled: isAuthenticated,
  });

  // Combinar dados de pedidos com clientes
  const ordersWithCustomers = (orders?.map(order => {
    const customer = customers?.find((c: Customer) => c.id === order.customerId);
    return {
      ...order,
      customer,
      customerName: order.customerName || customer?.name || null,
      customerPhone: order.customerPhone || customer?.phone || null,
    } as OrderWithCustomer;
  }) || []) as OrderWithCustomer[];

  // Cálculos detalhados por método de pagamento - SINCRONIZADOS COM FINANCEIRO
  const allOrders = ordersWithCustomers || [];
  
  // Total à vista (PIX + Dinheiro + Cartão) - TODOS os pedidos concluídos
  const pixOrdersList = allOrders.filter(order => order.paymentMethod === 'pix' && order.status === 'completed');
  const pixSalesCalculated = pixOrdersList.reduce((sum, order) => sum + parseFloat(order.total?.toString() || '0'), 0);
  
  const cashOrdersList = allOrders.filter(order => 
    (order.paymentMethod === 'cash' || order.paymentMethod === 'dinheiro') && 
    order.status === 'completed'
  );
  const cashSalesCalculated = cashOrdersList.reduce((sum, order) => sum + parseFloat(order.total?.toString() || '0'), 0);
  
  const cardOrdersList = allOrders.filter(order => order.paymentMethod === 'cartao' && order.status === 'completed');
  const cardSalesCalculated = cardOrdersList.reduce((sum, order) => sum + parseFloat(order.total?.toString() || '0'), 0);
  
  const totalCashSalesCalculated = pixSalesCalculated + cashSalesCalculated + cardSalesCalculated;
  
  // Crediário - TODOS os pedidos (MESMO CÁLCULO DA CENTRAL FINANCEIRA)
  const creditOrdersListCalculated = allOrders.filter(order => order.paymentMethod === 'credit');
  const creditSalesCalculated = creditOrdersListCalculated.reduce((sum, order) => sum + parseFloat(order.total?.toString() || '0'), 0);
  
  // Totais consolidados
  const totalRevenueCalculated = totalCashSalesCalculated + creditSalesCalculated;

  // Cálculos para crediário - USANDO CONTAS PARA "A RECEBER"
  const totalAccountsCalculated = creditAccounts?.length || 0;
  const activeAccountsCalculated = creditAccounts?.filter(acc => acc.status === 'active').length || 0;
  const totalPaidCalculated = creditAccounts?.reduce((sum, acc) => sum + parseFloat(acc.paidAmount?.toString() || "0"), 0) || 0;
  const totalPendingCalculated = creditAccounts?.reduce((sum, acc) => sum + parseFloat(acc.remainingAmount?.toString() || "0"), 0) || 0;
  const overdueAccountsCalculated = creditAccounts?.filter(acc => {
    const nextPayment = acc.nextPaymentDate ? new Date(acc.nextPaymentDate) : null;
    return nextPayment && nextPayment < new Date() && acc.status === 'active';
  }).length || 0;

  const paymentRateCalculated = creditSalesCalculated > 0 ? (totalPaidCalculated / creditSalesCalculated) * 100 : 0;
  
  // Ticket médio calculado
  const totalOrdersCount = allOrders.filter(order => order.status === 'completed').length;
  const ticketMedio = totalOrdersCount > 0 ? (totalCashSalesCalculated + creditSalesCalculated) / totalOrdersCount : 0;

  // Função para exportar PDF
  const handleExportPDF = () => {
    try {
      const pdf = new PDFGenerator();
      
      // Cabeçalho
      let yPos = pdf.addHeader(
        'Relatório Financeiro - Mar de Cores',
        `Período: Últimos ${dateRange} dias`
      );
      
      // Métricas principais baseadas na aba ativa
      if (activeTab === 'vendas') {
        const metrics = [
          ['Total Recebido (À Vista)', formatCurrency(totalCashSalesCalculated)],
          ['PIX', formatCurrency(pixSalesCalculated)],
          ['Dinheiro', formatCurrency(cashSalesCalculated)],
          ['Cartão', formatCurrency(cardSalesCalculated)],
          ['A Receber (Crediário)', formatCurrency(totalPendingCalculated)],
          ['Total Geral', formatCurrency(totalCashSalesCalculated + creditSalesCalculated)],
          ['Pedidos À Vista', `${pixOrdersList.length + cashOrdersList.length + cardOrdersList.length}`],
          ['Pedidos Crediário', `${creditOrdersListCalculated.length}`],
          ['Ticket Médio', formatCurrency(ticketMedio)]
        ];
        yPos = pdf.addMetrics(metrics, yPos);
      } else {
        const metrics = [
          ['Total em Crediário', formatCurrency(creditSalesCalculated)],
          ['Já Recebido', formatCurrency(totalPaidCalculated)],
          ['A Receber', formatCurrency(totalPendingCalculated)],
          ['Número de Contas', `${totalAccountsCalculated}`],
          ['Contas Ativas', `${activeAccountsCalculated}`],
          ['Taxa de Pagamento', `${paymentRateCalculated.toFixed(1)}%`]
        ];
        yPos = pdf.addMetrics(metrics, yPos);
        
        // Tabela de contas de crediário
        if (creditAccounts && creditAccounts.length > 0) {
          const tableData = creditAccounts.slice(0, 10).map(account => {
            const customer = customers?.find(c => c.id === account.customerId);
            return [
              customer?.name || 'Cliente não encontrado',
              formatCurrency(parseFloat(account.totalAmount?.toString() || '0')),
              formatCurrency(parseFloat(account.paidAmount?.toString() || '0')),
              formatCurrency(parseFloat(account.remainingAmount?.toString() || '0')),
              account.status === 'active' ? 'Ativa' : 'Inativa'
            ];
          });
          
          yPos = pdf.addTable({
            startY: yPos + 10,
            head: [['Cliente', 'Total', 'Pago', 'Pendente', 'Status']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [15, 118, 110] },
            styles: { fontSize: 9 }
          });
        }
      }
      
      // Gerar nome do arquivo
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const tabName = activeTab === 'vendas' ? 'vendas-unificadas' : 'crediario';
      const filename = `relatorio-${tabName}-${dateStr}.pdf`;
      
      // Salvar PDF
      pdf.save(filename);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
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
              <h1 className="text-3xl font-bold text-petrol-500 dark:text-gold-500 mb-4">
                Relatórios
              </h1>
              <p className="text-muted-foreground mb-2">
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

              <Button 
                onClick={handleExportPDF}
                className="bg-petrol-500 hover:bg-petrol-600 w-full sm:w-auto"
              >
                <FileText className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
          </div>

          {/* Sistema de Abas Simplificado */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                <TabsTrigger value="vendas" className="flex items-center space-x-2 text-sm">
                  <ShoppingCart className="h-4 w-4" />
                  <span>Vendas Unificadas</span>
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
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>{formatCurrency(totalCashSalesCalculated)} recebido</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>{formatCurrency(totalCashSalesCalculated)} total</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>{formatCurrency(totalPaidCalculated)} recebido</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>{formatCurrency(totalPendingCalculated)} a receber</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ABA VENDAS UNIFICADAS */}
            <TabsContent value="vendas" className="space-y-6">
              {/* Resumo de Vendas Unificadas */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-petrol-700 flex items-center mb-4">
                      <DollarSign className="h-5 w-5 mr-2" />
                      Total Recebido
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600 mb-2">
                        {formatCurrency(totalCashSalesCalculated)}
                      </p>
                      <p className="text-sm text-muted-foreground">PIX + Cartão + Dinheiro</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-petrol-700 flex items-center mb-4">
                      <CreditCard className="h-5 w-5 mr-2" />
                      A Receber (Crediário)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-orange-600 mb-2">
                        {formatCurrency(totalPendingCalculated)}
                      </p>
                      <p className="text-sm text-muted-foreground">{totalAccountsCalculated} contas ativas</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-petrol-700 flex items-center mb-4">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Total Geral
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-600 mb-2">
                        {formatCurrency(totalCashSalesCalculated + creditSalesCalculated)}
                      </p>
                      <p className="text-sm text-muted-foreground">Vendas + Crediário</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detalhamento por Método de Pagamento */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-green-600 text-sm font-medium mb-4">PIX</p>
                      <p className="text-xl font-bold text-green-700 mb-2">{formatCurrency(pixSalesCalculated)}</p>
                      <p className="text-green-500 text-xs">{pixOrdersList.length} pedidos</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-emerald-600 text-sm font-medium mb-4">Dinheiro</p>
                      <p className="text-xl font-bold text-emerald-700 mb-2">{formatCurrency(cashSalesCalculated)}</p>
                      <p className="text-emerald-500 text-xs">{cashOrdersList.length} pedidos</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-teal-600 text-sm font-medium mb-4">Cartão</p>
                      <p className="text-xl font-bold text-teal-700 mb-2">{formatCurrency(cardSalesCalculated)}</p>
                      <p className="text-teal-500 text-xs">{cardOrdersList.length} pedidos</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Resumo de Vendas por Tipo */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-petrol-700">Resumo de Vendas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Pedidos à Vista</p>
                      <p className="text-2xl font-bold text-petrol-600">{pixOrdersList.length + cashOrdersList.length + cardOrdersList.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Pedidos Crediário</p>
                      <p className="text-2xl font-bold text-orange-600">{creditOrdersListCalculated.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Total de Pedidos</p>
                      <p className="text-2xl font-bold text-blue-600">{(orders?.length || 0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Ticket Médio</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(ticketMedio)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA CREDIÁRIO */}
            <TabsContent value="crediario" className="space-y-6">
              {/* Resumo do Crediário */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-petrol-700 flex items-center mb-4">
                      <CreditCard className="h-5 w-5 mr-2" />
                      Total em Crediário
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-600 mb-2">
                        {formatCurrency(creditSalesCalculated)}
                      </p>
                      <p className="text-sm text-muted-foreground">{totalAccountsCalculated} contas</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-petrol-700 flex items-center mb-4">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Já Recebido
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600 mb-2">
                        {formatCurrency(totalPaidCalculated)}
                      </p>
                      <p className="text-sm text-muted-foreground">{paymentRateCalculated.toFixed(1)}% quitado</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-petrol-700 flex items-center mb-4">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      A Receber
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-orange-600 mb-2">
                        {formatCurrency(totalPendingCalculated)}
                      </p>
                      <p className="text-sm text-muted-foreground">{overdueAccountsCalculated} vencidas</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Lista de Contas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-petrol-700">Contas de Crediário</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Pago</TableHead>
                          <TableHead>Pendente</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {creditAccounts?.slice(0, 10).map((account) => {
                          const customer = customers?.find(c => c.id === account.customerId);
                          
                          return (
                            <TableRow key={account.id}>
                              <TableCell className="font-medium">
                                {customer?.name || 'Cliente não encontrado'}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(parseFloat(account.totalAmount?.toString() || '0'))}
                              </TableCell>
                              <TableCell className="text-green-600">
                                {formatCurrency(parseFloat(account.paidAmount?.toString() || '0'))}
                              </TableCell>
                              <TableCell className="text-orange-600">
                                {formatCurrency(parseFloat(account.remainingAmount?.toString() || '0'))}
                              </TableCell>
                              <TableCell>
                                <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                                  {account.status === 'active' ? 'Ativa' : 'Inativa'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}