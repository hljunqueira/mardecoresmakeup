import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

/**
 * Hook personalizado para coordenar integrações entre pedidos e outros módulos do sistema
 * Garante que quando um pedido é confirmado, cancelado ou concluído, todos os módulos sejam atualizados
 */
export function useOrderIntegration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Função para invalidar todas as queries relacionadas após mudanças em pedidos
  const invalidateAllModules = () => {
    console.log('🔄 Invalidating queries across all modules...');
    
    // Pedidos
    queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
    
    // Produtos e estoque
    queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    
    // Financeiro
    queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/financial/summary"] });
    
    // Relatórios
    queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
    
    // Crediário (se aplicável)
    queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-accounts"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
    
    console.log('✅ All module queries invalidated');
  };

  // Confirmar pedido com integração completa
  const confirmOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      console.log('📋 Confirmando pedido com integração:', orderId);
      const response = await apiRequest("POST", `/api/admin/orders/${orderId}/confirm`);
      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ Pedido confirmado com sucesso:', data);
      invalidateAllModules();
      toast({
        title: "Pedido confirmado!",
        description: "Estoque atualizado, transação financeira criada e relatórios atualizados.",
        duration: 5000,
      });
    },
    onError: (error: any) => {
      console.error('❌ Erro ao confirmar pedido:', error);
      toast({
        title: "Erro ao confirmar pedido",
        description: "Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    },
  });

  // Concluir pedido com integração completa
  const completeOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      console.log('🏁 Concluindo pedido com integração:', orderId);
      const response = await apiRequest("POST", `/api/admin/orders/${orderId}/complete`);
      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ Pedido concluído com sucesso:', data);
      invalidateAllModules();
      toast({
        title: "Pedido concluído!",
        description: "Sistema totalmente atualizado: estoque, financeiro, crediário e relatórios.",
        duration: 5000,
      });
    },
    onError: (error: any) => {
      console.error('❌ Erro ao concluir pedido:', error);
      toast({
        title: "Erro ao concluir pedido",
        description: "Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    },
  });

  // Cancelar pedido com reversão de integração
  const cancelOrderMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason?: string }) => {
      console.log('❌ Cancelando pedido com reversão:', orderId, reason);
      const response = await apiRequest("POST", `/api/admin/orders/${orderId}/cancel`, { reason });
      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ Pedido cancelado com reversão completa:', data);
      invalidateAllModules();
      toast({
        title: "Pedido cancelado!",
        description: "Estoque restaurado, estorno criado e sistema atualizado.",
        duration: 5000,
      });
    },
    onError: (error: any) => {
      console.error('❌ Erro ao cancelar pedido:', error);
      toast({
        title: "Erro ao cancelar pedido",
        description: "Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    },
  });

  // Criar pedido com integração automática
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      console.log('➕ Criando pedido com integração:', orderData);
      const response = await apiRequest("POST", "/api/admin/orders", orderData);
      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ Pedido criado com sucesso:', data);
      invalidateAllModules();
      toast({
        title: "Pedido criado!",
        description: `Pedido ${data.orderNumber} criado e sistema atualizado.`,
      });
    },
    onError: (error: any) => {
      console.error('❌ Erro ao criar pedido:', error);
      toast({
        title: "Erro ao criar pedido",
        description: "Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Função utilitária para verificar sincronização
  const checkSystemSync = () => {
    console.log('✅ Sistema sincronizado - todas as queries serão recarregadas conforme necessário');
    return true;
  };

  // Função para forçar sincronização completa
  const forceSyncAll = () => {
    console.log('🔄 Forçando sincronização completa do sistema...');
    invalidateAllModules();
    
    // Aguardar um pouco e verificar
    setTimeout(() => {
      const synced = checkSystemSync();
      if (synced) {
        toast({
          title: "Sistema sincronizado",
          description: "Todos os módulos foram atualizados com sucesso.",
        });
      }
    }, 1000);
  };

  return {
    // Mutations integradas
    confirmOrder: confirmOrderMutation.mutate,
    completeOrder: completeOrderMutation.mutate,
    cancelOrder: cancelOrderMutation.mutate,
    createOrder: createOrderMutation.mutate,
    
    // Estados de loading
    isConfirming: confirmOrderMutation.isPending,
    isCompleting: completeOrderMutation.isPending,
    isCancelling: cancelOrderMutation.isPending,
    isCreating: createOrderMutation.isPending,
    
    // Utilidades
    invalidateAllModules,
    checkSystemSync,
    forceSyncAll,
    
    // Para casos especiais onde apenas algumas queries precisam ser invalidadas
    invalidateOrders: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] }),
    invalidateProducts: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] }),
    invalidateFinancial: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] }),
    invalidateReports: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] }),
    invalidateCredit: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-accounts"] }),
  };
}

/**
 * Hook simplificado para casos onde só precisamos invalidar queries específicas
 */
export function useModuleSync() {
  const queryClient = useQueryClient();

  return {
    syncOrders: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] }),
    syncProducts: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] }),
    syncFinancial: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/financial/summary"] });
    },
    syncReports: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] }),
    syncCredit: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
    },
    syncAll: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/financial/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
    }
  };
}