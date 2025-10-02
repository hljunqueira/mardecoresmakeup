// Schema Unificado para Relatórios Financeiros Consolidados
// Integra dados de: Transações Manuais + Pedidos + Crediário

export interface ConsolidatedFinancialMetrics {
  // ===== MÉTRICAS PRINCIPAIS =====
  totalRevenue: number;           // Receita total (todas as fontes)
  totalExpenses: number;          // Despesas totais
  netProfit: number;              // Lucro líquido (receita - despesas)
  
  // ===== RECEITAS POR FONTE =====
  revenueBreakdown: {
    manualTransactions: number;   // Vendas manuais do financeiro
    cashOrders: number;           // Pedidos à vista confirmados
    creditAccounts: number;       // Pagamentos recebidos do crediário
  };
  
  // ===== CONTAS A RECEBER =====
  accountsReceivable: {
    pending: number;              // Transações pendentes
    creditAccountsBalance: number; // Saldo devedor total do crediário
    overdue: number;              // Valores vencidos
  };
  
  // ===== CONTAS A PAGAR =====
  accountsPayable: {
    pending: number;              // Despesas pendentes
    suppliers: number;            // Fornecedores
    operational: number;          // Operacional
  };
  
  // ===== ANÁLISE TEMPORAL =====
  periodAnalysis: {
    period: string;               // 'day', 'week', 'month', 'year'
    startDate: string;
    endDate: string;
    
    dailyRevenue: Array<{
      date: string;
      manual: number;
      orders: number;
      credit: number;
      total: number;
    }>;
    
    monthlyComparison: {
      currentMonth: number;
      previousMonth: number;
      growth: number;              // Percentual de crescimento
    };
  };
  
  // ===== DETALHAMENTO POR CATEGORIA =====
  categoryBreakdown: {
    income: Array<{
      category: string;            // 'Vendas', 'Pedidos', 'Crediário'
      amount: number;
      percentage: number;
      count: number;               // Quantidade de transações
    }>;
    
    expense: Array<{
      category: string;            // 'Fornecedores', 'Marketing', etc.
      amount: number;
      percentage: number;
      count: number;
    }>;
  };
  
  // ===== ALERTAS E NOTIFICAÇÕES =====
  alerts: Array<{
    type: 'overdue' | 'low_cash' | 'high_expense' | 'growth_opportunity';
    severity: 'low' | 'medium' | 'high';
    title: string;
    message: string;
    amount?: number;
    dueDate?: string;
    actionRequired: boolean;
  }>;
  
  // ===== MÉTRICAS DE PERFORMANCE =====
  performance: {
    averageOrderValue: number;    // Ticket médio dos pedidos
    conversionRate: number;       // Taxa de conversão (pendente → pago)
    creditRecoveryRate: number;   // Taxa de recuperação do crediário
    
    topProducts: Array<{          // Produtos mais vendidos
      productId: string;
      productName: string;
      quantity: number;
      revenue: number;
    }>;
    
    topCustomers: Array<{         // Melhores clientes
      customerId: string;
      customerName: string;
      totalSpent: number;
      ordersCount: number;
    }>;
  };
  
  // ===== PROJEÇÕES =====
  projections: {
    nextMonth: {
      expectedRevenue: number;
      expectedExpenses: number;
      expectedProfit: number;
      creditReceipts: number;      // Recebimentos esperados do crediário
    };
    
    cashFlow: Array<{             // Fluxo de caixa projetado
      date: string;
      inflow: number;
      outflow: number;
      balance: number;
    }>;
  };
}

// ===== INTERFACE PARA FILTROS =====
export interface FinancialFilters {
  startDate?: string;
  endDate?: string;
  includeManualTransactions?: boolean;
  includeOrders?: boolean;
  includeCreditAccounts?: boolean;
  categories?: string[];
  customerIds?: string[];
  productIds?: string[];
  paymentMethods?: string[];
}

// ===== INTERFACE PARA DASHBOARD CARDS =====
export interface FinancialDashboardCard {
  id: string;
  title: string;
  value: number;
  formattedValue: string;
  trend: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    period: string;
  };
  color: 'green' | 'blue' | 'purple' | 'orange' | 'red';
  icon: string;
  description: string;
  actionButton?: {
    label: string;
    action: string;
  };
}