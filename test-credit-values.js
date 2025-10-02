// Verificar valores dos pedidos de crediário
async function testCreditValues() {
  try {
    console.log('🔍 Testando valores do crediário...');
    
    // Buscar pedidos
    const ordersResponse = await fetch('http://localhost:5170/api/admin/orders');
    const orders = await ordersResponse.json();
    
    // Filtrar pedidos de crediário
    const creditOrders = orders.filter(order => order.paymentMethod === 'credit');
    const creditSalesValue = creditOrders.reduce((sum, order) => sum + parseFloat(order.total || '0'), 0);
    
    console.log('📊 Pedidos de crediário:');
    console.log(`   Total de pedidos: ${creditOrders.length}`);
    console.log(`   Valor total: R$ ${creditSalesValue.toFixed(2)}`);
    
    // Buscar contas de crediário
    const accountsResponse = await fetch('http://localhost:5170/api/admin/credit-accounts');
    const accounts = await accountsResponse.json();
    
    const totalPending = accounts.reduce((sum, acc) => sum + parseFloat(acc.remainingAmount || '0'), 0);
    
    console.log('💳 Contas de crediário:');
    console.log(`   Total de contas: ${accounts.length}`);
    console.log(`   A receber: R$ ${totalPending.toFixed(2)}`);
    
    console.log('\n🎯 Valores corretos para relatórios:');
    console.log(`   Crediário (valor total): R$ ${creditSalesValue.toFixed(2)}`);
    console.log(`   A Receber: R$ ${totalPending.toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testCreditValues();