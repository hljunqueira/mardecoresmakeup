// Script para verificar status detalhado das contas de crediário
const checkAccountStatus = async () => {
  const baseUrl = 'http://localhost:5170';
  
  console.log('🔍 Verificando todas as contas de crediário...\n');
  
  const response = await fetch(`${baseUrl}/api/admin/credit-accounts`);
  const accounts = await response.json();
  
  accounts.forEach((account, index) => {
    console.log(`📋 Conta ${index + 1}: ${account.accountNumber}`);
    console.log(`   Status: ${account.status}`);
    console.log(`   Total: R$ ${account.totalAmount}`);
    console.log(`   Pago: R$ ${account.paidAmount}`);
    console.log(`   Pendente: R$ ${account.remainingAmount}`);
    console.log(`   Pode receber pagamento: ${parseFloat(account.remainingAmount) > 0 ? '✅ SIM' : '❌ NÃO (Quitada)'}`);
    console.log(`   Limite mínimo para pagamento: R$ 0,01`);
    console.log(`   Limite máximo para pagamento: R$ ${account.remainingAmount}`);
    console.log('   ' + '='.repeat(50));
  });
  
  const activeAccounts = accounts.filter(acc => 
    acc.status === 'active' && parseFloat(acc.remainingAmount) > 0
  );
  
  console.log(`\n📊 Resumo:`);
  console.log(`   Total de contas: ${accounts.length}`);
  console.log(`   Contas ativas com saldo: ${activeAccounts.length}`);
  console.log(`   Contas quitadas: ${accounts.length - activeAccounts.length}`);
  
  if (activeAccounts.length === 0) {
    console.log(`\n⚠️  IMPORTANTE: Não há contas com saldo pendente!`);
    console.log(`   Para testar pagamentos, você precisa:`);
    console.log(`   1. Criar uma nova conta de crediário, OU`);
    console.log(`   2. Adicionar produtos a uma conta existente`);
  }
};

checkAccountStatus().catch(console.error);