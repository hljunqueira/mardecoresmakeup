// Script para investigar inconsistências de status entre pedidos e contas de crediário
console.log('🔍 Investigando inconsistências de status...');

async function investigateStatusInconsistency() {
  try {
    console.log('\n📊 Buscando dados...');
    
    // Buscar pedidos
    const ordersResponse = await fetch('http://localhost:5170/api/admin/orders');
    const orders = await ordersResponse.json();
    
    // Buscar contas de crediário
    const accountsResponse = await fetch('http://localhost:5170/api/admin/credit-accounts');
    const accounts = await accountsResponse.json();
    
    // Buscar clientes
    const customersResponse = await fetch('http://localhost:5170/api/admin/customers');
    const customers = await customersResponse.json();
    
    console.log(`✅ Encontrados ${orders.length} pedidos, ${accounts.length} contas, ${customers.length} clientes`);
    
    // Filtrar pedidos de crediário
    const creditOrders = orders.filter(order => order.paymentMethod === 'credit');
    console.log(`💳 Pedidos de crediário: ${creditOrders.length}`);
    
    console.log('\n🔍 Verificando inconsistências...');
    
    const inconsistencies = [];
    
    for (const order of creditOrders) {
      const customer = customers.find(c => c.id === order.customerId);
      const account = accounts.find(a => a.customerId === order.customerId);
      
      if (!account) {
        console.log(`⚠️ Conta não encontrada para pedido ${order.id} (${customer?.name})`);
        continue;
      }
      
      const remainingAmount = parseFloat(account.remainingAmount || '0');
      const isPaidOff = remainingAmount <= 0;
      const isOrderCompleted = order.status === 'completed';
      
      console.log(`\n📋 Pedido ${order.orderNumber || order.id}:`);
      console.log(`   Cliente: ${customer?.name || 'N/A'}`);
      console.log(`   Status do Pedido: ${order.status}`);
      console.log(`   Status da Conta: ${account.status}`);
      console.log(`   Valor Restante: R$ ${remainingAmount.toFixed(2)}`);
      console.log(`   Conta Quitada: ${isPaidOff ? 'SIM' : 'NÃO'}`);
      console.log(`   Pedido Concluído: ${isOrderCompleted ? 'SIM' : 'NÃO'}`);
      
      // Verificar inconsistências
      if (isPaidOff && !isOrderCompleted) {
        console.log(`❌ INCONSISTÊNCIA: Conta quitada mas pedido não concluído!`);
        inconsistencies.push({
          type: 'paid_but_not_completed',
          order,
          account,
          customer: customer?.name
        });
      } else if (!isPaidOff && isOrderCompleted) {
        console.log(`❌ INCONSISTÊNCIA: Pedido concluído mas conta não quitada!`);
        inconsistencies.push({
          type: 'completed_but_not_paid',
          order,
          account,
          customer: customer?.name
        });
      } else {
        console.log(`✅ Status consistente`);
      }
    }
    
    console.log(`\n📊 RESUMO:`);
    console.log(`   Total de inconsistências: ${inconsistencies.length}`);
    
    if (inconsistencies.length > 0) {
      console.log('\n🔧 Inconsistências encontradas:');
      inconsistencies.forEach((inc, index) => {
        console.log(`   ${index + 1}. ${inc.customer} (${inc.order.orderNumber || inc.order.id}) - ${inc.type}`);
      });
      
      console.log('\n🚀 Preparando correção automática...');
      return inconsistencies;
    } else {
      console.log('✅ Nenhuma inconsistência encontrada!');
      return [];
    }
    
  } catch (error) {
    console.error('❌ Erro na investigação:', error.message);
    return [];
  }
}

// Função para corrigir inconsistências
async function fixInconsistencies(inconsistencies) {
  console.log('\n🔧 Iniciando correção de inconsistências...');
  
  for (const inc of inconsistencies) {
    try {
      if (inc.type === 'paid_but_not_completed') {
        console.log(`\n🔄 Atualizando pedido ${inc.order.orderNumber || inc.order.id} para "completed"...`);
        
        const response = await fetch(`http://localhost:5170/api/admin/orders/${inc.order.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'completed',
            paymentStatus: 'paid'
          }),
        });
        
        if (response.ok) {
          console.log(`✅ Pedido ${inc.customer} atualizado com sucesso!`);
        } else {
          console.log(`❌ Erro ao atualizar pedido ${inc.customer}`);
        }
      }
      
      if (inc.type === 'completed_but_not_paid') {
        console.log(`\n🔄 Atualizando pedido ${inc.order.orderNumber || inc.order.id} para "pending"...`);
        
        const response = await fetch(`http://localhost:5170/api/admin/orders/${inc.order.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'pending',
            paymentStatus: 'pending'
          }),
        });
        
        if (response.ok) {
          console.log(`✅ Pedido ${inc.customer} revertido para pendente!`);
        } else {
          console.log(`❌ Erro ao reverter pedido ${inc.customer}`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Erro ao corrigir pedido ${inc.customer}:`, error.message);
    }
  }
  
  console.log('\n🎉 Correção concluída!');
}

// Executar investigação e correção
investigateStatusInconsistency()
  .then(inconsistencies => {
    if (inconsistencies.length > 0) {
      return fixInconsistencies(inconsistencies);
    }
  })
  .then(() => {
    console.log('\n🔍 Verificação final...');
    return investigateStatusInconsistency();
  })
  .then(() => {
    console.log('\n✅ Processo concluído!');
  });