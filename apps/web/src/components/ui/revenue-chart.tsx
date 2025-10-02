import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

interface RevenueChartProps {
  revenueBreakdown: {
    manualTransactions: number;
    cashOrders: number;
    creditAccounts: number;
  };
  totalRevenue: number;
  monthlyGrowth?: {
    current: number;
    previous: number;
    growthRate: number;
  };
}

export function RevenueChart({ 
  revenueBreakdown, 
  totalRevenue, 
  monthlyGrowth 
}: RevenueChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const calculatePercentage = (value: number) => {
    return totalRevenue > 0 ? (value / totalRevenue) * 100 : 0;
  };

  const sources = [
    {
      name: 'Vendas Manuais',
      value: revenueBreakdown.manualTransactions,
      percentage: calculatePercentage(revenueBreakdown.manualTransactions),
      color: 'from-emerald-500 to-green-600',
      bgColor: 'bg-emerald-100',
      textColor: 'text-emerald-700'
    },
    {
      name: 'Pedidos à Vista',
      value: revenueBreakdown.cashOrders,
      percentage: calculatePercentage(revenueBreakdown.cashOrders),
      color: 'from-blue-500 to-cyan-600',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700'
    },
    {
      name: 'Crediário',
      value: revenueBreakdown.creditAccounts,
      percentage: calculatePercentage(revenueBreakdown.creditAccounts),
      color: 'from-purple-500 to-indigo-600',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-700'
    }
  ];

  return (
    <Card className="bg-gradient-to-br from-white to-gray-50 border-gray-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-petrol-600" />
            <CardTitle className="text-lg font-semibold text-petrol-700">
              Evolução das Receitas
            </CardTitle>
          </div>
          {monthlyGrowth && (
            <Badge 
              variant="secondary" 
              className={`flex items-center space-x-1 ${
                monthlyGrowth.growthRate >= 0 
                  ? 'bg-green-100 text-green-700 border-green-200' 
                  : 'bg-red-100 text-red-700 border-red-200'
              }`}
            >
              {monthlyGrowth.growthRate >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span className="text-xs font-medium">
                {Math.abs(monthlyGrowth.growthRate).toFixed(1)}%
              </span>
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Gráfico de Barras Simples */}
        <div className="space-y-4">
          {sources.map((source, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {source.name}
                </span>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(source.value)}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({source.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
              
              {/* Barra de Progresso */}
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${source.color} transition-all duration-500 ease-out`}
                  style={{ width: `${source.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Resumo Total */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-base font-medium text-gray-700">
              Total Consolidado
            </span>
            <span className="text-xl font-bold text-petrol-700">
              {formatCurrency(totalRevenue)}
            </span>
          </div>
          
          {monthlyGrowth && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Mês Anterior:</span>
                <span className="font-medium">
                  {formatCurrency(monthlyGrowth.previous)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-600">Crescimento:</span>
                <span className={`font-semibold ${
                  monthlyGrowth.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {monthlyGrowth.growthRate >= 0 ? '+' : ''}
                  {formatCurrency(monthlyGrowth.current - monthlyGrowth.previous)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Indicadores Visuais */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          {sources.map((source, index) => (
            <div key={index} className="text-center">
              <div className={`w-3 h-3 rounded-full ${source.bgColor} mx-auto mb-1`}></div>
              <span className="text-xs text-gray-600">{source.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}