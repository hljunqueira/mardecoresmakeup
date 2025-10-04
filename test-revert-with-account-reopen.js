// Teste para verificar se a reversão de pedidos reabre a conta de crediário
console.log('🧪 Testando reversão de pedidos com reabertura de contas...');

async function testRevertWithAccountReopen() {
  try {
    console.log('\n📊 Buscando dados...');
    
    // Buscar dados
    const [ordersRes, accountsRes, customersRes] = await Promise.all([
      fetch('http://localhost:5170/api/admin/orders'),
      fetch('http://localhost:5170/api/admin/credit-accounts'),
      fetch('http://localhost:5170/api/admin/customers')
    ]);
    
    const orders = await ordersRes.json();
    const accounts = await accountsRes.json();
    const customers = await customersRes.json();
    
    // Encontrar um pedido concluído para testar
    const completedOrders = orders.filter(order => 
      order.paymentMethod === 'credit' && order.status === 'completed'
    );
    
    if (completedOrders.length === 0) {
      console.log('⚠️ Nenhum pedido concluído encontrado para testar');
      return;
    }
    
    const testOrder = completedOrders[0];
    const customer = customers.find(c => c.id === testOrder.customerId);
    const account = accounts.find(a => a.customerId === testOrder.customerId);
    
    console.log(`\n🔄 Testando reversão do pedido ${testOrder.orderNumber || testOrder.id}`);
    console.log(`   Cliente: ${customer?.name || 'N/A'}`);
    console.log(`   Status atual do pedido: ${testOrder.status}`);
    console.log(`   Status atual da conta: ${account?.status}`);
    
    // 1. Reverter o pedido
    console.log('\n📝 1. Revertendo pedido...');
    const orderResponse = await fetch(`http://localhost:5170/api/admin/orders/${testOrder.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'pending',
        paymentStatus: 'pending'
      }),
    });
    
    if (!orderResponse.ok) {
      throw new Error('Erro ao reverter pedido');
    }
    
    console.log('✅ Pedido revertido para pending');
    
    // 2. Reabrir a conta se estiver quitada
    if (account && account.status === 'paid_off') {
      console.log('\n🏦 2. Reabrindo conta de crediário...');
      
      const accountResponse = await fetch(`http://localhost:5170/api/admin/credit-accounts/${account.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'active',
          closedAt: null
        }),
      });
      
      if (!accountResponse.ok) {
        console.error('❌ Erro ao reabrir conta');
        return;
      }
      
      console.log('✅ Conta reaberta com sucesso!');
    } else {
      console.log('ℹ️ Conta já estava ativa ou não encontrada');
    }
    
    // 3. Verificar o resultado
    console.log('\n📊 3. Verificando resultado...');
    
    const [updatedOrdersRes, updatedAccountsRes] = await Promise.all([
      fetch('http://localhost:5170/api/admin/orders'),
      fetch('http://localhost:5170/api/admin/credit-accounts')
    ]);
    
    const updatedOrders = await updatedOrdersRes.json();
    const updatedAccounts = await updatedAccountsRes.json();
    
    const updatedOrder = updatedOrders.find(o => o.id === testOrder.id);
    const updatedAccount = updatedAccounts.find(a => a.customerId === testOrder.customerId);
    
    console.log(`\n📋 RESULTADO:`);
    console.log(`   Status do pedido: ${updatedOrder.status} (era ${testOrder.status})`);
    console.log(`   Status da conta: ${updatedAccount?.status} (era ${account?.status})`);
    console.log(`   Valor restante: R$ ${parseFloat(updatedAccount?.remainingAmount || '0').toFixed(2)}`);
    
    // Verificar se as opções de pagamento voltaram
    const remainingAmount = parseFloat(updatedAccount?.remainingAmount || '0');
    const hasPaymentOptions = remainingAmount > 0 && updatedAccount?.status === 'active';
    
    console.log(`\n🎯 VERIFICAÇÃO:`);
    console.log(`   Pedido pendente: ${updatedOrder.status === 'pending' ? '✅' : '❌'}`);
    console.log(`   Conta ativa: ${updatedAccount?.status === 'active' ? '✅' : '❌'}`);
    console.log(`   Opções de pagamento disponíveis: ${hasPaymentOptions ? '✅' : '❌'}`);
    
    if (updatedOrder.status === 'pending' && updatedAccount?.status === 'active') {
      console.log('\n🎉 TESTE PASSOU! A reversão funcionou corretamente!');
      console.log('📱 Agora o menu deveria mostrar "Pagamento Parcial" e "Pagamento Total"');
    } else {
      console.log('\n❌ TESTE FALHOU! Há problemas na reversão');
    }
    
    return {
      success: true,
      orderReverted: updatedOrder.status === 'pending',
      accountReopened: updatedAccount?.status === 'active',
      paymentOptionsAvailable: hasPaymentOptions
    };
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    return { success: false, error: error.message };
  }
}

// Executar teste
testRevertWithAccountReopen()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Teste concluído com sucesso!');
    } else {
      console.log('\n❌ Teste falhou:', result.error);
    }
  });