/**
 * Teste específico para o modal de pagamento total na página de crediário
 * Este script simula exatamente o problema relatado pelo usuário
 */

const testModalPaymentTotal = async () => {
  const baseUrl = 'http://localhost:5170';
  
  try {
    console.log('🔍 === TESTE: MODAL PAGAMENTO TOTAL CREDIÁRIO ===\n');
    
    // 1. Buscar pedidos de crediário com pendências
    console.log('📋 Buscando pedidos de crediário pendentes...');
    const ordersResponse = await fetch(`${baseUrl}/api/admin/orders`);
    const orders = await ordersResponse.json();
    
    const creditOrders = orders.filter(order => 
      order.paymentMethod === 'credit' && 
      order.status === 'pending'
    );
    
    console.log(`✅ Encontrados ${creditOrders.length} pedidos de crediário pendentes`);
    
    if (creditOrders.length === 0) {
      console.log('❌ Nenhum pedido de crediário pendente encontrado');
      return;
    }
    
    // 2. Pegar o primeiro pedido pendente
    const testOrder = creditOrders[0];
    console.log(`\n🎯 Testando pedido: #${testOrder.orderNumber || testOrder.id}`);
    console.log(`   Cliente: ${testOrder.customerName}`);
    console.log(`   Valor: R$ ${testOrder.total}`);
    
    // 3. Buscar contas de crediário
    console.log('\n💳 Buscando contas de crediário...');
    const accountsResponse = await fetch(`${baseUrl}/api/admin/credit-accounts`);
    const accounts = await accountsResponse.json();
    
    // 4. Encontrar conta do cliente
    const customerAccount = accounts.find(acc => 
      acc.customerId === testOrder.customerId && 
      acc.status === 'active'
    );
    
    if (!customerAccount) {
      console.log('❌ Nenhuma conta de crediário ativa encontrada para este cliente');
      return;
    }
    
    console.log(`✅ Conta encontrada: ${customerAccount.accountNumber}`);
    console.log(`   Total: R$ ${customerAccount.totalAmount}`);
    console.log(`   Pago: R$ ${customerAccount.paidAmount || 0}`);
    console.log(`   Restante: R$ ${customerAccount.remainingAmount}`);
    
    // 5. Simular pagamento total (exatamente como o modal faria)
    const remainingAmount = parseFloat(customerAccount.remainingAmount || '0');
    
    if (remainingAmount <= 0) {
      console.log('⚠️ Esta conta já está quitada!');
      return;
    }
    
    console.log(`\n💰 Simulando pagamento total de R$ ${remainingAmount.toFixed(2)}...`);
    
    // 6. Dados do pagamento (igual ao que o modal enviaria)
    const paymentData = {
      creditAccountId: customerAccount.id,
      amount: remainingAmount,
      paymentMethod: 'pix',
      notes: `Teste de quitação total - ${new Date().toLocaleDateString('pt-BR')}`,
      status: 'completed'
    };
    
    console.log('📤 Dados do pagamento:', JSON.stringify(paymentData, null, 2));
    
    // 7. Enviar pagamento para a API
    console.log('\n🚀 Enviando pagamento para API...');
    const paymentResponse = await fetch(`${baseUrl}/api/admin/credit-payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    
    console.log(`📥 Status da resposta: ${paymentResponse.status} ${paymentResponse.statusText}`);
    
    if (paymentResponse.ok) {
      const result = await paymentResponse.json();
      console.log('\n🎉 ===== PAGAMENTO PROCESSADO COM SUCESSO! =====');
      console.log(`✅ Pagamento ID: ${result.id}`);
      console.log(`💰 Valor: R$ ${result.amount}`);
      console.log(`🔵 Método: ${result.paymentMethod}`);
      
      if (result.webhook) {
        console.log('\n🔔 Webhook executado:');
        console.log(`   Status: ${result.webhook.success ? '✅ Sucesso' : '❌ Erro'}`);
        console.log(`   Transação ID: ${result.webhook.transactionId}`);
        console.log(`   Mensagem: ${result.webhook.message}`);
      }
      
      // 8. Verificar se a conta foi atualizada corretamente
      console.log('\n🔍 Verificando atualização da conta...');
      const updatedAccountResponse = await fetch(`${baseUrl}/api/admin/credit-accounts`);
      const updatedAccounts = await updatedAccountResponse.json();
      const updatedAccount = updatedAccounts.find(acc => acc.id === customerAccount.id);
      
      if (updatedAccount) {
        console.log('📊 Status da conta após pagamento:');
        console.log(`   Total: R$ ${updatedAccount.totalAmount}`);
        console.log(`   Pago: R$ ${updatedAccount.paidAmount}`);
        console.log(`   Restante: R$ ${updatedAccount.remainingAmount}`);
        console.log(`   Status: ${updatedAccount.status}`);
        
        const isFullyPaid = parseFloat(updatedAccount.remainingAmount || '0') === 0;
        console.log(`\n${isFullyPaid ? '🎉 CONTA QUITADA COM SUCESSO!' : '⚠️ Conta ainda tem pendências'}`);
        
        if (isFullyPaid) {
          console.log('✅ O modal de pagamento total funcionaria perfeitamente!');
        }
      }
      
    } else {
      const errorResult = await paymentResponse.json();
      console.log('\n❌ ===== ERRO NO PAGAMENTO =====');
      console.log(`Código: ${paymentResponse.status}`);
      console.log(`Mensagem: ${errorResult.message}`);
      console.log('Detalhes:', errorResult);
      
      console.log('\n🔧 Possíveis soluções:');
      console.log('1. Verificar se a conta de crediário existe');
      console.log('2. Verificar se o valor não excede o pendente');
      console.log('3. Verificar se os dados estão corretos');
    }
    
  } catch (error) {
    console.log('\n💥 ===== ERRO CRÍTICO =====');
    console.log(`Erro: ${error.message}`);
    console.log('Stack:', error.stack);
  }
};

// Executar o teste
testModalPaymentTotal().then(() => {
  console.log('\n✅ Teste concluído!');
}).catch(error => {
  console.error('❌ Erro no teste:', error);
});