/**
 * Teste final do fluxo de pagamento total após correções
 */

const testFixedPaymentFlow = async () => {
  const baseUrl = 'http://localhost:5170';
  
  try {
    console.log('🎯 === TESTE FINAL: FLUXO DE PAGAMENTO TOTAL CORRIGIDO ===\n');
    
    // 1. Buscar uma conta com pendência para testar
    console.log('🔍 Buscando conta com pendência para teste...');
    const accountsResponse = await fetch(`${baseUrl}/api/admin/credit-accounts`);
    const accounts = await accountsResponse.json();
    
    const accountWithBalance = accounts.find(acc => 
      acc.status === 'active' && 
      parseFloat(acc.remainingAmount || '0') > 0 &&
      parseFloat(acc.remainingAmount || '0') <= 50 // Pegar uma conta com valor pequeno para teste
    );
    
    if (!accountWithBalance) {
      console.log('❌ Nenhuma conta adequada para teste encontrada');
      return;
    }
    
    console.log(`✅ Conta selecionada: ${accountWithBalance.accountNumber}`);
    console.log(`   Cliente ID: ${accountWithBalance.customerId}`);
    console.log(`   Total: R$ ${accountWithBalance.totalAmount}`);
    console.log(`   Pago: R$ ${accountWithBalance.paidAmount || 0}`);
    console.log(`   Restante: R$ ${accountWithBalance.remainingAmount}`);
    
    // 2. Buscar pedido relacionado
    console.log('\n📋 Buscando pedido relacionado...');
    const ordersResponse = await fetch(`${baseUrl}/api/admin/orders`);
    const orders = await ordersResponse.json();
    
    const relatedOrder = orders.find(order => 
      order.customerId === accountWithBalance.customerId && 
      order.paymentMethod === 'credit'
    );
    
    if (!relatedOrder) {
      console.log('❌ Nenhum pedido relacionado encontrado');
      return;
    }
    
    console.log(`✅ Pedido encontrado: ${relatedOrder.orderNumber}`);
    console.log(`   Status atual: ${relatedOrder.status}`);
    console.log(`   Valor: R$ ${relatedOrder.total}`);
    
    // 3. Simular pagamento total
    const remainingAmount = parseFloat(accountWithBalance.remainingAmount);
    console.log(`\n💰 Simulando pagamento total de R$ ${remainingAmount.toFixed(2)}...`);
    
    const paymentData = {
      creditAccountId: accountWithBalance.id,
      amount: remainingAmount,
      paymentMethod: 'pix',
      notes: `Teste de quitação total automatizada - ${new Date().toLocaleDateString('pt-BR')}`,
      status: 'completed'
    };
    
    console.log('📤 Enviando dados para API...');
    const paymentResponse = await fetch(`${baseUrl}/api/admin/credit-payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    
    console.log(`📥 Status: ${paymentResponse.status} ${paymentResponse.statusText}`);
    
    if (paymentResponse.ok) {
      const result = await paymentResponse.json();
      console.log('\n🎉 ===== PAGAMENTO PROCESSADO COM SUCESSO! =====');
      console.log(`✅ ID do pagamento: ${result.id}`);
      console.log(`💰 Valor: R$ ${result.amount}`);
      console.log(`🔵 Método: ${result.paymentMethod}`);
      
      // 4. Verificar se a conta foi atualizada
      console.log('\n🔍 Verificando atualizações...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2 segundos
      
      // Verificar conta atualizada
      const updatedAccountsResponse = await fetch(`${baseUrl}/api/admin/credit-accounts`);
      const updatedAccounts = await updatedAccountsResponse.json();
      const updatedAccount = updatedAccounts.find(acc => acc.id === accountWithBalance.id);
      
      if (updatedAccount) {
        console.log('📊 Estado da conta após pagamento:');
        console.log(`   💰 Total: R$ ${updatedAccount.totalAmount}`);
        console.log(`   ✅ Pago: R$ ${updatedAccount.paidAmount}`);
        console.log(`   ⏳ Restante: R$ ${updatedAccount.remainingAmount}`);
        console.log(`   🏷️ Status: ${updatedAccount.status}`);
        
        const isAccountPaidOff = parseFloat(updatedAccount.remainingAmount || '0') === 0;
        console.log(`\n${isAccountPaidOff ? '✅ CONTA QUITADA!' : '❌ CONTA AINDA TEM PENDÊNCIA'}`);
      }
      
      // Verificar pedido atualizado
      const updatedOrdersResponse = await fetch(`${baseUrl}/api/admin/orders`);
      const updatedOrders = await updatedOrdersResponse.json();
      const updatedOrder = updatedOrders.find(order => order.id === relatedOrder.id);
      
      if (updatedOrder) {
        console.log('\n📋 Estado do pedido após pagamento:');
        console.log(`   📦 Número: ${updatedOrder.orderNumber}`);
        console.log(`   🏷️ Status: ${updatedOrder.status}`);
        console.log(`   💳 Status pagamento: ${updatedOrder.paymentStatus || 'N/A'}`);
        
        const isOrderCompleted = updatedOrder.status === 'completed';
        console.log(`\n${isOrderCompleted ? '✅ PEDIDO COMPLETADO!' : '❌ PEDIDO AINDA PENDENTE'}`);
        
        if (updatedAccount && parseFloat(updatedAccount.remainingAmount || '0') === 0 && isOrderCompleted) {
          console.log('\n🎉 ===== FLUXO FUNCIONANDO PERFEITAMENTE! =====');
          console.log('✅ Conta quitada');
          console.log('✅ Pedido completado');
          console.log('✅ Sistema sincronizado');
          console.log('✅ Modal de pagamento total funcionará corretamente');
        } else {
          console.log('\n⚠️ ===== AINDA HÁ PROBLEMAS NO FLUXO =====');
          if (updatedAccount && parseFloat(updatedAccount.remainingAmount || '0') > 0) {
            console.log('❌ Conta não foi quitada corretamente');
          }
          if (!isOrderCompleted) console.log('❌ Pedido não foi completado automaticamente');
        }
      }
      
      // 5. Verificar transações financeiras
      console.log('\n💼 Verificando Central Financeira...');
      const transactionsResponse = await fetch(`${baseUrl}/api/admin/transactions`);
      const transactions = await transactionsResponse.json();
      
      const relatedTransactions = transactions.filter(t => 
        t.metadata && 
        (t.metadata.creditAccountId === accountWithBalance.id || 
         t.description.includes(accountWithBalance.accountNumber))
      );
      
      console.log(`📊 Transações relacionadas: ${relatedTransactions.length}`);
      const totalTransactionAmount = relatedTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      console.log(`💰 Valor total nas transações: R$ ${totalTransactionAmount.toFixed(2)}`);
      
      if (result.webhook) {
        console.log('\n🔔 Webhook executado:');
        console.log(`   ✅ Sucesso: ${result.webhook.success}`);
        console.log(`   🆔 Transação: ${result.webhook.transactionId}`);
        console.log(`   📢 Mensagem: ${result.webhook.message}`);
      }
      
    } else {
      const errorResult = await paymentResponse.json();
      console.log('\n❌ ===== ERRO NO PAGAMENTO =====');
      console.log(`Código: ${paymentResponse.status}`);
      console.log(`Mensagem: ${errorResult.message}`);
      console.log('Detalhes:', errorResult);
    }
    
  } catch (error) {
    console.error('\n💥 ERRO CRÍTICO:', error);
  }
};

// Executar teste
console.log('🚀 Iniciando teste do fluxo corrigido...\n');
testFixedPaymentFlow().then(() => {
  console.log('\n✅ Teste concluído!');
}).catch(error => {
  console.error('❌ Erro no teste:', error);
});