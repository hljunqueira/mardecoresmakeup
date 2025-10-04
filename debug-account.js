// Debug da conta para entender o problema do valor restante
console.log('🔍 Debugando conta de crediário...');

async function debugAccount() {
  try {
    // Buscar dados
    const [ordersRes, accountsRes, customersRes] = await Promise.all([
      fetch('http://localhost:5170/api/admin/orders'),
      fetch('http://localhost:5170/api/admin/credit-accounts'),
      fetch('http://localhost:5170/api/admin/customers')
    ]);
    
    const orders = await ordersRes.json();
    const accounts = await accountsRes.json();
    const customers = await customersRes.json();
    
    // Buscar conta da Valeria
    const valeria = customers.find(c => c.name === 'Valeria');
    const valeriaAccount = accounts.find(a => a.customerId === valeria?.id);
    const valeriaOrders = orders.filter(o => o.customerId === valeria?.id && o.paymentMethod === 'credit');
    
    console.log('\n📊 DADOS DA VALERIA:');
    console.log('Cliente:', valeria);
    console.log('\nConta de crediário:', {
      id: valeriaAccount?.id,
      status: valeriaAccount?.status,
      totalAmount: valeriaAccount?.totalAmount,
      paidAmount: valeriaAccount?.paidAmount,
      remainingAmount: valeriaAccount?.remainingAmount,
      closedAt: valeriaAccount?.closedAt
    });
    
    console.log('\nPedidos:');
    valeriaOrders.forEach(order => {
      console.log(`  - ${order.orderNumber}: ${order.status}, R$ ${order.total}`);
    });
    
    // Mostrar todos os campos da conta
    console.log('\n🔍 TODOS OS CAMPOS DA CONTA:');
    console.log(JSON.stringify(valeriaAccount, null, 2));
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

debugAccount();