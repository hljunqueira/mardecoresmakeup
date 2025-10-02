import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Filter, X, TrendingUp, DollarSign, Clock, CreditCard } from "lucide-react";

export interface FinancialFilters {
  period: string;
  startDate?: string;
  endDate?: string;
  type: string;
  status: string;
  source: string;
  minAmount?: string;
  maxAmount?: string;
}

interface FinancialFiltersProps {
  filters: FinancialFilters;
  onFiltersChange: (filters: FinancialFilters) => void;
  onClearFilters: () => void;
  className?: string;
}

export function FinancialFilters({ 
  filters, 
  onFiltersChange, 
  onClearFilters,
  className = "" 
}: FinancialFiltersProps) {
  const updateFilter = (key: keyof FinancialFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== "" && value !== "all" && value !== undefined
  );

  const getActiveFiltersCount = () => {
    return Object.entries(filters).filter(([key, value]) => 
      value !== "" && value !== "all" && value !== undefined
    ).length;
  };

  return (
    <Card className={`backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 border-white/20 shadow-xl ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <Filter className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Filtros Avançados</h3>
              <p className="text-sm text-gray-600">Refine sua análise financeira</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <Badge 
                variant="secondary" 
                className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-700 border-blue-200"
              >
                {getActiveFiltersCount()} filtros ativos
              </Badge>
            )}
            
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="text-gray-600 hover:text-gray-800 border-gray-200 hover:bg-gray-50"
              >
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Período */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              Período
            </Label>
            <Select value={filters.period} onValueChange={(value) => updateFilter("period", value)}>
              <SelectTrigger className="bg-white/50 border-gray-200 hover:bg-white/70 transition-colors">
                <SelectValue placeholder="Selecionar período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os períodos</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="quarter">Este trimestre</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
                <SelectItem value="custom">Período personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Transação */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              Tipo
            </Label>
            <Select value={filters.type} onValueChange={(value) => updateFilter("type", value)}>
              <SelectTrigger className="bg-white/50 border-gray-200 hover:bg-white/70 transition-colors">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              Status
            </Label>
            <Select value={filters.status} onValueChange={(value) => updateFilter("status", value)}>
              <SelectTrigger className="bg-white/50 border-gray-200 hover:bg-white/70 transition-colors">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
                <SelectItem value="overdue">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fonte */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-gray-500" />
              Fonte
            </Label>
            <Select value={filters.source} onValueChange={(value) => updateFilter("source", value)}>
              <SelectTrigger className="bg-white/50 border-gray-200 hover:bg-white/70 transition-colors">
                <SelectValue placeholder="Todas as fontes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as fontes</SelectItem>
                <SelectItem value="manual">Transações manuais</SelectItem>
                <SelectItem value="orders">Pedidos à vista</SelectItem>
                <SelectItem value="credit">Crediário</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Período Personalizado */}
        {filters.period === "custom" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 p-4 rounded-lg bg-gradient-to-r from-blue-50/50 to-purple-50/50 border border-blue-100">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Data inicial</Label>
              <Input
                type="date"
                value={filters.startDate || ""}
                onChange={(e) => updateFilter("startDate", e.target.value)}
                className="bg-white/70 border-gray-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Data final</Label>
              <Input
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => updateFilter("endDate", e.target.value)}
                className="bg-white/70 border-gray-200"
              />
            </div>
          </div>
        )}

        {/* Filtros de Valor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-500" />
              Valor mínimo
            </Label>
            <Input
              type="number"
              placeholder="R$ 0,00"
              value={filters.minAmount || ""}
              onChange={(e) => updateFilter("minAmount", e.target.value)}
              className="bg-white/50 border-gray-200 hover:bg-white/70 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-500" />
              Valor máximo
            </Label>
            <Input
              type="number"
              placeholder="R$ 0,00"
              value={filters.maxAmount || ""}
              onChange={(e) => updateFilter("maxAmount", e.target.value)}
              className="bg-white/50 border-gray-200 hover:bg-white/70 transition-colors"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}