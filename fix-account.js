// Corrigir conta com remainingAmount incorreto
async function fixAccount() {
  const response = await fetch('http://localhost:5170/api/admin/credit-accounts/3ddb9a6a-2155-4b1d-b772-221fc1586a18', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ remainingAmount: "45.00" })
  });
  
  if (response.ok) {
    console.log('✅ Conta corrigida');
    
    // Verificar total a receber após correção
    const accountsResponse = await fetch('http://localhost:5170/api/admin/credit-accounts');
    const accounts = await accountsResponse.json();
    const totalPending = accounts.reduce((sum, acc) => sum + parseFloat(acc.remainingAmount || '0'), 0);
    
    console.log(`💰 Total a receber: R$ ${totalPending.toFixed(2)}`);
  } else {
    console.error('❌ Erro:', await response.text());
  }
}

fixAccount();