const testWebhookDirectly = async () => {
  const baseUrl = 'http://localhost:5170';
  
  try {
    console.log('🔍 Buscando conta de crediário ativa...');
    
    const accountsResponse = await fetch(`${baseUrl}/api/admin/credit-accounts`);
    const accounts = await accountsResponse.json();
    
    const activeAccount = accounts.find(acc => acc.status === 'active' && parseFloat(acc.remainingAmount) > 0);
    
    if (!activeAccount) {
      console.log('❌ Nenhuma conta ativa encontrada');
      return;
    }
    
    console.log(`✅ Conta encontrada: ${activeAccount.accountNumber} - Pendente: R$ ${activeAccount.remainingAmount}`);
    
    // Fazer pagamento com valor pequeno
    const paymentAmount = 5;
    
    console.log(`\n🧪 Testando pagamento de R$ ${paymentAmount} com webhook...`);
    
    const paymentData = {
      creditAccountId: activeAccount.id,
      amount: paymentAmount,
      paymentMethod: 'pix',
      notes: 'Teste do webhook de pagamento',
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
      console.log('📋 Resposta completa:', JSON.stringify(result, null, 2));
      
      if (result.webhook) {
        console.log('\n🔔 Status do webhook:');
        console.log(`   Success: ${result.webhook.success}`);
        console.log(`   Message: ${result.webhook.message}`);
        console.log(`   Transaction ID: ${result.webhook.transactionId}`);
        
        if (result.webhook.syncedData) {
          console.log('📊 Dados sincronizados:');
          console.log(`   Tipo: ${result.webhook.syncedData.type}`);
          console.log(`   Valor: R$ ${result.webhook.syncedData.amount}`);
          console.log(`   Origem: ${result.webhook.syncedData.source}`);
          console.log(`   Descrição: ${result.webhook.syncedData.description}`);
        }
      } else {
        console.log('❌ Webhook não executado - campo webhook ausente na resposta');
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
testWebhookDirectly();