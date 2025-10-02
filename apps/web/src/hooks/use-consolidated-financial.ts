import { useQuery } from '@tanstack/react-query';
import { ConsolidatedFinancialMetrics } from '@shared/financial-schema';

/**
 * Hook para acessar métricas financeiras consolidadas
 * Unifica dados de: Transações Manuais + Pedidos + Crediário
 */
export function useConsolidatedFinancialMetrics(filters?: {
  period?: string;
  startDate?: string;
  endDate?: string;
  includeManualTransactions?: boolean;
  includeOrders?: boolean;
  includeCreditAccounts?: boolean;
}) {
  const queryParams = new URLSearchParams({
    period: filters?.period || '30',
    ...(filters?.startDate && { startDate: filters.startDate }),
    ...(filters?.endDate && { endDate: filters.endDate }),
    includeManualTransactions: String(filters?.includeManualTransactions ?? true),
    includeOrders: String(filters?.includeOrders ?? true),
    includeCreditAccounts: String(filters?.includeCreditAccounts ?? true),
  });

  return useQuery<ConsolidatedFinancialMetrics>({
    queryKey: ['/api/admin/financial/consolidated', filters],
    queryFn: async () => {
      const response = await fetch(`/api/admin/financial/consolidated?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch consolidated metrics');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 30 * 1000, // Atualiza a cada 30 segundos
  });
}

/**
 * Hook para métricas rápidas do dashboard
 */
export function useDashboardMetrics() {
  const { data: consolidated, isLoading, error } = useConsolidatedFinancialMetrics({
    period: '30'
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { direction: 'stable' as const, percentage: 0 };
    
    const change = ((current - previous) / previous) * 100;
    return {
      direction: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'stable' as const,
      percentage: Math.abs(change)
    };
  };

  const dashboardCards = consolidated ? [
    {
      id: 'total-revenue',
      title: 'Receita Total',
      value: consolidated.totalRevenue,
      formattedValue: formatCurrency(consolidated.totalRevenue),
      trend: {
        ...calculateTrend(
          consolidated.totalRevenue, 
          consolidated.periodAnalysis.monthlyComparison.previousMonth
        ),
        period: 'vs mês anterior'
      },
      color: 'green' as const,
      icon: 'TrendingUp',
      description: 'Todas as fontes: vendas manuais, pedidos e crediário'
    },
    {
      id: 'total-expenses',
      title: 'Despesas',
      value: consolidated.totalExpenses,
      formattedValue: formatCurrency(consolidated.totalExpenses),
      trend: {
        direction: 'stable' as const,
        percentage: 0,
        period: 'vs mês anterior'
      },
      color: 'red' as const,
      icon: 'TrendingDown',
      description: 'Fornecedores, operacional, marketing'
    },
    {
      id: 'accounts-receivable',
      title: 'A Receber',
      value: consolidated.accountsReceivable.pending + consolidated.accountsReceivable.creditAccountsBalance,
      formattedValue: formatCurrency(
        consolidated.accountsReceivable.pending + consolidated.accountsReceivable.creditAccountsBalance
      ),
      trend: {
        direction: 'stable' as const,
        percentage: 0,
        period: 'pendente'
      },
      color: 'blue' as const,
      icon: 'Clock',
      description: 'Valores pendentes + saldo crediário',
      actionButton: {
        label: 'Ver Detalhes',
        action: 'navigate-receivables'
      }
    },
    {
      id: 'net-profit',
      title: 'Lucro Líquido',
      value: consolidated.netProfit,
      formattedValue: formatCurrency(consolidated.netProfit),
      trend: {
        ...calculateTrend(
          consolidated.netProfit,
          consolidated.periodAnalysis.monthlyComparison.previousMonth - consolidated.totalExpenses
        ),
        period: 'vs mês anterior'
      },
      color: consolidated.netProfit >= 0 ? 'green' as const : 'red' as const,
      icon: consolidated.netProfit >= 0 ? 'TrendingUp' : 'TrendingDown',
      description: 'Receita total - despesas totais'
    }
  ] : [];

  return {
    consolidated,
    dashboardCards,
    isLoading,
    error,
    alerts: consolidated?.alerts || [],
    performance: consolidated?.performance || null,
    revenueBreakdown: consolidated?.revenueBreakdown || undefined
  };
}

/**
 * Hook para análise de crescimento
 */
export function useFinancialGrowthAnalysis() {
  const { data: metrics } = useConsolidatedFinancialMetrics({ period: '90' });
  
  if (!metrics) {
    return {
      monthlyGrowth: undefined,
      revenueBySource: undefined,
      topPerformers: undefined
    };
  }

  return {
    monthlyGrowth: {
      current: metrics.periodAnalysis.monthlyComparison.currentMonth,
      previous: metrics.periodAnalysis.monthlyComparison.previousMonth,
      growthRate: metrics.periodAnalysis.monthlyComparison.growth
    },
    revenueBySource: {
      manual: {
        amount: metrics.revenueBreakdown.manualTransactions,
        percentage: (metrics.revenueBreakdown.manualTransactions / metrics.totalRevenue) * 100
      },
      orders: {
        amount: metrics.revenueBreakdown.cashOrders,
        percentage: (metrics.revenueBreakdown.cashOrders / metrics.totalRevenue) * 100
      },
      credit: {
        amount: metrics.revenueBreakdown.creditAccounts,
        percentage: (metrics.revenueBreakdown.creditAccounts / metrics.totalRevenue) * 100
      }
    },
    topPerformers: {
      averageOrderValue: metrics.performance.averageOrderValue || 0,
      // totalOrders e activeCreditAccounts estão em metadata
      totalOrders: (metrics as any).metadata?.dataSource?.orders || 0,
      activeCreditAccounts: (metrics as any).metadata?.dataSource?.creditAccounts || 0
    }
  };
}