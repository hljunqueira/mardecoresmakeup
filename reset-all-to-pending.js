// Script para voltar todos os pedidos de crediário para pendente
console.log('🔄 Voltando todos os pedidos de crediário para pendente...');

async function resetAllCreditOrdersToPending() {
  try {
    console.log('\n📊 1. Buscando dados...');
    
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
    
    let processedOrders = 0;
    let processedAccounts = 0;
    
    // 1. Primeiro, voltar todos os pedidos para pending
    console.log('\n📝 2. Revertendo todos os pedidos para pending...');
    
    for (const order of creditOrders) {
      if (order.status !== 'pending') {
        const customer = customers.find(c => c.id === order.customerId);
        console.log(`   🔄 Revertendo ${order.orderNumber} (${customer?.name})`);
        
        try {
          const response = await fetch(`http://localhost:5170/api/admin/orders/${order.id}`, {
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
            processedOrders++;
          } else {
            console.error(`   ❌ Erro ao reverter ${order.orderNumber}`);
          }
        } catch (error) {
          console.error(`   ❌ Erro ao reverter ${order.orderNumber}:`, error.message);
        }
      } else {
        console.log(`   ✅ ${order.orderNumber} já está pending`);
      }
    }
    
    // 2. Segundo, ajustar todas as contas de crediário
    console.log('\n🏦 3. Ajustando contas de crediário...');
    
    // Agrupar pedidos por cliente
    const ordersByCustomer = {};
    creditOrders.forEach(order => {
      if (!ordersByCustomer[order.customerId]) {
        ordersByCustomer[order.customerId] = [];
      }
      ordersByCustomer[order.customerId].push(order);
    });
    
    for (const account of accounts) {
      const customer = customers.find(c => c.id === account.customerId);
      const customerOrders = ordersByCustomer[account.customerId] || [];
      
      if (customerOrders.length === 0) continue;
      
      console.log(`   🔧 Ajustando conta de ${customer?.name}`);
      
      // Calcular valor total dos pedidos deste cliente
      const totalOrderValue = customerOrders.reduce((sum, order) => {
        return sum + parseFloat(order.total?.toString() || '0');
      }, 0);
      
      console.log(`     - Valor total dos pedidos: R$ ${totalOrderValue.toFixed(2)}`);
      console.log(`     - Conta atual: Total: R$ ${account.totalAmount}, Pago: R$ ${account.paidAmount}, Restante: R$ ${account.remainingAmount}`);
      
      // Resetar conta: zerar pago, colocar total como restante
      const newValues = {
        status: 'active',
        totalAmount: totalOrderValue.toString(),
        paidAmount: '0.00',
        remainingAmount: totalOrderValue.toString(),
        closedAt: null
      };
      
      try {
        const response = await fetch(`http://localhost:5170/api/admin/credit-accounts/${account.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newValues),
        });
        
        if (response.ok) {
          processedAccounts++;
          console.log(`     ✅ Conta ajustada: Pago: R$ 0,00, Restante: R$ ${totalOrderValue.toFixed(2)}`);
        } else {
          console.error(`     ❌ Erro ao ajustar conta de ${customer?.name}`);
        }
      } catch (error) {
        console.error(`     ❌ Erro ao ajustar conta de ${customer?.name}:`, error.message);
      }
    }
    
    console.log(`\n📊 RESUMO:`);
    console.log(`   Pedidos processados: ${processedOrders}/${creditOrders.length}`);
    console.log(`   Contas ajustadas: ${processedAccounts}/${accounts.length}`);
    
    // 3. Verificação final
    console.log('\n🔍 4. Verificação final...');
    
    const [finalOrdersRes, finalAccountsRes] = await Promise.all([
      fetch('http://localhost:5170/api/admin/orders'),
      fetch('http://localhost:5170/api/admin/credit-accounts')
    ]);
    
    const finalOrders = await finalOrdersRes.json();
    const finalAccounts = await finalAccountsRes.json();
    
    const finalCreditOrders = finalOrders.filter(order => order.paymentMethod === 'credit');
    const pendingCount = finalCreditOrders.filter(order => order.status === 'pending').length;
    const activeAccountsCount = finalAccounts.filter(account => account.status === 'active').length;
    
    console.log(`\n🎯 RESULTADO FINAL:`);
    console.log(`   Pedidos pendentes: ${pendingCount}/${finalCreditOrders.length}`);
    console.log(`   Contas ativas: ${activeAccountsCount}/${finalAccounts.length}`);
    
    if (pendingCount === finalCreditOrders.length) {
      console.log('\n🎉 SUCESSO! Todos os pedidos estão pendentes e as contas foram ajustadas!');
      console.log('📱 Agora todas as opções de pagamento devem estar disponíveis.');
    } else {
      console.log('\n⚠️ Alguns pedidos podem não ter sido processados corretamente.');
    }
    
    return {
      success: pendingCount === finalCreditOrders.length,
      processedOrders,
      processedAccounts,
      pendingCount,
      activeAccountsCount
    };
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    return { success: false, error: error.message };
  }
}

// Executar reset
resetAllCreditOrdersToPending()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Reset completo realizado com sucesso!');
      console.log('🔄 Recarregue a página para ver as mudanças.');
    } else {
      console.log('\n❌ Reset falhou:', result.error || 'Erro desconhecido');
    }
  });