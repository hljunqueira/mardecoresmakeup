// Teste para verificar se o erro 500 foi corrigido
console.log('🧪 Testando se o erro 500 foi corrigido...');

async function testPaymentAfterFix() {
  try {
    console.log('\n📊 1. Preparando teste...');
    
    // Primeiro, garantir que há um pedido pendente para testar
    const ordersRes = await fetch('http://localhost:5170/api/admin/orders');
    const orders = await ordersRes.json();
    
    const pendingCreditOrders = orders.filter(order => 
      order.paymentMethod === 'credit' && order.status === 'pending'
    );
    
    if (pendingCreditOrders.length === 0) {
      console.log('⚠️ Nenhum pedido pendente. Executando reset primeiro...');
      
      // Executar reset
      const resetResponse = await fetch('http://localhost:5170/api/admin/orders');
      const allOrders = await resetResponse.json();
      const creditOrders = allOrders.filter(o => o.paymentMethod === 'credit');
      
      for (const order of creditOrders.slice(0, 3)) { // Reverter apenas 3 para teste
        await fetch(`http://localhost:5170/api/admin/orders/${order.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'pending', paymentStatus: 'pending' })
        });
      }
      
      console.log('✅ Reset executado, aguardando...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Buscar dados atualizados
    const [newOrdersRes, accountsRes] = await Promise.all([
      fetch('http://localhost:5170/api/admin/orders'),
      fetch('http://localhost:5170/api/admin/credit-accounts')
    ]);
    
    const newOrders = await newOrdersRes.json();
    const accounts = await accountsRes.json();
    
    const testOrder = newOrders.find(order => 
      order.paymentMethod === 'credit' && order.status === 'pending'
    );
    
    if (!testOrder) {
      console.log('❌ Ainda não há pedidos pendentes para testar');
      return;
    }
    
    const account = accounts.find(a => a.customerId === testOrder.customerId);
    const paymentAmount = parseFloat(account.remainingAmount);
    
    console.log(`\n🎯 TESTANDO: ${testOrder.orderNumber}`);
    console.log(`   Valor do pagamento: R$ ${paymentAmount.toFixed(2)}`);
    
    // 2. Testar pagamento via API (simula o que o modal faz)
    console.log('\n💰 2. Processando pagamento...');
    
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
          notes: 'Teste após correção do erro 500',
          status: 'completed'
        }),
      });
      
      console.log(`   Status: ${paymentResponse.status}`);
      
      if (paymentResponse.status === 500) {
        const errorText = await paymentResponse.text();
        console.log(`   ❌ ERRO 500 AINDA EXISTE: ${errorText}`);
        return false;
      }
      
      if (!paymentResponse.ok) {
        const errorText = await paymentResponse.text();
        console.log(`   ❌ Outro erro: ${errorText}`);
        return false;
      }
      
      const paymentResult = await paymentResponse.json();
      console.log(`   ✅ Pagamento registrado: ${paymentResult.id}`);
      
      // 3. Verificar se a sincronização funcionou
      console.log('\n🔍 3. Verificando sincronização...');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const [finalOrdersRes, finalAccountsRes] = await Promise.all([
        fetch('http://localhost:5170/api/admin/orders'),
        fetch('http://localhost:5170/api/admin/credit-accounts')
      ]);
      
      const finalOrders = await finalOrdersRes.json();
      const finalAccounts = await finalAccountsRes.json();
      
      const finalOrder = finalOrders.find(o => o.id === testOrder.id);
      const finalAccount = finalAccounts.find(a => a.id === account.id);
      
      console.log(`   Pedido: ${testOrder.status} → ${finalOrder.status}`);
      console.log(`   Conta: ${account.status} → ${finalAccount.status}`);
      console.log(`   Restante: R$ ${account.remainingAmount} → R$ ${finalAccount.remainingAmount}`);
      
      const success = finalOrder.status === 'completed' && 
                     finalAccount.status === 'paid_off' && 
                     parseFloat(finalAccount.remainingAmount) === 0;
      
      if (success) {
        console.log('\n🎉 SUCESSO TOTAL!');
        console.log('✅ Erro 500 corrigido');
        console.log('✅ Pagamento funciona perfeitamente');
        console.log('✅ Sincronização automática funcionando');
        console.log('\n📱 O modal de pagamento deve funcionar agora!');
      } else {
        console.log('\n⚠️ Pagamento funcionou mas sincronização tem problemas');
      }
      
      return success;
      
    } catch (error) {
      console.log(`   ❌ Erro na requisição: ${error.message}`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    return false;
  }
}

testPaymentAfterFix()
  .then(result => {
    if (result) {
      console.log('\n✅ TESTE PASSOU! O erro 500 foi corrigido!');
    } else {
      console.log('\n❌ TESTE FALHOU! Ainda há problemas.');
    }
  });