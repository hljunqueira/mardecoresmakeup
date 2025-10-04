const listAllAccounts = async () => {
  const baseUrl = 'http://localhost:5170';
  
  try {
    console.log('🔍 Listando todas as contas de crediário...\n');
    
    const accountsResponse = await fetch(`${baseUrl}/api/admin/credit-accounts`);
    const accounts = await accountsResponse.json();
    
    console.log(`📊 Total de contas encontradas: ${accounts.length}\n`);
    
    accounts.forEach((account, index) => {
      console.log(`${index + 1}. Conta: ${account.accountNumber}`);
      console.log(`   ID: ${account.id}`);
      console.log(`   Cliente: ${account.customerId}`);
      console.log(`   Status: ${account.status}`);
      console.log(`   Total: R$ ${account.totalAmount}`);
      console.log(`   Pago: R$ ${account.paidAmount || '0.00'}`);
      console.log(`   Restante: R$ ${account.remainingAmount}`);
      console.log(`   Data criação: ${account.createdAt}`);
      console.log(`   Data fechamento: ${account.closedAt || 'N/A'}`);
      console.log('   ' + '='.repeat(50));
    });
    
    // Buscar contas concluídas
    const completedAccounts = accounts.filter(acc => 
      acc.status === 'paid' || 
      acc.status === 'paid_off' || 
      acc.status === 'completed' ||
      parseFloat(acc.remainingAmount || '0') === 0
    );
    
    console.log(`\n🎯 Contas concluídas/quitadas: ${completedAccounts.length}`);
    
    if (completedAccounts.length > 0) {
      console.log('\n📋 Detalhes das contas concluídas:');
      completedAccounts.forEach((account, index) => {
        const paidAmount = parseFloat(account.paidAmount || '0');
        console.log(`\n${index + 1}. ${account.accountNumber} (${account.status})`);
        console.log(`   Total: R$ ${account.totalAmount}`);
        console.log(`   Pago: R$ ${paidAmount.toFixed(2)}`);
        console.log(`   Valor que deve aparecer no financeiro: R$ ${paidAmount.toFixed(2)}`);
      });
      
      // Para cada conta concluída, verificar se tem transação correspondente
      console.log('\n🔍 Verificando sincronização das contas concluídas...');
      
      const transactionsResponse = await fetch(`${baseUrl}/api/admin/transactions`);
      const transactions = await transactionsResponse.json();
      
      for (const account of completedAccounts) {
        const accountTransactions = transactions.filter(t => 
          t.metadata && 
          typeof t.metadata === 'object' && 
          (t.metadata.creditAccountId === account.id || 
           t.metadata.accountNumber === account.accountNumber)
        );
        
        const paidAmount = parseFloat(account.paidAmount || '0');
        const transactionTotal = accountTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        console.log(`\n📊 ${account.accountNumber}:`);
        console.log(`   Valor pago: R$ ${paidAmount.toFixed(2)}`);
        console.log(`   Valor nas transações: R$ ${transactionTotal.toFixed(2)}`);
        console.log(`   Sincronizado: ${paidAmount === transactionTotal ? '✅ SIM' : '❌ NÃO'}`);
        
        if (paidAmount > transactionTotal) {
          console.log(`   🚨 FALTAM R$ ${(paidAmount - transactionTotal).toFixed(2)} na Central Financeira!`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao listar contas:', error.message);
  }
};

// Executar
listAllAccounts();