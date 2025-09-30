// Teste da API de pagamentos para verificar se há limite mínimo
const testPayment = async () => {
  const baseUrl = 'http://localhost:5170';
  
  // Primeiro buscar uma conta ativa
  console.log('🔍 Buscando contas de crediário...');
  const accountsResponse = await fetch(`${baseUrl}/api/admin/credit-accounts`);
  const accounts = await accountsResponse.json();
  
  const activeAccount = accounts.find(acc => acc.status === 'active' && parseFloat(acc.remainingAmount) > 0);
  
  if (!activeAccount) {
    console.log('❌ Nenhuma conta ativa encontrada');
    return;
  }
  
  console.log(`✅ Conta encontrada: ${activeAccount.accountNumber} - Pendente: R$ ${activeAccount.remainingAmount}`);
  
  // Testar pagamentos com diferentes valores
  const testValues = [5, 10, 15, 20, 25, 50];
  
  for (const amount of testValues) {
    console.log(`\n🧪 Testando pagamento de R$ ${amount}...`);
    
    const paymentData = {
      creditAccountId: activeAccount.id,
      amount: amount,
      paymentMethod: 'pix',
      notes: `Teste de R$ ${amount}`
    };
    
    try {
      const response = await fetch(`${baseUrl}/api/admin/credit-payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ R$ ${amount}: Sucesso - Pagamento registrado`);
      } else {
        console.log(`❌ R$ ${amount}: Erro - ${result.message}`);
      }
    } catch (error) {
      console.log(`❌ R$ ${amount}: Erro de conexão - ${error.message}`);
    }
  }
};

testPayment().catch(console.error);