// Verificar se existem outras inconsistências nas contas
async function checkAllAccountConsistency() {
  try {
    console.log('🔍 Verificando consistência de todas as contas...');
    
    const [customersResponse, accountsResponse, ordersResponse] = await Promise.all([
      fetch('http://localhost:5170/api/admin/customers'),
      fetch('http://localhost:5170/api/admin/credit-accounts'),
      fetch('http://localhost:5170/api/admin/orders')
    ]);
    
    const customers = await customersResponse.json();
    const accounts = await accountsResponse.json();
    const orders = await ordersResponse.json();
    
    console.log('📊 Verificando todas as contas...\n');
    
    let totalInconsistencies = 0;
    
    for (const account of accounts) {
      const customer = customers.find(c => c.id === account.customerId);
      const customerOrders = orders.filter(order => 
        order.customerId === account.customerId || 
        (customer && order.customerName === customer.name)
      );
      
      const totalOrdersValue = customerOrders.reduce((sum, order) => {
        if (order.paymentMethod === 'credit') {
          return sum + parseFloat(order.total || '0');
        }
        return sum;
      }, 0);
      
      const accountTotal = parseFloat(account.totalAmount || '0');
      const difference = Math.abs(accountTotal - totalOrdersValue);
      
      if (difference > 0.01) { // Margem de erro para casas decimais
        totalInconsistencies++;
        console.log(`⚠️ INCONSISTÊNCIA: ${customer?.name || 'Cliente não encontrado'}`);
        console.log(`   Conta: ${account.accountNumber}`);
        console.log(`   Total da conta: R$ ${accountTotal.toFixed(2)}`);
        console.log(`   Total dos pedidos: R$ ${totalOrdersValue.toFixed(2)}`);
        console.log(`   Diferença: R$ ${difference.toFixed(2)}`);
        console.log(`   Pedidos de crediário: ${customerOrders.length}`);
        console.log('');
      } else {
        console.log(`✅ ${customer?.name || 'Cliente não encontrado'}: R$ ${accountTotal.toFixed(2)} (correto)`);
      }
    }
    
    console.log(`\n📋 Resumo:`);
    console.log(`   Contas verificadas: ${accounts.length}`);
    console.log(`   Inconsistências encontradas: ${totalInconsistencies}`);
    
    if (totalInconsistencies === 0) {
      console.log('🎉 Todas as contas estão consistentes!');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

checkAllAccountConsistency();