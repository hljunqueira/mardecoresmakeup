// Investigar problema da conta da Duda
async function investigateDudaAccount() {
  try {
    console.log('🔍 Investigando conta da Duda...');
    
    // Buscar dados da Duda
    const customersResponse = await fetch('http://localhost:5170/api/admin/customers');
    const customers = await customersResponse.json();
    const duda = customers.find(c => c.name === 'Duda');
    
    if (!duda) {
      console.log('❌ Duda não encontrada');
      return;
    }
    
    console.log(`👤 Duda ID: ${duda.id}`);
    
    // Buscar conta de crediário da Duda
    const accountsResponse = await fetch('http://localhost:5170/api/admin/credit-accounts');
    const accounts = await accountsResponse.json();
    const dudaAccount = accounts.find(acc => acc.customerId === duda.id);
    
    if (!dudaAccount) {
      console.log('❌ Conta de crediário da Duda não encontrada');
      return;
    }
    
    console.log('💳 Conta da Duda:');
    console.log(`   ID: ${dudaAccount.id}`);
    console.log(`   Total Amount: R$ ${dudaAccount.totalAmount}`);
    console.log(`   Remaining Amount: R$ ${dudaAccount.remainingAmount}`);
    console.log(`   Account Number: ${dudaAccount.accountNumber}`);
    
    // Buscar pedidos da Duda
    const ordersResponse = await fetch('http://localhost:5170/api/admin/orders');
    const orders = await ordersResponse.json();
    const dudaOrders = orders.filter(order => 
      order.customerId === duda.id || 
      order.customerName === 'Duda'
    );
    
    console.log(`📋 Pedidos da Duda (${dudaOrders.length}):`);
    let totalOrdersValue = 0;
    dudaOrders.forEach((order, index) => {
      const orderValue = parseFloat(order.total || '0');
      totalOrdersValue += orderValue;
      console.log(`   ${index + 1}. ${order.orderNumber}: R$ ${orderValue.toFixed(2)} (${order.paymentMethod}) - ${order.status}`);
    });
    
    console.log(`\n📊 Resumo:`);
    console.log(`   Total dos pedidos: R$ ${totalOrdersValue.toFixed(2)}`);
    console.log(`   Total na conta: R$ ${dudaAccount.totalAmount}`);
    console.log(`   Diferença: R$ ${(parseFloat(dudaAccount.totalAmount) - totalOrdersValue).toFixed(2)}`);
    
    if (parseFloat(dudaAccount.totalAmount) !== totalOrdersValue) {
      console.log('\n⚠️ PROBLEMA DETECTADO: O valor da conta não bate com os pedidos!');
      console.log(`\n🔧 Correção necessária:`);
      console.log(`   Valor correto da conta deveria ser: R$ ${totalOrdersValue.toFixed(2)}`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

investigateDudaAccount();