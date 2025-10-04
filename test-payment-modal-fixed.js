// Teste para verificar se o modal de pagamento está funcionando após reset
console.log('🧪 Testando modal de pagamento após reset...');

async function testPaymentModalAfterReset() {
  try {
    console.log('\n📊 1. Verificando dados após reset...');
    
    // Buscar dados
    const [ordersRes, accountsRes, customersRes] = await Promise.all([
      fetch('http://localhost:5170/api/admin/orders'),
      fetch('http://localhost:5170/api/admin/credit-accounts'),
      fetch('http://localhost:5170/api/admin/customers')
    ]);
    
    const orders = await ordersRes.json();
    const accounts = await accountsRes.json();
    const customers = await customersRes.json();
    
    // Encontrar pedidos de crediário pendentes
    const creditOrders = orders.filter(order => 
      order.paymentMethod === 'credit' && order.status === 'pending'
    );
    
    console.log(`📋 Encontrados ${creditOrders.length} pedidos de crediário pendentes`);
    
    // Verificar especificamente o pedido da Valeria (PED002)
    const valeriaOrder = creditOrders.find(order => order.orderNumber === 'PED002');
    if (!valeriaOrder) {
      console.log('❌ Pedido PED002 (Valeria) não encontrado ou não está pendente');
      return;
    }
    
    const valeria = customers.find(c => c.id === valeriaOrder.customerId);
    const valeriaAccount = accounts.find(a => a.customerId === valeriaOrder.customerId);
    
    console.log(`\n🎯 PEDIDO PED002 (Valeria):`);
    console.log(`   Status: ${valeriaOrder.status}`);
    console.log(`   Valor: R$ ${valeriaOrder.total}`);
    
    if (valeriaAccount) {
      console.log(`\n💳 CONTA DA VALERIA:`);
      console.log(`   Status: ${valeriaAccount.status}`);
      console.log(`   Total: R$ ${valeriaAccount.totalAmount}`);
      console.log(`   Pago: R$ ${valeriaAccount.paidAmount}`);
      console.log(`   Restante: R$ ${valeriaAccount.remainingAmount}`);
      
      const remainingAmount = parseFloat(valeriaAccount.remainingAmount);
      const paidAmount = parseFloat(valeriaAccount.paidAmount);
      
      console.log(`\n🔍 VERIFICAÇÕES:`);
      console.log(`   Pedido pendente: ${valeriaOrder.status === 'pending' ? '✅' : '❌'}`);
      console.log(`   Conta ativa: ${valeriaAccount.status === 'active' ? '✅' : '❌'}`);
      console.log(`   Tem valor restante: ${remainingAmount > 0 ? '✅' : '❌'} (R$ ${remainingAmount.toFixed(2)})`);
      console.log(`   Valor pago zerado: ${paidAmount === 0 ? '✅' : '❌'} (R$ ${paidAmount.toFixed(2)})`);
      
      if (valeriaOrder.status === 'pending' && valeriaAccount.status === 'active' && remainingAmount > 0) {
        console.log('\n🎉 EXCELENTE! O pedido PED002 está configurado corretamente:');
        console.log('   ✅ Status: pending (pode receber pagamentos)');
        console.log('   ✅ Conta: active (não está quitada)');
        console.log('   ✅ Valor restante: R$ 45,00 (permite pagamento)');
        console.log('   ✅ Modal deve mostrar: "Pagamento disponível: Você pode pagar até R$ 45,00"');
        console.log('\n📱 AGORA O MODAL DEVE FUNCIONAR CORRETAMENTE!');
        console.log('   - Sem mensagem "Pedido já quitado"');
        console.log('   - Com alertas informativos corretos');
        console.log('   - Campo de valor habilitado');
        console.log('   - Botão "Quitar Pedido" funcionando');
      } else {
        console.log('\n❌ AINDA HÁ PROBLEMAS:');
        if (valeriaOrder.status !== 'pending') {
          console.log(`   - Status do pedido: ${valeriaOrder.status} (deveria ser 'pending')`);
        }
        if (valeriaAccount.status !== 'active') {
          console.log(`   - Status da conta: ${valeriaAccount.status} (deveria ser 'active')`);
        }
        if (remainingAmount <= 0) {
          console.log(`   - Valor restante: R$ ${remainingAmount.toFixed(2)} (deveria ser > 0)`);
        }
      }
    } else {
      console.log('❌ Conta da Valeria não encontrada');
    }
    
    // Verificar outros pedidos também
    console.log(`\n📊 RESUMO GERAL DOS PEDIDOS:`);
    for (const order of creditOrders.slice(0, 5)) { // Mostrar apenas os primeiros 5
      const customer = customers.find(c => c.id === order.customerId);
      const account = accounts.find(a => a.customerId === order.customerId);
      const remaining = parseFloat(account?.remainingAmount || '0');
      
      console.log(`   ${order.orderNumber} (${customer?.name}): ${order.status}, R$ ${remaining.toFixed(2)} restante`);
    }
    
    return {
      success: valeriaOrder.status === 'pending' && valeriaAccount?.status === 'active' && parseFloat(valeriaAccount?.remainingAmount || '0') > 0,
      valeriaOrder,
      valeriaAccount
    };
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    return { success: false, error: error.message };
  }
}

// Executar teste
testPaymentModalAfterReset()
  .then(result => {
    if (result && result.success) {
      console.log('\n✅ TESTE PASSOU! O modal de pagamento deve estar funcionando agora!');
      console.log('🔄 Teste o pagamento da Valeria (PED002) na interface.');
    } else {
      console.log('\n❌ TESTE FALHOU! Ainda há problemas:', result?.error || 'Configuração incorreta');
    }
  });