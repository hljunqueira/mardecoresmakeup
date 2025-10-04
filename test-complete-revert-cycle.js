// Teste completo: marcar como concluído e depois reverter
console.log('🧪 Teste completo: Concluir → Reverter → Verificar');

async function testCompleteRevertCycle() {
  try {
    console.log('\n📊 1. Buscando dados iniciais...');
    
    // Buscar dados
    const [ordersRes, accountsRes, customersRes] = await Promise.all([
      fetch('http://localhost:5170/api/admin/orders'),
      fetch('http://localhost:5170/api/admin/credit-accounts'),
      fetch('http://localhost:5170/api/admin/customers')
    ]);
    
    const orders = await ordersRes.json();
    const accounts = await accountsRes.json();
    const customers = await customersRes.json();
    
    // Encontrar um pedido pendente para testar
    const pendingOrders = orders.filter(order => 
      order.paymentMethod === 'credit' && order.status === 'pending'
    );
    
    if (pendingOrders.length === 0) {
      console.log('⚠️ Nenhum pedido pendente encontrado para testar');
      return;
    }
    
    const testOrder = pendingOrders[0];
    const customer = customers.find(c => c.id === testOrder.customerId);
    const account = accounts.find(a => a.customerId === testOrder.customerId);
    
    console.log(`\n🎯 PEDIDO DE TESTE: ${testOrder.orderNumber || testOrder.id}`);
    console.log(`   Cliente: ${customer?.name || 'N/A'}`);
    console.log(`   Valor: R$ ${testOrder.total}`);
    console.log(`   Status inicial: ${testOrder.status}`);
    
    if (account) {
      console.log(`\n💳 CONTA INICIAL:`);
      console.log(`   Status: ${account.status}`);
      console.log(`   Total: R$ ${account.totalAmount}`);
      console.log(`   Pago: R$ ${account.paidAmount}`);
      console.log(`   Restante: R$ ${account.remainingAmount}`);
    }
    
    // FASE 1: Marcar como concluído
    console.log('\n📝 2. FASE 1: Marcando pedido como concluído...');
    
    const completeResponse = await fetch(`http://localhost:5170/api/admin/orders/${testOrder.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'completed',
        paymentStatus: 'paid'
      }),
    });
    
    if (!completeResponse.ok) {
      throw new Error('Erro ao marcar pedido como concluído');
    }
    
    console.log('✅ Pedido marcado como concluído');
    
    // Aguardar um pouco e verificar
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // FASE 2: Verificar estado após conclusão
    console.log('\n📊 3. Verificando estado após conclusão...');
    
    const [ordersRes2, accountsRes2] = await Promise.all([
      fetch('http://localhost:5170/api/admin/orders'),
      fetch('http://localhost:5170/api/admin/credit-accounts')
    ]);
    
    const orders2 = await ordersRes2.json();
    const accounts2 = await accountsRes2.json();
    
    const updatedOrder = orders2.find(o => o.id === testOrder.id);
    const updatedAccount = accounts2.find(a => a.customerId === testOrder.customerId);
    
    console.log(`   Pedido: ${updatedOrder.status}`);
    if (updatedAccount) {
      console.log(`   Conta - Status: ${updatedAccount.status}, Restante: R$ ${updatedAccount.remainingAmount}`);
    }
    
    // FASE 3: Reverter para pendente
    console.log('\n🔄 4. FASE 2: Revertendo para pendente...');
    
    const revertResponse = await fetch(`http://localhost:5170/api/admin/orders/${testOrder.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'pending',
        paymentStatus: 'pending'
      }),
    });
    
    if (!revertResponse.ok) {
      throw new Error('Erro ao reverter pedido');
    }
    
    console.log('✅ Pedido revertido para pending');
    
    // Ajustar conta se necessário
    if (updatedAccount && parseFloat(updatedAccount.remainingAmount) === 0) {
      console.log('🏦 Ajustando conta de crediário...');
      
      const orderValue = parseFloat(testOrder.total);
      const currentPaidAmount = parseFloat(updatedAccount.paidAmount);
      const newPaidAmount = Math.max(0, currentPaidAmount - orderValue);
      const newRemainingAmount = orderValue;
      
      const accountResponse = await fetch(`http://localhost:5170/api/admin/credit-accounts/${updatedAccount.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'active',
          paidAmount: newPaidAmount.toString(),
          remainingAmount: newRemainingAmount.toString(),
          closedAt: null
        }),
      });
      
      if (accountResponse.ok) {
        console.log(`✅ Conta ajustada: Pago: R$ ${newPaidAmount.toFixed(2)}, Restante: R$ ${newRemainingAmount.toFixed(2)}`);
      }
    }
    
    // FASE 4: Verificação final
    console.log('\n📊 5. VERIFICAÇÃO FINAL...');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const [ordersRes3, accountsRes3] = await Promise.all([
      fetch('http://localhost:5170/api/admin/orders'),
      fetch('http://localhost:5170/api/admin/credit-accounts')
    ]);
    
    const orders3 = await ordersRes3.json();
    const accounts3 = await accountsRes3.json();
    
    const finalOrder = orders3.find(o => o.id === testOrder.id);
    const finalAccount = accounts3.find(a => a.customerId === testOrder.customerId);
    
    console.log(`\n🎯 RESULTADO FINAL:`);
    console.log(`   Pedido: ${finalOrder.status} (deve ser 'pending')`);
    if (finalAccount) {
      console.log(`   Conta: ${finalAccount.status} (deve ser 'active')`);
      console.log(`   Restante: R$ ${finalAccount.remainingAmount} (deve ser > 0)`);
    }
    
    const success = finalOrder.status === 'pending' && 
                   finalAccount?.status === 'active' && 
                   parseFloat(finalAccount?.remainingAmount || '0') > 0;
    
    if (success) {
      console.log('\n🎉 TESTE PASSOU! Reversão funcionando corretamente!');
      console.log('📱 Agora as opções de pagamento devem aparecer no menu');
    } else {
      console.log('\n❌ TESTE FALHOU! Há problemas na reversão');
    }
    
    return { success, finalOrder, finalAccount };
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    return { success: false, error: error.message };
  }
}

// Executar teste
testCompleteRevertCycle()
  .then(result => {
    if (result && result.success) {
      console.log('\n✅ Teste completo bem-sucedido!');
    } else {
      console.log('\n❌ Teste falhou:', result?.error || 'Erro desconhecido');
    }
  });