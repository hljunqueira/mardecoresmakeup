import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

/**
 * Hook para gerenciar sincronização automática de dados financeiros
 * Detecta mudanças em pedidos, transações e crediário e atualiza automaticamente
 */
export function useFinancialSync() {
  const queryClient = useQueryClient();

  // Função para invalidar todas as queries financeiras
  const invalidateFinancialData = () => {
    console.log('🔄 Invalidando dados financeiros consolidados...');
    
    // APIs consolidadas
    queryClient.invalidateQueries({ queryKey: ['/api/admin/financial/consolidated'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/financial/summary'] });
    
    // APIs base
    queryClient.invalidateQueries({ queryKey: ['/api/admin/transactions'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/credit-accounts'] });
    
    // Relatórios
    queryClient.invalidateQueries({ queryKey: ['/api/admin/reports'] });
    
    console.log('✅ Dados financeiros invalidados');
  };

  // Trigger automático baseado em eventos do sistema
  useEffect(() => {
    const handleFinancialUpdate = (event: CustomEvent) => {
      console.log('📊 Evento de atualização financeira detectado:', event.detail);
      invalidateFinancialData();
    };

    // Escutar eventos customizados de mudanças financeiras
    window.addEventListener('financial-update', handleFinancialUpdate as EventListener);
    window.addEventListener('order-status-change', handleFinancialUpdate as EventListener);
    window.addEventListener('credit-payment', handleFinancialUpdate as EventListener);
    window.addEventListener('transaction-created', handleFinancialUpdate as EventListener);

    return () => {
      window.removeEventListener('financial-update', handleFinancialUpdate as EventListener);
      window.removeEventListener('order-status-change', handleFinancialUpdate as EventListener);
      window.removeEventListener('credit-payment', handleFinancialUpdate as EventListener);
      window.removeEventListener('transaction-created', handleFinancialUpdate as EventListener);
    };
  }, [queryClient]);

  // Função para disparar eventos de atualização
  const triggerFinancialUpdate = (source: string, data?: any) => {
    const event = new CustomEvent('financial-update', {
      detail: { source, data, timestamp: new Date().toISOString() }
    });
    window.dispatchEvent(event);
  };

  // Função para sincronização forçada
  const forceSyncFinancialData = async () => {
    console.log('🔄 Forçando sincronização completa de dados financeiros...');
    
    try {
      // Limpar cache
      await queryClient.cancelQueries();
      queryClient.clear();
      
      // Recarregar dados críticos
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: ['/api/admin/financial/consolidated'],
          queryFn: () => fetch('/api/admin/financial/consolidated').then(res => res.json())
        }),
        queryClient.prefetchQuery({
          queryKey: ['/api/admin/orders'],
          queryFn: () => fetch('/api/admin/orders').then(res => res.json())
        }),
        queryClient.prefetchQuery({
          queryKey: ['/api/admin/transactions'],
          queryFn: () => fetch('/api/admin/transactions').then(res => res.json())
        })
      ]);
      
      console.log('✅ Sincronização forçada concluída');
    } catch (error) {
      console.error('❌ Erro na sincronização forçada:', error);
    }
  };

  return {
    invalidateFinancialData,
    triggerFinancialUpdate,
    forceSyncFinancialData
  };
}

/**
 * Hook para detectar mudanças em tempo real
 */
export function useRealtimeFinancialUpdates() {
  const { triggerFinancialUpdate } = useFinancialSync();

  // Simular detecção de mudanças (em produção, seria via WebSockets ou polling)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Verificar se há atualizações pendentes
        const response = await fetch('/api/admin/financial/last-update');
        const data = await response.json();
        
        const lastUpdate = localStorage.getItem('last-financial-update');
        const currentUpdate = data.timestamp;
        
        if (lastUpdate !== currentUpdate) {
          console.log('🔄 Mudança detectada nos dados financeiros');
          triggerFinancialUpdate('realtime-check', data);
          localStorage.setItem('last-financial-update', currentUpdate);
        }
      } catch (error) {
        // Silenciar erros de polling
      }
    }, 30000); // Verificar a cada 30 segundos

    return () => clearInterval(interval);
  }, [triggerFinancialUpdate]);

  return {
    triggerFinancialUpdate
  };
}