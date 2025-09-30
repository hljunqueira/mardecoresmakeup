// Teste final de deleção da conta CR002
const testFinalDeletion = async () => {
  const baseUrl = 'http://localhost:5170';
  
  try {
    // Buscar a conta CR002
    console.log('🔍 Buscando conta CR002...');
    const accountsResponse = await fetch(`${baseUrl}/api/admin/credit-accounts`);
    const accounts = await accountsResponse.json();
    
    const cr002 = accounts.find(acc => acc.accountNumber === 'CR002');
    
    if (!cr002) {
      console.log('❌ Conta CR002 não encontrada');
      return;
    }
    
    console.log(`✅ Conta CR002 encontrada: ${cr002.id}`);
    console.log(`   Total: R$ ${cr002.totalAmount} | Pago: R$ ${cr002.paidAmount}`);
    
    // Tentar deletar
    console.log('\n🗑️ Tentando deletar conta CR002 com nova API...');
    const deleteResponse = await fetch(`${baseUrl}/api/admin/credit-accounts/${cr002.id}`, {
      method: 'DELETE'
    });
    
    console.log(`📥 Status: ${deleteResponse.status}`);
    
    if (deleteResponse.ok) {
      const result = await deleteResponse.json();
      console.log('✅ SUCESSO:', result);
    } else {
      const error = await deleteResponse.json();
      console.log('❌ ERRO:', error);
    }
    
    // Verificar resultado final
    console.log('\n📊 Verificando contas restantes...');
    const finalResponse = await fetch(`${baseUrl}/api/admin/credit-accounts`);
    const finalAccounts = await finalResponse.json();
    
    console.log(`📋 Total de contas: ${finalAccounts.length}`);
    finalAccounts.forEach(acc => {
      console.log(`   - ${acc.accountNumber}: R$ ${acc.totalAmount} (${acc.status})`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
};

testFinalDeletion().catch(console.error);