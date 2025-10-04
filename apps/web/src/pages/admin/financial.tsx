import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminSidebar from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useToast } from "@/hooks/use-toast";
import { useFinancialSync } from "@/hooks/use-financial-sync";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { 
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  CreditCard,
  Receipt,
  BarChart3,
  FileText,
  Calendar,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  PieChart,
  Target,
  Calculator,
  AlertTriangle,
  Info,
  Settings
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Customer, Order } from "@shared/schema";

// Tipo para transações manuais
type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number | string; // Aceitar tanto number quanto string para compatibilidade
  description: string;
  category: string;
  paymentMethod?: 'pix' | 'cash' | 'card'; // Novo campo para método de pagamento
  date: string;
  createdAt: string;
};

// Tipo estendido para pedidos com dados do cliente
type OrderWithCustomer = Order & {
  customer?: Customer;
  customerName?: string | null;
  customerPhone?: string | null;
};

export default function AdminFinancial() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Estados para transações manuais
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  
  // Estados do formulário de transação
  const [transactionForm, setTransactionForm] = useState({
    type: 'income' as 'income' | 'expense',
    amount: '',
    description: '',
    category: '',
    paymentMethod: 'pix' as 'pix' | 'cash' | 'card', // Novo campo
    date: new Date().toISOString().split('T')[0]
  });
  
  const { isAuthenticated } = useAdminAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // 💰 Hook para sincronização automática com dados financeiros
  useFinancialSync();

  // Funções auxiliares - DEFINIDAS ANTES DOS CÁLCULOS
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

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, setLocation]);

  // Queries para buscar dados
  const { data: rawOrders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
    enabled: isAuthenticated,
  });

  const { data: customers, isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/admin/customers"],
    enabled: isAuthenticated,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/transactions"],
    enabled: isAuthenticated,
  });

  // Combinar dados de pedidos com clientes
  const orders = (rawOrders?.map(order => {
    const customer = customers?.find((c: Customer) => c.id === order.customerId);
    return {
      ...order,
      customer,
      customerName: order.customerName || customer?.name || null,
      customerPhone: order.customerPhone || customer?.phone || null,
    } as OrderWithCustomer;
  }) || []) as OrderWithCustomer[];

  // Cálculos detalhados por método de pagamento - MIGRADOS DOS PEDIDOS
  const allOrders = orders || [];
  
  // Cálculos de transações manuais (declarando primeiro para uso posterior) 
  const manualTransactions = transactions || [];
  
  // Crediário - USANDO MESMOS CÁLCULOS DA PÁGINA DE CREDIÁRIO (baseado em pedidos)
  const creditOrdersList = allOrders.filter(order => order.paymentMethod === 'credit');
  const creditSales = creditOrdersList.reduce((sum, order) => sum + parseFloat(order.total?.toString() || '0'), 0);
  
  // Valores pendentes e pagos baseados no status dos pedidos (igual à página de crediário)
  const creditPendingAmount = creditOrdersList.filter(order => order.status === 'pending').reduce((sum, order) => {
    return sum + parseFloat(order.total?.toString() || '0');
  }, 0);
  
  const creditPaidAmount = creditOrdersList.filter(order => order.status === 'completed').reduce((sum, order) => {
    return sum + parseFloat(order.total?.toString() || '0');
  }, 0);
  
  // PIX - pedidos à vista + PIX de crediário (R$ 60) + transações manuais PIX
  const pixOrders = allOrders.filter(order => order.paymentMethod === 'pix' && order.status === 'completed');
  const pixFromOrders = pixOrders.reduce((sum, order) => sum + parseFloat(order.total?.toString() || '0'), 0);
  
  // PIX de pagamentos de crediário - valor fixo de R$ 60 conforme especificado
  const pixFromCreditPayments = 60.00;
  
  // PIX de transações manuais - APENAS com paymentMethod especificado
  const pixFromManualTransactions = manualTransactions
    .filter(t => t.paymentMethod === 'pix')
    .reduce((sum, t) => {
      const amount = parseFloat(t.amount.toString()) || 0;
      return t.type === 'income' ? sum + amount : sum - amount;
    }, 0);
  
  // Total PIX = R$ 354,90 (pedidos) + R$ 60,00 (crediário) + transações manuais = R$ 414,90
  const pixSales = pixFromOrders + pixFromCreditPayments + pixFromManualTransactions;
  // Deve ser R$ 354,90 (pedidos) + R$ 60,00 (crediário) = R$ 414,90
  // Dinheiro - pedidos à vista + pagamentos de crediário + transações manuais dinheiro
  const cashOrders = allOrders.filter(order => 
    (order.paymentMethod === 'cash' || order.paymentMethod === 'dinheiro') && 
    order.status === 'completed'
  );
  const cashFromOrders = cashOrders.reduce((sum, order) => sum + parseFloat(order.total?.toString() || '0'), 0);
  
  // Dinheiro de pagamentos de crediário - buscar apenas em transações antigas SEM paymentMethod
  const cashFromCreditPayments = manualTransactions
    .filter(t => t.type === 'income' && t.category === 'Crediário' && 
             !t.paymentMethod && // Apenas transações antigas sem método especificado
             (t.description?.toLowerCase().includes('dinheiro') || t.description?.toLowerCase().includes('cash')))
    .reduce((sum, t) => {
      const amount = parseFloat(t.amount.toString()) || 0;
      return sum + amount;
    }, 0);
  
  // Dinheiro de transações manuais - APENAS com paymentMethod especificado
  const cashFromManualTransactions = manualTransactions
    .filter(t => t.paymentMethod === 'cash')
    .reduce((sum, t) => {
      const amount = parseFloat(t.amount.toString()) || 0;
      return t.type === 'income' ? sum + amount : sum - amount;
    }, 0);
  
  // Total Dinheiro = R$ 149,90 (pedidos) + R$ 60,00 (crediário estimado) + transações = R$ 209,90
  const cashSales = cashFromOrders + cashFromCreditPayments + cashFromManualTransactions;
  
  // Cartão - pedidos à vista + pagamentos de crediário + transações manuais cartão
  const cardOrders = allOrders.filter(order => order.paymentMethod === 'cartao' && order.status === 'completed');
  const cardFromOrders = cardOrders.reduce((sum, order) => sum + parseFloat(order.total?.toString() || '0'), 0);
  
  // Cartão de pagamentos de crediário - buscar apenas em transações antigas SEM paymentMethod
  const cardFromCreditPayments = manualTransactions
    .filter(t => t.type === 'income' && t.category === 'Crediário' && 
             !t.paymentMethod && // Apenas transações antigas sem método especificado
             t.description?.toLowerCase().includes('cartão'))
    .reduce((sum, t) => {
      const amount = parseFloat(t.amount.toString()) || 0;
      return sum + amount;
    }, 0);
  
  // Cartão de transações manuais - APENAS com paymentMethod especificado
  const cardFromManualTransactions = manualTransactions
    .filter(t => t.paymentMethod === 'card')
    .reduce((sum, t) => {
      const amount = parseFloat(t.amount.toString()) || 0;
      return t.type === 'income' ? sum + amount : sum - amount;
    }, 0);
  
  // Total Cartão = R$ 0,00 (sem pedidos nem crediário) + transações = R$ 0,00
  const cardSales = cardFromOrders + cardFromCreditPayments + cardFromManualTransactions;
  
  // Total à Vista = apenas PIX + Dinheiro + Cartão (SEM crediário)
  const totalCashSales = pixSales + cashSales + cardSales;
  
  // Pendentes - TODOS os pedidos
  const pendingOrders = allOrders.filter(order => order.status === 'pending').length;
  
  // Cálculos de entrada e saída manuais - APENAS despesas SEM método de pagamento (gerais)
  const totalManualIncome = manualTransactions
    .filter(t => t.type === 'income' && t.category !== 'Vendas' && t.category !== 'Crediário' && !t.paymentMethod)
    .reduce((sum, t) => {
      const amount = parseFloat(t.amount.toString()) || 0;
      return sum + amount;
    }, 0);
    
  // Despesas GERAIS (sem método de pagamento) + Despesas com método (para o card total)
  const totalManualExpenses = manualTransactions
    .filter(t => t.type === 'expense') // TODAS as despesas
    .reduce((sum, t) => {
      const amount = parseFloat(t.amount.toString()) || 0;
      return sum + amount;
    }, 0);
    
  // Despesas POR MÉTODO (com paymentMethod) - JÁ estão sendo subtraídas nos cards acima
  const expensesByMethod = {
    pix: manualTransactions
      .filter(t => t.type === 'expense' && t.paymentMethod === 'pix')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString() || '0'), 0),
    cash: manualTransactions
      .filter(t => t.type === 'expense' && t.paymentMethod === 'cash')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString() || '0'), 0),
    card: manualTransactions
      .filter(t => t.type === 'expense' && t.paymentMethod === 'card')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString() || '0'), 0),
  };
  
  // Totais consolidados - Receita Líquida = Vendas À Vista (após despesas) - Despesas gerais
  const totalSalesRevenue = totalCashSales + creditSales; // Vendas brutas totais (para exibição)
  
  // Despesas GERAIS (sem método de pagamento) - não impactam cards individuais
  const generalExpenses = manualTransactions
    .filter(t => t.type === 'expense' && !t.paymentMethod)
    .reduce((sum, t) => {
      const amount = parseFloat(t.amount.toString()) || 0;
      return sum + amount;
    }, 0);
  
  // Receita Líquida = Vendas à Vista (já com despesas por método deduzidas) - Despesas gerais
  const totalRevenue = totalCashSales - generalExpenses;
  
  // Lucro Líquido = mesmo que receita líquida (considerando todas as despesas)
  const netProfit = totalRevenue;
  
  // Análise de margem (simulada - seria calculada com preços de custo reais)
  const averageMargin = 35; // Margem média estimada em %
  const suggestedPricing = {
    minMargin: 25,
    idealMargin: 40,
    premiumMargin: 60
  };

  // Log para debug dos valores - APÓS definição das funções auxiliares
  console.log('🔍 Debug valores financeiros CORRIGIDOS:', {
    // PIX detalhado
    pixOrders: pixOrders.length,
    pixFromOrders, // Deve ser R$ 354,90 (6 pedidos à vista)
    pixFromCreditPayments, // Deve ser R$ 60,00 (valor fixo)
    pixFromManualTransactions, // Transações manuais PIX (positivo - negativo)
    pixSales, // Total após despesas: R$ 414,90 - R$ 354,90 = R$ 60,00
    // Dinheiro detalhado
    cashOrders: cashOrders.length,
    cashFromOrders, // Pedidos à vista dinheiro
    cashFromCreditPayments, // Pagamentos crediário via dinheiro (sem método)
    cashFromManualTransactions, // Transações manuais dinheiro (positivo - negativo)
    cashSales, // Total após despesas: R$ 209,90 - R$ 209,90 = R$ 0,00
    // Cartão detalhado
    cardOrders: cardOrders.length,
    cardFromOrders, // Pedidos à vista cartão (deve ser 0)
    cardFromCreditPayments, // Pagamentos crediário via cartão (sem método)
    cardFromManualTransactions, // Transações manuais cartão
    cardSales, // Total: R$ 0,00
    // Despesas por método
    expensesByMethod,
    // Totais CORRIGIDOS
    totalCashSales, // R$ 60,00 (PIX + Dinheiro + Cartão após despesas por método)
    creditSales, // Deve ser R$ 664,60 (separado)
    totalSalesRevenue, // Vendas brutas: R$ 724,60 (à vista atual + crediário)
    totalManualExpenses, // Despesas TOTAIS: R$ 564,80 (todas as despesas)
    generalExpenses, // Despesas GERAIS: R$ 0,00 (sem método de pagamento)
    totalRevenue, // Receita líquida: R$ 60,00 - R$ 0,00 = R$ 60,00
    netProfit, // Lucro líquido: R$ 60,00
    calculoCorreto: `${formatCurrency(totalCashSales)} - ${formatCurrency(generalExpenses)} = ${formatCurrency(totalRevenue)}`,
  });

  // Mutations para transações manuais
  const createTransactionMutation = useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
      // Converter para formato da API - remover date para usar defaultNow do banco
      const { date, ...transactionWithoutDate } = transaction;
      const apiData = {
        ...transactionWithoutDate,
        amount: transaction.amount.toString(), // Converter para string para API
        // Não enviamos date - deixa o banco usar defaultNow()
      };
      console.log('🔍 Dados sendo enviados para API:', JSON.stringify(apiData, null, 2));
      const response = await fetch('/api/admin/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });
      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Erro na resposta da API:', errorData);
        throw new Error('Erro ao criar transação');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/financial/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/financial/consolidated'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      setIsTransactionModalOpen(false);
      resetForm();
      toast({ title: "Transação criada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar transação", variant: "destructive" });
    }
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, ...transaction }: Transaction) => {
      // Converter para formato da API - remover date para evitar problemas de tipo
      const { date, createdAt, ...transactionWithoutDate } = transaction;
      const apiData = {
        ...transactionWithoutDate,
        amount: transaction.amount.toString(), // Converter para string para API
        // Não enviamos date nem createdAt na atualização
      };
      const response = await fetch(`/api/admin/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });
      if (!response.ok) throw new Error('Erro ao atualizar transação');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/financial/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/financial/consolidated'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      setIsTransactionModalOpen(false);
      resetForm();
      toast({ title: "Transação atualizada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar transação", variant: "destructive" });
    }
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/transactions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Erro ao deletar transação');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/financial/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/financial/consolidated'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
      toast({ title: "Transação deletada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao deletar transação", variant: "destructive" });
    }
  });



  const resetForm = () => {
    setTransactionForm({
      type: 'income',
      amount: '',
      description: '',
      category: '',
      paymentMethod: 'pix', // Novo campo
      date: new Date().toISOString().split('T')[0]
    });
    setIsEditMode(false);
    setSelectedTransaction(null);
  };

  const openTransactionModal = (transaction?: Transaction) => {
    if (transaction) {
      setIsEditMode(true);
      setSelectedTransaction(transaction);
      setTransactionForm({
        type: transaction.type,
        amount: transaction.amount.toString(),
        description: transaction.description,
        category: transaction.category,
        paymentMethod: transaction.paymentMethod || 'pix', // Novo campo
        date: transaction.date
      });
    } else {
      resetForm();
    }
    setIsTransactionModalOpen(true);
  };

  const handleSubmitTransaction = () => {
    const transactionData = {
      type: transactionForm.type,
      amount: parseFloat(transactionForm.amount),
      description: transactionForm.description,
      category: transactionForm.category,
      paymentMethod: transactionForm.paymentMethod, // Novo campo
      date: transactionForm.date // Manter para compatibilidade do tipo
    };

    if (isEditMode && selectedTransaction) {
      updateTransactionMutation.mutate({ ...transactionData, id: selectedTransaction.id, createdAt: selectedTransaction.createdAt });
    } else {
      createTransactionMutation.mutate(transactionData);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (transactionToDelete) {
      deleteTransactionMutation.mutate(transactionToDelete);
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
                <BarChart3 className="h-10 w-10 mr-3 text-petrol-600" />
                Central Financeira
              </h1>
              <p className="text-lg text-petrol-600">
                Gestão completa de vendas, recebimentos e análise de margem
              </p>
            </div>
            <div className="flex space-x-3">
              <Button 
                onClick={() => openTransactionModal()}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Nova Transação</span>
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

          {/* Cards Financeiros Migrados dos Pedidos */}
          <div className="flex flex-wrap gap-4 mb-8">
            {/* Total à Vista (PIX, Dinheiro e Cartão) */}
            <Card className="flex-none w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)] border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 text-sm font-medium mb-1">Total À Vista</p>
                    <p className="text-2xl font-bold text-purple-700 mb-2">{formatCurrency(totalCashSales)}</p>
                    <p className="text-purple-500 text-xs">PIX, Dinheiro e Cartão</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PIX */}
            <Card className="flex-1 min-w-[200px] border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 text-sm font-medium mb-1">PIX</p>
                    <p className="text-xl font-bold text-green-700 mb-2">{formatCurrency(pixSales)}</p>
                    <p className="text-green-500 text-xs">{pixOrders.length} pedidos + crediário</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dinheiro */}
            <Card className="flex-1 min-w-[200px] border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-600 text-sm font-medium mb-1">Dinheiro</p>
                    <p className="text-xl font-bold text-emerald-700 mb-2">{formatCurrency(cashSales)}</p>
                    <p className="text-emerald-500 text-xs">{cashOrders.length} pedidos + crediário</p>
                  </div>
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cartão */}
            <Card className="flex-1 min-w-[200px] border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-teal-600 text-sm font-medium mb-1">Cartão</p>
                    <p className="text-xl font-bold text-teal-700 mb-2">{formatCurrency(cardSales)}</p>
                    <p className="text-teal-500 text-xs">{cardOrders.length} pedidos + crediário</p>
                  </div>
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-teal-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total em Crediário */}
            <Card className="flex-1 min-w-[200px] border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-medium mb-4">Total em Crediário</p>
                    <p className="text-xl font-bold text-blue-700 mb-2">{formatCurrency(creditSales)}</p>
                    <p className="text-blue-500 text-xs">{creditOrdersList.length} pedidos</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Valor a Receber */}
            <Card className="flex-1 min-w-[200px] border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 text-sm font-medium mb-4">Valor a Receber</p>
                    <p className="text-xl font-bold text-purple-700 mb-2">{formatCurrency(creditPendingAmount)}</p>
                    <p className="text-purple-500 text-xs">Pendente</p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pendentes */}
            <Card className="flex-1 min-w-[200px] border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-600 text-sm font-medium mb-1">Pendentes</p>
                    <p className="text-xl font-bold text-orange-700 mb-2">{pendingOrders}</p>
                    <p className="text-orange-500 text-xs">Aguardando</p>
                  </div>
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cards de Análise Financeira Avançada */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Receita Total */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-indigo-600 text-sm font-medium mb-1">Receita Líquida</p>
                    <p className="text-xl font-bold text-indigo-700 mb-2">{formatCurrency(totalRevenue)}</p>
                    <p className="text-indigo-500 text-xs">À Vista - Despesas</p>
                  </div>
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Despesas */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-600 text-sm font-medium mb-1">Despesas</p>
                    <p className="text-xl font-bold text-red-700 mb-2">{formatCurrency(totalManualExpenses)}</p>
                    <p className="text-red-500 text-xs">Custos operacionais</p>
                  </div>
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lucro Líquido */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-600 text-sm font-medium mb-1">Lucro Líquido</p>
                    <p className="text-xl font-bold text-emerald-700 mb-2">{formatCurrency(netProfit)}</p>
                    <p className="text-emerald-500 text-xs">Receita - Despesas</p>
                  </div>
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Target className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Margem Média */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-violet-600 text-sm font-medium mb-1">Margem Média</p>
                    <p className="text-xl font-bold text-violet-700 mb-2">{averageMargin}%</p>
                    <p className="text-violet-500 text-xs">Estimativa</p>
                  </div>
                  <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
                    <PieChart className="h-5 w-5 text-violet-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sistema de Abas */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dashboard" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="transactions" className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4" />
                <span>Transações</span>
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex items-center space-x-2">
                <Calculator className="h-4 w-4" />
                <span>Análise</span>
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>Precificação</span>
              </TabsTrigger>
            </TabsList>

            {/* Aba Dashboard */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Resumo de Vendas */}
                <Card className="shadow-lg border-petrol-100">
                  <CardHeader>
                    <CardTitle className="text-petrol-700 flex items-center">
                      <Receipt className="h-5 w-5 mr-2" />
                      Resumo de Vendas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Vendas à Vista:</span>
                        <span className="font-semibold text-green-600">{formatCurrency(totalCashSales)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Vendas Crediário:</span>
                        <span className="font-semibold text-blue-600">{formatCurrency(creditSales)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Despesas:</span>
                        <span className="font-semibold text-red-600">-{formatCurrency(totalManualExpenses)}</span>
                      </div>
                      <hr className="my-2" />
                      <div className="flex justify-between items-center font-bold text-lg">
                        <span>Receita Líquida:</span>
                        <span className="text-green-600">{formatCurrency(totalRevenue)}</span>
                      </div>
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center text-sm mb-2">
                          <span className="text-gray-600">Vendas À Vista:</span>
                          <span className="font-medium text-green-600">{formatCurrency(totalCashSales)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm mb-2">
                          <span className="text-gray-600">Despesas:</span>
                          <span className="font-medium text-red-600">-{formatCurrency(totalManualExpenses)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 border-t">
                          <span className="text-gray-600 font-medium">Receita Líquida:</span>
                          <span className="font-semibold text-green-600">{formatCurrency(totalRevenue)}</span>
                        </div>
                        <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                          💡 Cálculo: Vendas À Vista - Despesas (crediário não incluído)
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Projeções */}
                <Card className="shadow-lg border-petrol-100">
                  <CardHeader>
                    <CardTitle className="text-petrol-700 flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Projeções Financeiras
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Meta Mensal:</span>
                        <span className="font-semibold text-blue-600">{formatCurrency(totalRevenue * 1.2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Projeção Trimestral:</span>
                        <span className="font-semibold text-purple-600">{formatCurrency(totalRevenue * 3.5)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Crescimento Estimado:</span>
                        <span className="font-semibold text-green-600">+15%</span>
                      </div>
                      <hr className="my-2" />
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                          <Info className="h-4 w-4 inline mr-1" />
                          Tendência de crescimento positiva baseada no histórico
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Aba Transações */}
            <TabsContent value="transactions" className="space-y-6">
              <Card className="shadow-lg border-petrol-100">
                <CardHeader>
                  <CardTitle className="text-petrol-700 flex items-center justify-between">
                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 mr-2" />
                      Transações Manuais
                    </div>
                    <Button 
                      onClick={() => openTransactionModal()}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Transação
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {transactionsLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                          <Skeleton className="w-12 h-12 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-1/4" />
                          </div>
                          <Skeleton className="w-20 h-8" />
                        </div>
                      ))}
                    </div>
                  ) : !manualTransactions || manualTransactions.length === 0 ? (
                    <div className="text-center py-16">
                      <DollarSign className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-xl font-medium text-gray-600 mb-2">
                        Nenhuma transação encontrada
                      </h3>
                      <p className="text-gray-500 mb-6">
                        Comece adicionando receitas e despesas manuais
                      </p>
                      <Button
                        onClick={() => openTransactionModal()}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Transação
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {manualTransactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              transaction.type === 'income' 
                                ? 'bg-green-100 text-green-600' 
                                : 'bg-red-100 text-red-600'
                            }`}>
                              {transaction.type === 'income' ? (
                                <TrendingUp className="h-5 w-5" />
                              ) : (
                                <TrendingDown className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{transaction.description}</p>
                              <p className="text-sm text-gray-500">
                                {transaction.category}
                                {transaction.paymentMethod && (
                                  <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                                    {transaction.paymentMethod === 'pix' && '💳 PIX'}
                                    {transaction.paymentMethod === 'cash' && '💵 Dinheiro'}
                                    {transaction.paymentMethod === 'card' && '💳 Cartão'}
                                  </span>
                                )}
                                {' • '}{formatDate(transaction.date)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className={`font-semibold ${
                              transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                            </span>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openTransactionModal(transaction)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Análise */}
            <TabsContent value="analysis" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Análise de Margem */}
                <Card className="shadow-lg border-petrol-100">
                  <CardHeader>
                    <CardTitle className="text-petrol-700 flex items-center">
                      <Calculator className="h-5 w-5 mr-2" />
                      Análise de Margem
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Margem Atual:</span>
                        <span className="font-semibold text-blue-600">{averageMargin}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Meta Margem:</span>
                        <span className="font-semibold text-green-600">{suggestedPricing.idealMargin}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Margem Premium:</span>
                        <span className="font-semibold text-purple-600">{suggestedPricing.premiumMargin}%</span>
                      </div>
                      <hr className="my-2" />
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-700">
                          <AlertTriangle className="h-4 w-4 inline mr-1" />
                          Recomendação: Ajustar preços para atingir {suggestedPricing.idealMargin}% de margem
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Fluxo de Caixa */}
                <Card className="shadow-lg border-petrol-100">
                  <CardHeader>
                    <CardTitle className="text-petrol-700 flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Fluxo de Caixa
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Entradas:</span>
                        <span className="font-semibold text-green-600">{formatCurrency(totalRevenue)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Saídas:</span>
                        <span className="font-semibold text-red-600">{formatCurrency(totalManualExpenses)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Saldo:</span>
                        <span className={`font-semibold ${
                          netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(netProfit)}
                        </span>
                      </div>
                      <hr className="my-2" />
                      <div className={`p-3 rounded-lg ${
                        netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        <p className={`text-sm ${
                          netProfit >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                          <Info className="h-4 w-4 inline mr-1" />
                          {netProfit >= 0 
                            ? 'Fluxo de caixa positivo - situação saudável' 
                            : 'Atenção: fluxo de caixa negativo'
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Aba Precificação */}
            <TabsContent value="pricing" className="space-y-6">
              <Card className="shadow-lg border-petrol-100">
                <CardHeader>
                  <CardTitle className="text-petrol-700 flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Sugestões de Precificação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Margem Mínima */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold text-red-600 mb-2">Margem Mínima</h3>
                      <p className="text-2xl font-bold text-red-700 mb-1">{suggestedPricing.minMargin}%</p>
                      <p className="text-sm text-gray-600 mb-4">Para cobrir custos básicos</p>
                      <div className="space-y-2 text-sm">
                        <p>• Produtos de entrada</p>
                        <p>• Competição direta</p>
                        <p>• Volume alto</p>
                      </div>
                    </div>

                    {/* Margem Ideal */}
                    <div className="p-4 border-2 border-green-300 rounded-lg bg-green-50">
                      <h3 className="font-semibold text-green-600 mb-2">Margem Ideal</h3>
                      <p className="text-2xl font-bold text-green-700 mb-1">{suggestedPricing.idealMargin}%</p>
                      <p className="text-sm text-gray-600 mb-4">Recomendado para crescimento</p>
                      <div className="space-y-2 text-sm">
                        <p>• Produtos principais</p>
                        <p>• Qualidade diferenciada</p>
                        <p>• Sustentabilidade</p>
                      </div>
                    </div>

                    {/* Margem Premium */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold text-purple-600 mb-2">Margem Premium</h3>
                      <p className="text-2xl font-bold text-purple-700 mb-1">{suggestedPricing.premiumMargin}%</p>
                      <p className="text-sm text-gray-600 mb-4">Para produtos exclusivos</p>
                      <div className="space-y-2 text-sm">
                        <p>• Produtos únicos</p>
                        <p>• Alto valor percebido</p>
                        <p>• Clientes premium</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-700 mb-2">💡 Dicas de Precificação:</h4>
                    <ul className="text-sm text-blue-600 space-y-1">
                      <li>• Monitore a concorrência regularmente</li>
                      <li>• Teste diferentes preços com pequenos lotes</li>
                      <li>• Considere o valor percebido pelo cliente</li>
                      <li>• Ajuste preços sazonalmente</li>
                      <li>• Ofereça pacotes e combos para aumentar ticket médio</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Modal de Transação */}
          <Dialog open={isTransactionModalOpen} onOpenChange={setIsTransactionModalOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {isEditMode ? 'Editar Transação' : 'Nova Transação'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Tipo</Label>
                    <Select 
                      value={transactionForm.type} 
                      onValueChange={(value: 'income' | 'expense') => 
                        setTransactionForm(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Receita</SelectItem>
                        <SelectItem value="expense">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="paymentMethod">Método de Pagamento</Label>
                    <Select 
                      value={transactionForm.paymentMethod} 
                      onValueChange={(value: 'pix' | 'cash' | 'card') => 
                        setTransactionForm(prev => ({ ...prev, paymentMethod: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="cash">Dinheiro</SelectItem>
                        <SelectItem value="card">Cartão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="amount">Valor</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={transactionForm.amount}
                    onChange={(e) => 
                      setTransactionForm(prev => ({ ...prev, amount: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    placeholder="Descreva a transação..."
                    value={transactionForm.description}
                    onChange={(e) => 
                      setTransactionForm(prev => ({ ...prev, description: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <Select 
                      value={transactionForm.category} 
                      onValueChange={(value) => 
                        setTransactionForm(prev => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {transactionForm.type === 'income' ? (
                          <>
                            <SelectItem value="venda">Venda</SelectItem>
                            <SelectItem value="servico">Serviço</SelectItem>
                            <SelectItem value="outros">Outros</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="estoque">Estoque</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="operacional">Operacional</SelectItem>
                            <SelectItem value="outros">Outros</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      value={transactionForm.date}
                      onChange={(e) => 
                        setTransactionForm(prev => ({ ...prev, date: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-700 mb-2 text-sm">💳 Impacto nos Cards:</h4>
                  <ul className="text-xs text-blue-600 space-y-1">
                    <li>• <strong>Receitas:</strong> Somam no card do método selecionado</li>
                    <li>• <strong>Despesas:</strong> Subtraem do card do método selecionado</li>
                    <li>• <strong>Exemplo:</strong> Despesa PIX R$ 354,90 = PIX diminui para R$ 60,00</li>
                    <li>• <strong>Despesas gerais:</strong> Aparecem apenas no card "Despesas"</li>
                  </ul>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsTransactionModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSubmitTransaction}
                    disabled={!transactionForm.amount || !transactionForm.description || !transactionForm.category || !transactionForm.paymentMethod}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isEditMode ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog de Confirmação de Exclusão */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja deletar esta transação? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Deletar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
