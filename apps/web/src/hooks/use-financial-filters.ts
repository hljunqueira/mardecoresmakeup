import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { FinancialFilters } from "@/components/ui/financial-filters";

export interface FilteredFinancialData {
  transactions: any[];
  metrics: {
    totalFiltered: number;
    revenue: number;
    expenses: number;
    balance: number;
    count: number;
  };
}

const defaultFilters: FinancialFilters = {
  period: "all",
  type: "all",
  status: "all",
  source: "all",
};

export function useFinancialFilters() {
  const [filters, setFilters] = useState<FinancialFilters>(defaultFilters);

  const updateFilters = useCallback((newFilters: FinancialFilters) => {
    setFilters(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Gerar query string para a API baseada nos filtros
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all" && value !== "") {
        params.append(key, value);
      }
    });
    
    return params.toString();
  }, [filters]);

  // Buscar dados filtrados da API
  const { 
    data: filteredData, 
    isLoading, 
    error 
  } = useQuery<FilteredFinancialData>({
    queryKey: ["/api/admin/financial/filtered", queryParams],
    queryFn: async () => {
      const url = `/api/admin/financial/filtered${queryParams ? `?${queryParams}` : ""}`;
      const response = await apiRequest("GET", url);
      return response.json();
    },
    enabled: true,
  });

  // Aplicar filtros locais (para dados que já temos em cache)
  const applyLocalFilters = useCallback((data: any[]) => {
    if (!data) return [];

    return data.filter(item => {
      // Filtro de período
      if (filters.period !== "all" && filters.period !== "") {
        const itemDate = new Date(item.createdAt || item.date);
        const now = new Date();
        
        switch (filters.period) {
          case "today":
            if (itemDate.toDateString() !== now.toDateString()) return false;
            break;
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (itemDate < weekAgo) return false;
            break;
          case "month":
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            if (itemDate < monthAgo) return false;
            break;
          case "quarter":
            const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
            if (itemDate < quarterAgo) return false;
            break;
          case "year":
            const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            if (itemDate < yearAgo) return false;
            break;
          case "custom":
            if (filters.startDate && itemDate < new Date(filters.startDate)) return false;
            if (filters.endDate && itemDate > new Date(filters.endDate)) return false;
            break;
        }
      }

      // Filtro de tipo
      if (filters.type !== "all" && item.type !== filters.type) {
        return false;
      }

      // Filtro de status
      if (filters.status !== "all" && item.status !== filters.status) {
        return false;
      }

      // Filtro de fonte
      if (filters.source !== "all") {
        const itemSource = item.source || (item.orderId ? "orders" : "manual");
        if (itemSource !== filters.source) return false;
      }

      // Filtro de valor mínimo
      if (filters.minAmount) {
        const amount = parseFloat(item.amount || item.total || "0");
        if (amount < parseFloat(filters.minAmount)) return false;
      }

      // Filtro de valor máximo
      if (filters.maxAmount) {
        const amount = parseFloat(item.amount || item.total || "0");
        if (amount > parseFloat(filters.maxAmount)) return false;
      }

      return true;
    });
  }, [filters]);

  // Calcular métricas dos dados filtrados
  const calculateMetrics = useCallback((data: any[]) => {
    if (!data || data.length === 0) {
      return {
        totalFiltered: 0,
        revenue: 0,
        expenses: 0,
        balance: 0,
        count: 0,
      };
    }

    const revenue = data
      .filter(item => item.type === "income")
      .reduce((sum, item) => sum + parseFloat(item.amount || item.total || "0"), 0);

    const expenses = data
      .filter(item => item.type === "expense")
      .reduce((sum, item) => sum + parseFloat(item.amount || item.total || "0"), 0);

    return {
      totalFiltered: data.length,
      revenue,
      expenses,
      balance: revenue - expenses,
      count: data.length,
    };
  }, []);

  // Verificar se há filtros ativos
  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => 
      value !== "" && value !== "all" && value !== defaultFilters[key as keyof FinancialFilters]
    );
  }, [filters]);

  // Contar filtros ativos
  const activeFiltersCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => 
      value !== "" && value !== "all" && value !== defaultFilters[key as keyof FinancialFilters]
    ).length;
  }, [filters]);

  return {
    filters,
    updateFilters,
    clearFilters,
    filteredData,
    isLoading,
    error,
    applyLocalFilters,
    calculateMetrics,
    hasActiveFilters,
    activeFiltersCount,
    queryParams,
  };
}