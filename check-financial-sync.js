const checkFinancialSync = async () => {
  const baseUrl = 'http://localhost:5170';
  
  try {
    console.log('🔍 Verificando transações financeiras...');
    
    const transactionsResponse = await fetch(`${baseUrl}/api/admin/transactions`);
    const transactions = await transactionsResponse.json();
    
    console.log(`📊 Total de transações: ${transactions.length}`);
    
    // Filtrar transações de crediário
    const creditTransactions = transactions.filter(t => 
      t.metadata && 
      typeof t.metadata === 'object' && 
      t.metadata.source === 'credit_webhook'
    );
    
    console.log(`💳 Transações de crediário via webhook: ${creditTransactions.length}`);
    
    if (creditTransactions.length > 0) {
      console.log('\n📋 Detalhes das transações de crediário:');
      creditTransactions.forEach((transaction, index) => {
        console.log(`\n${index + 1}. ID: ${transaction.id}`);
        console.log(`   Valor: R$ ${transaction.amount}`);
        console.log(`   Descrição: ${transaction.description}`);
        console.log(`   Categoria: ${transaction.category}`);
        console.log(`   Status: ${transaction.status}`);
        console.log(`   Data: ${transaction.date}`);
        console.log(`   Conta: ${transaction.metadata.accountNumber}`);
        console.log(`   Sincronizado em: ${transaction.metadata.syncedAt}`);
      });
    } else {
      console.log('❌ Nenhuma transação de crediário encontrada!');
      console.log('\n🔍 Analisando todas as transações para debug:');
      transactions.forEach((transaction, index) => {
        console.log(`${index + 1}. ${transaction.description} - R$ ${transaction.amount} - ${transaction.category}`);
        if (transaction.metadata) {
          console.log(`   Source: ${transaction.metadata.source || 'N/A'}`);
        }
      });
    }
    
    // Verificar status de sincronização
    console.log('\n🔄 Verificando status geral de sincronização...');
    const syncStatusResponse = await fetch(`${baseUrl}/api/admin/financial/sync-status`);
    const syncStatus = await syncStatusResponse.json();
    
    console.log('📈 Status da sincronização:');
    console.log(`   - Pedidos sincronizados: ${syncStatus.orders?.synced || 0}/${syncStatus.orders?.confirmed || 0}`);
    console.log(`   - Pagamentos de crediário: ${syncStatus.credit?.syncedPayments || 0}`);
    console.log(`   - Transações via webhook: ${syncStatus.transactions?.webhookGenerated || 0}`);
    console.log(`   - Sistema em sincronia: ${syncStatus.syncHealth?.ordersInSync ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ Erro ao verificar sincronização:', error.message);
  }
};

// Executar
checkFinancialSync();