// Script para verificar dependências antes de deletar
const checkAccountDependencies = async () => {
  const baseUrl = 'http://localhost:5170';
  
  try {
    // 1. Buscar todas as contas
    console.log('🔍 Verificando dependências das contas...');
    const accountsResponse = await fetch(`${baseUrl}/api/admin/credit-accounts`);
    const accounts = await accountsResponse.json();
    
    console.log(`📋 Total de contas encontradas: ${accounts.length}`);
    
    for (const account of accounts) {
      console.log(`\n🔍 Verificando conta: ${account.accountNumber} (${account.id})`);
      console.log(`   Total: R$ ${account.totalAmount}`);
      console.log(`   Pago: R$ ${account.paidAmount}`);
      console.log(`   Pendente: R$ ${account.remainingAmount}`);
      
      // Verificar pagamentos desta conta
      try {
        const paymentsResponse = await fetch(`${baseUrl}/api/admin/credit-accounts/${account.id}/payments`);
        if (paymentsResponse.ok) {
          const payments = await paymentsResponse.json();
          console.log(`   💰 Pagamentos: ${payments.length}`);
          
          if (payments.length > 0) {
            console.log(`   ⚠️  ATENÇÃO: Esta conta tem ${payments.length} pagamento(s) - não pode ser deletada diretamente`);
            payments.forEach((payment, index) => {
              console.log(`     ${index + 1}. R$ ${payment.amount} via ${payment.paymentMethod} em ${new Date(payment.createdAt).toLocaleDateString('pt-BR')}`);
            });
          } else {
            console.log(`   ✅ Nenhum pagamento - pode ser deletada`);
          }
        } else {
          console.log(`   ❌ Erro ao buscar pagamentos: ${paymentsResponse.status}`);
        }
      } catch (error) {
        console.log(`   ❌ Erro ao verificar pagamentos: ${error.message}`);
      }
      
      // Verificar se há reservas vinculadas
      try {
        const reservationsResponse = await fetch(`${baseUrl}/api/admin/reservations`);
        if (reservationsResponse.ok) {
          const reservations = await reservationsResponse.json();
          const accountReservations = reservations.filter(r => r.creditAccountId === account.id);
          
          if (accountReservations.length > 0) {
            console.log(`   📦 Reservas vinculadas: ${accountReservations.length}`);
            console.log(`   ⚠️  ATENÇÃO: Esta conta tem reservas vinculadas`);
          } else {
            console.log(`   📦 Nenhuma reserva vinculada`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Erro ao verificar reservas: ${error.message}`);
      }
    }
    
    // Sugerir limpeza
    console.log('\n🧹 SUGESTÕES DE LIMPEZA:');
    console.log('1. Para deletar contas com pagamentos:');
    console.log('   - Primeiro delete os pagamentos');
    console.log('   - Depois delete a conta');
    console.log('2. Ou atualize as foreign keys para CASCADE');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
};

checkAccountDependencies().catch(console.error);