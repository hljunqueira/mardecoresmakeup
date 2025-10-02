// Script para corrigir contas de crediário via API
async function fixCreditAccountsViaAPI() {
  const baseUrl = 'http://localhost:5170/api/admin';
  
  try {
    console.log('🔧 Iniciando correção das contas de crediário via API...');
    
    // 1. Corrigir a conta existente
    console.log('📊 Corrigindo remainingAmount da conta existente...');
    const fixResponse = await fetch(`${baseUrl}/credit-accounts/3ddb9a6a-2155-4b1d-b772-221fc1586a18`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remainingAmount: "15.00" })
    });
    
    if (fixResponse.ok) {
      console.log('✅ Conta existente corrigida');
    } else {
      console.error('❌ Erro ao corrigir conta:', await fixResponse.text());
    }
    
    // 2. Buscar pedidos de crediário pendentes
    const ordersResponse = await fetch(`${baseUrl}/orders`);
    const orders = await ordersResponse.json();
    
    const creditOrders = orders.filter(order => 
      order.paymentMethod === 'credit' && 
      order.status === 'pending' && 
      order.customerId
    );
    
    console.log(`📋 Encontrados ${creditOrders.length} pedidos de crediário pendentes`);
    
    // 3. Buscar contas existentes
    const accountsResponse = await fetch(`${baseUrl}/credit-accounts`);
    const accounts = await accountsResponse.json();
    
    console.log(`💳 ${accounts.length} contas existentes`);
    
    // 4. Criar contas para cada cliente que não tem
    const customersWithAccounts = new Set(accounts.map(acc => acc.customerId));
    let createdCount = 0;
    let updatedCount = 0;
    
    // Agrupar pedidos por cliente
    const ordersByCustomer = {};
    creditOrders.forEach(order => {
      if (!ordersByCustomer[order.customerId]) {
        ordersByCustomer[order.customerId] = [];
      }
      ordersByCustomer[order.customerId].push(order);
    });
    
    for (const [customerId, customerOrders] of Object.entries(ordersByCustomer)) {
      const totalAmount = customerOrders.reduce((sum, order) => sum + parseFloat(order.total), 0);
      const customerName = customerOrders[0].customerName;
      
      if (customersWithAccounts.has(customerId)) {
        // Cliente já tem conta - atualizar
        const existingAccount = accounts.find(acc => acc.customerId === customerId && acc.status === 'active');
        if (existingAccount) {
          const currentTotal = parseFloat(existingAccount.totalAmount || '0');
          const currentRemaining = parseFloat(existingAccount.remainingAmount || '0');
          
          const newTotal = currentTotal + totalAmount;
          const newRemaining = currentRemaining + totalAmount;
          
          const updateResponse = await fetch(`${baseUrl}/credit-accounts/${existingAccount.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              totalAmount: newTotal.toString(),
              remainingAmount: newRemaining.toString()
            })
          });
          
          if (updateResponse.ok) {
            console.log(`📈 Conta atualizada para ${customerName}: +${totalAmount.toFixed(2)} (Total: ${newTotal.toFixed(2)})`);
            updatedCount++;
          }
        }
      } else {
        // Cliente não tem conta - criar
        const accountData = {
          customerId: customerId,
          accountNumber: `ACC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          totalAmount: totalAmount.toString(),
          paidAmount: '0',
          remainingAmount: totalAmount.toString(),
          installments: 1,
          installmentValue: totalAmount.toString(),
          paymentFrequency: 'monthly',
          nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // YYYY-MM-DD
          status: 'active',
          notes: `Conta criada automaticamente para ${customerOrders.length} pedido(s) de ${customerName}`
        };
        
        const createResponse = await fetch(`${baseUrl}/credit-accounts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(accountData)
        });
        
        if (createResponse.ok) {
          const newAccount = await createResponse.json();
          console.log(`🆕 Nova conta criada para ${customerName}: R$ ${totalAmount.toFixed(2)} (${newAccount.id})`);
          createdCount++;
        } else {
          console.error('❌ Erro ao criar conta:', await createResponse.text());
        }
      }
    }
    
    console.log('✅ Correção concluída!');
    console.log(`📊 Resumo:`);
    console.log(`   - Contas criadas: ${createdCount}`);
    console.log(`   - Contas atualizadas: ${updatedCount}`);
    
    // 5. Verificar resultado final
    const finalAccountsResponse = await fetch(`${baseUrl}/credit-accounts`);
    const finalAccounts = await finalAccountsResponse.json();
    const totalPending = finalAccounts.reduce((sum, acc) => sum + parseFloat(acc.remainingAmount || '0'), 0);
    
    console.log(`💰 Total a receber após correção: R$ ${totalPending.toFixed(2)}`);
    console.log(`📋 Total de contas: ${finalAccounts.length}`);
    
  } catch (error) {
    console.error('❌ Erro na correção:', error);
  }
}

// Executar
fixCreditAccountsViaAPI();