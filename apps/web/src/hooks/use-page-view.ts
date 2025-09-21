import { useEffect } from 'react';

// Hook para rastrear visualizações do site
export function usePageView() {
  useEffect(() => {
    // Registrar uma visualização quando o componente é montado
    const recordView = async () => {
      try {
        const payload = {
          page: window.location.pathname,
          userAgent: navigator.userAgent,
        };
        
        console.log('📊 Enviando visualização:', payload);
        
        const response = await fetch('/api/analytics/view', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Visualização registrada:', data.views);
        } else {
          console.error('❌ Erro na resposta:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('❌ Erro ao registrar visualização:', error);
      }
    };

    // Aguardar um pouco antes de registrar para evitar contagem de bots
    const timer = setTimeout(recordView, 1000);
    
    return () => clearTimeout(timer);
  }, []); // Executa apenas uma vez por carregamento da página
}

// Hook para buscar estatísticas de visualizações (admin)
export function useViewsStats() {
  const fetchViews = async () => {
    try {
      const response = await fetch('/api/analytics/views');
      if (response.ok) {
        const data = await response.json();
        return data.views;
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
    return null;
  };

  return { fetchViews };
}