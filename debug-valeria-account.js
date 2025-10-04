const debugValeriaAccount = async () => {
  const baseUrl = 'http://localhost:5170';
  
  try {
    console.log('🔍 Investigando conta da Valeria (#CRE0002)...\n');
    
    // 1. Buscar conta específica
    const accountsResponse = await fetch(`${baseUrl}/api/admin/credit-accounts`);
    const accounts = await accountsResponse.json();
    
    const valeriaAccount = accounts.find(acc => acc.accountNumber === '#CRE0002');
    
    if (!valeriaAccount) {
      console.log('❌ Conta #CRE0002 não encontrada!');
      return;
    }
    
    console.log('📋 Detalhes da conta da Valeria:');
    console.log(`   ID: ${valeriaAccount.id}`);
    console.log(`   Número: ${valeriaAccount.accountNumber}`);
    console.log(`   Status: ${valeriaAccount.status}`);
    console.log(`   Total: R$ ${valeriaAccount.totalAmount}`);
    console.log(`   Pago: R$ ${valeriaAccount.paidAmount}`);
    console.log(`   Restante: R$ ${valeriaAccount.remainingAmount}`);
    console.log(`   Data fechamento: ${valeriaAccount.closedAt || 'N/A'}`);
    
    // 2. Buscar pagamentos registrados desta conta
    console.log('\n💳 Verificando pagamentos registrados...');
    
    try {
      const paymentsResponse = await fetch(`${baseUrl}/api/admin/credit-accounts/${valeriaAccount.id}/payments`);
      const payments = await paymentsResponse.json();
      
      console.log(`   Total de pagamentos: ${payments.length}`);
      
      if (payments.length > 0) {
        payments.forEach((payment, index) => {
          console.log(`   ${index + 1}. R$ ${payment.amount} via ${payment.paymentMethod} em ${payment.createdAt}`);
          console.log(`      Notas: ${payment.notes || 'N/A'}`);
        });
        
        const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        console.log(`   💰 Total pago (calculado): R$ ${totalPaid.toFixed(2)}`);
      } else {
        console.log('   ❌ Nenhum pagamento encontrado!');
      }
    } catch (error) {
      console.error('   ❌ Erro ao buscar pagamentos:', error.message);
    }
    
    // 3. Buscar transações financeiras relacionadas
    console.log('\n💰 Verificando transações na Central Financeira...');
    
    const transactionsResponse = await fetch(`${baseUrl}/api/admin/transactions`);
    const transactions = await transactionsResponse.json();
    
    const valeriaTransactions = transactions.filter(t => 
      t.metadata && 
      typeof t.metadata === 'object' && 
      (t.metadata.creditAccountId === valeriaAccount.id || 
       t.metadata.accountNumber === valeriaAccount.accountNumber)
    );
    
    console.log(`   Transações encontradas: ${valeriaTransactions.length}`);
    
    if (valeriaTransactions.length > 0) {
      valeriaTransactions.forEach((transaction, index) => {
        console.log(`   ${index + 1}. ${transaction.description} - R$ ${transaction.amount}`);
        console.log(`      ID: ${transaction.id}`);
        console.log(`      Categoria: ${transaction.category}`);
        console.log(`      Status: ${transaction.status}`);
        console.log(`      Fonte: ${transaction.metadata?.source || 'N/A'}`);
        console.log(`      Data: ${transaction.date}`);
        console.log('      ---');
      });
    } else {
      console.log('   ❌ NENHUMA TRANSAÇÃO ENCONTRADA NA CENTRAL FINANCEIRA!');
      console.log('   🚨 ESTE É O PROBLEMA - A CONTA ESTÁ CONCLUÍDA MAS NÃO GEROU TRANSAÇÃO');
    }
    
    // 4. Verificar se precisa sincronizar
    const paidAmount = parseFloat(valeriaAccount.paidAmount || '0');
    const transactionTotal = valeriaTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    console.log('\n📊 Análise da sincronização:');
    console.log(`   Valor pago na conta: R$ ${paidAmount.toFixed(2)}`);
    console.log(`   Valor nas transações: R$ ${transactionTotal.toFixed(2)}`);
    console.log(`   Diferença: R$ ${(paidAmount - transactionTotal).toFixed(2)}`);
    
    if (paidAmount > transactionTotal) {
      console.log('\n🔧 AÇÃO RECOMENDADA: Executar sincronização manual');
      console.log('   Esta conta precisa de uma transação de R$ ' + (paidAmount - transactionTotal).toFixed(2));
      
      // Tentar sincronizar automaticamente
      console.log('\n🔄 Tentando sincronizar automaticamente...');
      
      try {
        const syncResponse = await fetch(`${baseUrl}/api/admin/financial/sync-historical`, {
          method: 'POST'
        });
        
        const syncResult = await syncResponse.json();
        
        if (syncResult.success) {
          console.log('✅ Sincronização executada com sucesso!');
          console.log(`   Pedidos sincronizados: ${syncResult.syncedOrders}`);
          console.log(`   Contas de crediário sincronizadas: ${syncResult.syncedCreditAccounts}`);
          
          if (syncResult.errors && syncResult.errors.length > 0) {
            console.log('   ⚠️ Erros durante sincronização:');
            syncResult.errors.forEach(error => console.log(`     - ${error}`));
          }
        } else {
          console.log('❌ Falha na sincronização:', syncResult.message);
        }
      } catch (syncError) {
        console.error('❌ Erro ao tentar sincronizar:', syncError.message);
      }
    } else {
      console.log('✅ Conta já está sincronizada corretamente');
    }
    
  } catch (error) {
    console.error('❌ Erro na investigação:', error.message);
  }
};

// Executar
debugValeriaAccount();