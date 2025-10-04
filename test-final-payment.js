const testFinalPayment = async () => {
  const baseUrl = 'http://localhost:5170';
  
  try {
    console.log('🔍 Buscando conta de crediário com valor próximo a R$ 45...');
    
    const accountsResponse = await fetch(`${baseUrl}/api/admin/credit-accounts`);
    const accounts = await accountsResponse.json();
    
    const activeAccount = accounts.find(acc => acc.status === 'active' && parseFloat(acc.remainingAmount) >= 30);
    
    if (!activeAccount) {
      console.log('❌ Nenhuma conta com valor suficiente encontrada');
      console.log('Contas disponíveis:');
      accounts.forEach(acc => {
        console.log(`  - ${acc.accountNumber}: R$ ${acc.remainingAmount} (${acc.status})`);
      });
      return;
    }
    
    console.log(`✅ Conta encontrada: ${activeAccount.accountNumber} - Pendente: R$ ${activeAccount.remainingAmount}`);
    
    // Fazer pagamento de valor similar ao relatado (R$ 30 para testar sem esgotar a conta)
    const paymentAmount = 30;
    
    console.log(`\n💰 Testando pagamento de R$ ${paymentAmount} via PIX (simulando seu cenário)...`);
    
    const paymentData = {
      creditAccountId: activeAccount.id,
      amount: paymentAmount,
      paymentMethod: 'pix',
      notes: 'Teste final - simulando pagamento do usuário de R$ 45',
      status: 'completed'
    };
    
    console.log('📤 Dados do pagamento:', JSON.stringify(paymentData, null, 2));
    
    const response = await fetch(`${baseUrl}/api/admin/credit-payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    
    console.log(`📥 Status da resposta: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Pagamento processado com sucesso!');
      
      if (result.webhook && result.webhook.success) {
        console.log('\n🎉 WEBHOOK EXECUTADO COM SUCESSO!');
        console.log(`📊 Transação criada: ${result.webhook.transactionId}`);
        console.log(`💰 Valor: R$ ${result.webhook.syncedData.amount}`);
        console.log(`📝 Descrição: ${result.webhook.syncedData.description}`);
        
        // Aguardar um momento e verificar se apareceu na Central Financeira
        console.log('\n⏳ Aguardando 2 segundos para verificar sincronização...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\n🔍 Verificando se apareceu na Central Financeira...');
        const transactionsResponse = await fetch(`${baseUrl}/api/admin/transactions`);
        const transactions = await transactionsResponse.json();
        
        const newTransaction = transactions.find(t => t.id === result.webhook.transactionId);
        
        if (newTransaction) {
          console.log('✅ SUCESSO! Transação apareceu na Central Financeira:');
          console.log(`   ID: ${newTransaction.id}`);
          console.log(`   Valor: R$ ${newTransaction.amount}`);
          console.log(`   Categoria: ${newTransaction.category}`);
          console.log(`   Status: ${newTransaction.status}`);
          console.log(`   Data: ${newTransaction.date}`);
        } else {
          console.log('❌ Transação não encontrada na Central Financeira');
        }
        
      } else {
        console.log('❌ Webhook falhou:', result.webhook?.message || 'Webhook não executado');
      }
      
    } else {
      const errorText = await response.text();
      console.log('❌ Erro no pagamento:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
};

// Executar
testFinalPayment();