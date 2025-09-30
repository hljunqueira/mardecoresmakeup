// Debug específico para entender o fluxo de deleção
const debugDeletion = async () => {
  const baseUrl = 'http://localhost:5170';
  const accountId = '286fe509-6553-4591-b11c-7b16e2d5582a'; // TEST account
  
  try {
    console.log('🔍 Debugando processo de deleção...');
    console.log('Account ID:', accountId);
    
    // 1. Verificar se a conta existe
    console.log('\n1. Verificando conta...');
    const accountResponse = await fetch(`${baseUrl}/api/admin/credit-accounts/${accountId}`);
    if (accountResponse.ok) {
      const account = await accountResponse.json();
      console.log('✅ Conta encontrada:', account.accountNumber);
    } else {
      console.log('❌ Conta não encontrada');
      return;
    }
    
    // 2. Buscar pagamentos
    console.log('\n2. Buscando pagamentos...');
    const paymentsResponse = await fetch(`${baseUrl}/api/admin/credit-accounts/${accountId}/payments`);
    if (paymentsResponse.ok) {
      const payments = await paymentsResponse.json();
      console.log(`✅ Pagamentos encontrados: ${payments.length}`);
      
      // 3. Tentar deletar cada pagamento individualmente
      console.log('\n3. Deletando pagamentos individualmente...');
      for (const payment of payments) {
        console.log(`🗑️ Deletando pagamento: ${payment.id} - R$ ${payment.amount}`);
        
        const deletePaymentResponse = await fetch(`${baseUrl}/api/admin/credit-payments/${payment.id}`, {
          method: 'DELETE'
        });
        
        if (deletePaymentResponse.ok) {
          console.log(`  ✅ Pagamento deletado: ${payment.id}`);
        } else {
          const error = await deletePaymentResponse.json();
          console.log(`  ❌ Erro ao deletar pagamento:`, error);
        }
      }
      
      // 4. Verificar se ainda há pagamentos
      console.log('\n4. Verificando pagamentos restantes...');
      const remainingResponse = await fetch(`${baseUrl}/api/admin/credit-accounts/${accountId}/payments`);
      if (remainingResponse.ok) {
        const remaining = await remainingResponse.json();
        console.log(`📊 Pagamentos restantes: ${remaining.length}`);
      }
      
      // 5. Tentar deletar a conta agora
      console.log('\n5. Tentando deletar a conta...');
      const deleteAccountResponse = await fetch(`${baseUrl}/api/admin/credit-accounts/${accountId}`, {
        method: 'DELETE'
      });
      
      if (deleteAccountResponse.ok) {
        const result = await deleteAccountResponse.json();
        console.log('✅ Conta deletada com sucesso:', result);
      } else {
        const error = await deleteAccountResponse.json();
        console.log('❌ Erro ao deletar conta:', error);
      }
      
    } else {
      console.log('❌ Erro ao buscar pagamentos');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
};

debugDeletion().catch(console.error);