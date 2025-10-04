// Debug do erro 500 ao processar pagamento
console.log('🔍 Debugando erro 500 no pagamento...');

async function debugPaymentError() {
  try {
    console.log('\n📊 1. Verificando estado atual...');
    
    // Buscar dados
    const [ordersRes, accountsRes, customersRes] = await Promise.all([
      fetch('http://localhost:5170/api/admin/orders'),
      fetch('http://localhost:5170/api/admin/credit-accounts'),
      fetch('http://localhost:5170/api/admin/customers')
    ]);
    
    const orders = await ordersRes.json();
    const accounts = await accountsRes.json();
    const customers = await customersRes.json();
    
    // Encontrar pedidos pendentes
    const pendingCreditOrders = orders.filter(order => 
      order.paymentMethod === 'credit' && order.status === 'pending'
    );
    
    console.log(`📋 Pedidos pendentes: ${pendingCreditOrders.length}`);
    
    if (pendingCreditOrders.length === 0) {
      console.log('⚠️ Nenhum pedido pendente encontrado. Vamos criar um cenário de teste...');
      return;
    }
    
    // Pegar o primeiro pedido pendente para testar
    const testOrder = pendingCreditOrders[0];
    const customer = customers.find(c => c.id === testOrder.customerId);
    const account = accounts.find(a => a.customerId === testOrder.customerId);
    
    console.log(`\n🎯 TESTANDO PEDIDO: ${testOrder.orderNumber} (${customer?.name})`);
    console.log(`   Valor: R$ ${testOrder.total}`);
    console.log(`   Conta ID: ${account?.id}`);
    
    if (!account) {
      console.log('❌ Conta não encontrada para este pedido');
      return;
    }
    
    console.log(`\n💳 CONTA ATUAL:`);
    console.log(`   Status: ${account.status}`);
    console.log(`   Total: R$ ${account.totalAmount}`);
    console.log(`   Pago: R$ ${account.paidAmount}`);
    console.log(`   Restante: R$ ${account.remainingAmount}`);
    
    // Simular pagamento total
    const paymentAmount = parseFloat(account.remainingAmount);
    
    console.log(`\n💰 SIMULANDO PAGAMENTO DE R$ ${paymentAmount.toFixed(2)}...`);
    
    // 1. Tentar registrar o pagamento primeiro
    console.log('\n📝 1. Registrando pagamento...');
    
    try {
      const paymentResponse = await fetch('http://localhost:5170/api/admin/credit-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creditAccountId: account.id,
          amount: paymentAmount,
          paymentMethod: 'pix',
          notes: 'Teste de pagamento via script',
          status: 'completed'
        }),
      });
      
      console.log(`   Response status: ${paymentResponse.status}`);
      
      if (!paymentResponse.ok) {
        const errorText = await paymentResponse.text();
        console.log(`   ❌ Erro no pagamento: ${errorText}`);
        return;
      }
      
      const paymentResult = await paymentResponse.json();
      console.log(`   ✅ Pagamento registrado: ${paymentResult.id}`);
      
    } catch (paymentError) {
      console.error(`   ❌ Erro ao registrar pagamento:`, paymentError.message);
      return;
    }
    
    // 2. Verificar se o webhook funcionou
    console.log('\n🔍 2. Verificando resultado após pagamento...');
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2s
    
    const [updatedOrdersRes, updatedAccountsRes] = await Promise.all([
      fetch('http://localhost:5170/api/admin/orders'),
      fetch('http://localhost:5170/api/admin/credit-accounts')
    ]);
    
    const updatedOrders = await updatedOrdersRes.json();
    const updatedAccounts = await updatedAccountsRes.json();
    
    const updatedOrder = updatedOrders.find(o => o.id === testOrder.id);
    const updatedAccount = updatedAccounts.find(a => a.id === account.id);
    
    console.log(`\n📊 RESULTADO:`);
    console.log(`   Pedido: ${testOrder.status} → ${updatedOrder.status}`);
    console.log(`   Conta: ${account.status} → ${updatedAccount.status}`);
    console.log(`   Restante: R$ ${account.remainingAmount} → R$ ${updatedAccount.remainingAmount}`);
    
    if (updatedOrder.status === 'completed' && updatedAccount.status === 'paid_off') {
      console.log('\n🎉 SUCESSO! O pagamento funcionou corretamente!');
    } else {
      console.log('\n❌ PROBLEMA! O pagamento não atualizou corretamente os status.');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

debugPaymentError();