import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Download, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  BarChart3
} from "lucide-react";
import type { CreditAccount, Customer } from "@shared/schema";

interface CreditReportsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreditReportsDialog({ isOpen, onOpenChange }: CreditReportsDialogProps) {
  const [dateRange, setDateRange] = useState("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportType, setReportType] = useState("overview");

  const { data: creditAccounts, isLoading: accountsLoading } = useQuery<CreditAccount[]>({
    queryKey: ["/api/admin/credit-accounts"],
    enabled: isOpen,
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/admin/customers"],
    enabled: isOpen,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('pt-BR');
  };

  // Cálculos para relatórios
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

  const exportReport = (format: 'csv' | 'pdf') => {
    // TODO: Implementar export real
    alert(`Exportando relatório em formato ${format.toUpperCase()}...`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" aria-describedby="credit-reports-description">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-2xl font-bold text-petrol-700 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            Relatórios de Crediário
          </DialogTitle>
          <DialogDescription id="credit-reports-description">
            Visualize relatórios detalhados das contas de crediário, incluindo resumos financeiros e análises de clientes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filtros */}
          <Card className="border-petrol-200">
            <CardHeader>
              <CardTitle className="text-lg text-petrol-700">Filtros do Relatório</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Período</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Última Semana</SelectItem>
                      <SelectItem value="month">Último Mês</SelectItem>
                      <SelectItem value="quarter">Último Trimestre</SelectItem>
                      <SelectItem value="year">Último Ano</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {dateRange === "custom" && (
                  <>
                    <div>
                      <Label>Data Inicial</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Data Final</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </>
                )}
                <div>
                  <Label>Tipo de Relatório</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overview">Visão Geral</SelectItem>
                      <SelectItem value="customers">Por Cliente</SelectItem>
                      <SelectItem value="payments">Pagamentos</SelectItem>
                      <SelectItem value="overdue">Contas Vencidas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="summary" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Resumo</TabsTrigger>
              <TabsTrigger value="details">Detalhado</TabsTrigger>
              <TabsTrigger value="customers">Clientes</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Aba Resumo */}
            <TabsContent value="summary" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">Total de Contas</p>
                        <p className="text-2xl font-bold">{totalAccounts}</p>
                      </div>
                      <CreditCard className="h-8 w-8 text-blue-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm">Contas Ativas</p>
                        <p className="text-2xl font-bold">{activeAccounts}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm">Valor Total</p>
                        <p className="text-xl font-bold">{formatCurrency(totalCredit)}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-orange-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-red-100 text-sm">Contas Vencidas</p>
                        <p className="text-2xl font-bold">{overdueAccounts}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-200" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Métricas Adicionais */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-gray-600 text-sm">Valor Pendente</p>
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalPending)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-gray-600 text-sm">Ticket Médio</p>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(averageTicket)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-gray-600 text-sm">Taxa de Pagamento</p>
                      <p className="text-2xl font-bold text-green-600">{paymentRate.toFixed(1)}%</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Aba Detalhada */}
            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Todas as Contas de Crediário</CardTitle>
                </CardHeader>
                <CardContent>
                  {accountsLoading ? (
                    <div className="text-center py-8">Carregando dados...</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Conta</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Pago</TableHead>
                          <TableHead>Pendente</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Próximo Vencimento</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {creditAccounts?.map((account) => {
                          const customer = customers?.find(c => c.id === account.customerId);
                          const nextPayment = account.nextPaymentDate ? new Date(account.nextPaymentDate) : null;
                          const isOverdue = nextPayment && nextPayment < new Date();
                          
                          return (
                            <TableRow key={account.id}>
                              <TableCell className="font-medium">{account.accountNumber}</TableCell>
                              <TableCell>{customer?.name || 'N/A'}</TableCell>
                              <TableCell>{formatCurrency(parseFloat(account.totalAmount?.toString() || "0"))}</TableCell>
                              <TableCell className="text-green-600">
                                {formatCurrency(parseFloat(account.paidAmount?.toString() || "0"))}
                              </TableCell>
                              <TableCell className="text-orange-600">
                                {formatCurrency(parseFloat(account.remainingAmount?.toString() || "0"))}
                              </TableCell>
                              <TableCell>
                                <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                                  {account.status === 'active' ? 'Ativa' : 
                                   account.status === 'closed' ? 'Fechada' : 'Suspensa'}
                                </Badge>
                              </TableCell>
                              <TableCell className={isOverdue ? 'text-red-600 font-medium' : ''}>
                                {nextPayment ? formatDate(nextPayment) : 'N/A'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Clientes */}
            <TabsContent value="customers" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Clientes por Valor Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Posição</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Valor Pago</TableHead>
                        <TableHead>Pendente</TableHead>
                        <TableHead>% Pago</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topCustomers.map((item, index) => {
                        const paymentPercentage = item.totalAmount > 0 ? (item.paidAmount / item.totalAmount) * 100 : 0;
                        
                        return (
                          <TableRow key={item.account.id}>
                            <TableCell className="font-bold">{index + 1}º</TableCell>
                            <TableCell>{item.customer?.name || 'Cliente não encontrado'}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(item.totalAmount)}</TableCell>
                            <TableCell className="text-green-600">{formatCurrency(item.paidAmount)}</TableCell>
                            <TableCell className="text-orange-600">{formatCurrency(item.remainingAmount)}</TableCell>
                            <TableCell>
                              <Badge variant={paymentPercentage >= 80 ? 'default' : 
                                            paymentPercentage >= 50 ? 'secondary' : 'destructive'}>
                                {paymentPercentage.toFixed(1)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Analytics */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição por Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Contas Ativas</span>
                        <span className="font-medium">{activeAccounts} ({totalAccounts > 0 ? ((activeAccounts / totalAccounts) * 100).toFixed(1) : 0}%)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Contas Vencidas</span>
                        <span className="font-medium text-red-600">{overdueAccounts} ({totalAccounts > 0 ? ((overdueAccounts / totalAccounts) * 100).toFixed(1) : 0}%)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Contas Pagas</span>
                        <span className="font-medium text-green-600">
                          {creditAccounts?.filter(acc => acc.status === 'paid_off').length || 0} 
                          ({totalAccounts > 0 ? (((creditAccounts?.filter(acc => acc.status === 'paid_off').length || 0) / totalAccounts) * 100).toFixed(1) : 0}%)
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Resumo Financeiro</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total Creditado</span>
                        <span className="font-medium">{formatCurrency(totalCredit)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total Recebido</span>
                        <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">A Receber</span>
                        <span className="font-medium text-orange-600">{formatCurrency(totalPending)}</span>
                      </div>
                      <hr />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Taxa de Recuperação</span>
                        <span className="font-bold text-blue-600">{paymentRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Botões de Ação */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => exportReport('csv')}
                className="border-petrol-300 text-petrol-700 hover:bg-petrol-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => exportReport('pdf')}
                className="border-petrol-300 text-petrol-700 hover:bg-petrol-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-petrol-600 hover:bg-petrol-700"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}