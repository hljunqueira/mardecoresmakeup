// Script para testar a exclusão melhorada das contas
const testAccountDeletion = async () => {
  const baseUrl = 'http://localhost:5170';
  
  try {
    // Buscar contas de teste
    console.log('🔍 Buscando contas para deletar...');
    const accountsResponse = await fetch(`${baseUrl}/api/admin/credit-accounts`);
    const accounts = await accountsResponse.json();
    
    // Filtrar contas de teste
    const testAccounts = accounts.filter(acc => 
      acc.accountNumber.includes('TEST-') || 
      acc.accountNumber === 'CR002' ||
      (acc.accountNumber === 'CR001' && parseFloat(acc.totalAmount) < 50)
    );
    
    console.log(`📋 Contas de teste encontradas: ${testAccounts.length}`);
    
    for (const account of testAccounts) {
      console.log(`\n🗑️ Tentando deletar: ${account.accountNumber} (${account.id})`);
      console.log(`   Total: R$ ${account.totalAmount} | Pago: R$ ${account.paidAmount}`);
      
      try {
        const deleteResponse = await fetch(`${baseUrl}/api/admin/credit-accounts/${account.id}`, {
          method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
          const result = await deleteResponse.json();
          console.log(`✅ SUCESSO:`, result);
          console.log(`   Conta deletada: ${account.accountNumber}`);
          if (result.deletedPayments > 0) {
            console.log(`   Pagamentos removidos: ${result.deletedPayments}`);
          }
        } else {
          const error = await deleteResponse.json();
          console.log(`❌ ERRO ${deleteResponse.status}:`, error);
        }
        
      } catch (error) {
        console.log(`❌ ERRO DE REDE:`, error.message);
      }
      
      // Aguardar um pouco entre exclusões
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Verificar resultado final
    console.log('\n🔍 Verificando estado final...');
    const finalResponse = await fetch(`${baseUrl}/api/admin/credit-accounts`);
    const finalAccounts = await finalResponse.json();
    console.log(`📊 Contas restantes: ${finalAccounts.length}`);
    
    finalAccounts.forEach(acc => {
      console.log(`   - ${acc.accountNumber}: R$ ${acc.totalAmount} (${acc.status})`);
    });
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
};

testAccountDeletion().catch(console.error);