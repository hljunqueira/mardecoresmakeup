// Script para verificar e corrigir automaticamente inconsistências de status
console.log('🔄 Sistema de Correção Automática de Status...');

async function autoFixStatusInconsistencies() {
  try {
    console.log('\n📊 Verificando estado atual do sistema...');
    
    // Buscar dados
    const [ordersRes, accountsRes, customersRes] = await Promise.all([
      fetch('http://localhost:5170/api/admin/orders'),
      fetch('http://localhost:5170/api/admin/credit-accounts'),
      fetch('http://localhost:5170/api/admin/customers')
    ]);
    
    const orders = await ordersRes.json();
    const accounts = await accountsRes.json();
    const customers = await customersRes.json();
    
    // Filtrar pedidos de crediário
    const creditOrders = orders.filter(order => order.paymentMethod === 'credit');
    
    console.log(`📋 Encontrados ${creditOrders.length} pedidos de crediário`);
    
    let fixedCount = 0;
    const inconsistencies = [];
    
    for (const order of creditOrders) {
      const customer = customers.find(c => c.id === order.customerId);
      const account = accounts.find(a => a.customerId === order.customerId);
      
      if (!account) continue;
      
      const remainingAmount = parseFloat(account.remainingAmount || '0');
      const isPaidOff = remainingAmount <= 0 && account.status === 'paid_off';
      const isOrderCompleted = order.status === 'completed';
      
      // Verificar se há inconsistência
      if (isPaidOff && !isOrderCompleted) {
        console.log(`\n❌ INCONSISTÊNCIA DETECTADA:`);
        console.log(`   Pedido: ${order.orderNumber || order.id}`);
        console.log(`   Cliente: ${customer?.name || 'N/A'}`);
        console.log(`   Status Conta: ${account.status} (Restante: R$ ${remainingAmount.toFixed(2)})`);
        console.log(`   Status Pedido: ${order.status}`);
        
        inconsistencies.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          customer: customer?.name,
          accountStatus: account.status,
          orderStatus: order.status
        });
        
        // Corrigir automaticamente
        console.log(`🔧 Corrigindo pedido ${order.orderNumber || order.id}...`);
        
        try {
          const updateResponse = await fetch(`http://localhost:5170/api/admin/orders/${order.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'completed',
              paymentStatus: 'paid'
            }),
          });
          
          if (updateResponse.ok) {
            console.log(`✅ Pedido ${order.orderNumber || order.id} corrigido!`);
            fixedCount++;
          } else {
            console.log(`❌ Erro ao corrigir pedido ${order.orderNumber || order.id}`);
          }
        } catch (error) {
          console.error(`❌ Erro na correção:`, error.message);
        }
      }
    }
    
    console.log(`\n📊 RESUMO DA CORREÇÃO:`);
    console.log(`   Inconsistências encontradas: ${inconsistencies.length}`);
    console.log(`   Pedidos corrigidos: ${fixedCount}`);
    
    if (fixedCount > 0) {
      console.log('\n🎉 Correções aplicadas com sucesso!');
      console.log('📱 Recarregue a página para ver as mudanças.');
    } else {
      console.log('\n✅ Sistema está consistente!');
    }
    
    return {
      inconsistencies: inconsistencies.length,
      fixed: fixedCount,
      success: true
    };
    
  } catch (error) {
    console.error('❌ Erro no sistema de correção:', error.message);
    return {
      inconsistencies: 0,
      fixed: 0,
      success: false,
      error: error.message
    };
  }
}

// Executar correção
autoFixStatusInconsistencies()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Sistema de correção executado com sucesso!');
    } else {
      console.log('\n❌ Falha no sistema de correção:', result.error);
    }
  });

// Exportar função para uso futuro
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { autoFixStatusInconsistencies };
}