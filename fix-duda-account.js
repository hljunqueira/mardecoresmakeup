// Corrigir conta da Duda para o valor correto
async function fixDudaAccount() {
  try {
    console.log('🔧 Corrigindo conta da Duda...');
    
    const response = await fetch('http://localhost:5170/api/admin/credit-accounts/3ddb9a6a-2155-4b1d-b772-221fc1586a18', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalAmount: "15.00",
        remainingAmount: "15.00"
      })
    });
    
    if (response.ok) {
      console.log('✅ Conta da Duda corrigida para R$ 15,00');
      
      // Verificar o novo total a receber
      const accountsResponse = await fetch('http://localhost:5170/api/admin/credit-accounts');
      const accounts = await accountsResponse.json();
      const newTotal = accounts.reduce((sum, acc) => sum + parseFloat(acc.remainingAmount || '0'), 0);
      
      console.log(`💰 Novo total a receber: R$ ${newTotal.toFixed(2)}`);
      
    } else {
      console.error('❌ Erro ao corrigir conta:', await response.text());
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

fixDudaAccount();