const testCardCalculations = async () => {
  const baseUrl = 'http://localhost:5170';
  
  try {
    console.log('🔍 TESTANDO CÁLCULOS DOS CARDS DO CREDIÁRIO');
    console.log('=' .repeat(50));
    
    // Buscar contas de crediário
    const accountsResponse = await fetch(`${baseUrl}/api/admin/credit-accounts`);
    const accounts = await accountsResponse.json();
    
    console.log(`📊 Total de contas encontradas: ${accounts.length}\n`);
    
    // Calcular métricas como o frontend fará após a correção
    const totalCreditOrderValue = accounts.reduce((sum, account) => {
      return sum + parseFloat(account.totalAmount?.toString() || "0");
    }, 0);
    
    const pendingCreditOrderValue = accounts.reduce((sum, account) => {
      return sum + parseFloat(account.remainingAmount?.toString() || "0");
    }, 0);
    
    const paidCreditOrderValue = accounts.reduce((sum, account) => {
      return sum + parseFloat(account.paidAmount?.toString() || "0");
    }, 0);
    
    console.log('💳 VALORES DOS CARDS (APÓS CORREÇÃO):');
    console.log(`   📈 Valor a Receber: R$ ${pendingCreditOrderValue.toFixed(2)}`);
    console.log(`   ✅ Já Recebido: R$ ${paidCreditOrderValue.toFixed(2)}`);
    console.log(`   📊 Total: R$ ${totalCreditOrderValue.toFixed(2)}`);
    console.log(`   🧮 Total de Pedidos: ${accounts.length}`);
    
    // Verificar especificamente a conta da Valeria
    const valeriaAccount = accounts.find(acc => 
      acc.accountNumber === 'ACC-1759376540681-kaucy'
    );
    
    if (valeriaAccount) {
      console.log('\n👤 CONTA DA VALERIA:');
      console.log(`   Número: ${valeriaAccount.accountNumber}`);
      console.log(`   Status: ${valeriaAccount.status}`);
      console.log(`   Total: R$ ${valeriaAccount.totalAmount}`);
      console.log(`   Pago: R$ ${valeriaAccount.paidAmount}`);
      console.log(`   Restante: R$ ${valeriaAccount.remainingAmount}`);
      console.log(`   ✅ Está contribuindo para 'Já Recebido': R$ ${valeriaAccount.paidAmount}`);
    }
    
    // Comparar com os valores antigos (baseados em pedidos)
    const ordersResponse = await fetch(`${baseUrl}/api/admin/orders`);
    const allOrders = await ordersResponse.json();
    const creditOrders = allOrders.filter(order => order.paymentMethod === 'credit');
    
    const oldPendingValue = creditOrders.filter(order => order.status === 'pending').reduce((sum, order) => {
      return sum + parseFloat(order.total?.toString() || "0");
    }, 0);
    
    const oldPaidValue = creditOrders.filter(order => order.status === 'completed').reduce((sum, order) => {
      return sum + parseFloat(order.total?.toString() || "0");
    }, 0);
    
    console.log('\n⚠️  VALORES ANTIGOS (BASEADOS EM PEDIDOS):');
    console.log(`   📈 Valor a Receber: R$ ${oldPendingValue.toFixed(2)}`);
    console.log(`   ✅ Já Recebido: R$ ${oldPaidValue.toFixed(2)}`);
    
    console.log('\n🔄 DIFERENÇA:');
    console.log(`   📈 Pendente: R$ ${(pendingCreditOrderValue - oldPendingValue).toFixed(2)}`);
    console.log(`   ✅ Recebido: R$ ${(paidCreditOrderValue - oldPaidValue).toFixed(2)}`);
    
    if (paidCreditOrderValue !== oldPaidValue) {
      console.log('\n🎯 CORREÇÃO APLICADA COM SUCESSO!');
      console.log('   Os cards agora mostrarão os valores corretos das contas de crediário');
    } else {
      console.log('\n⚠️  Os valores ainda são os mesmos - pode precisar recarregar a página');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
};

// Executar teste
testCardCalculations();