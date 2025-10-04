// Teste para verificar TODAS as contas (incluindo paid_off)
const testAllAccounts = async () => {
  const baseUrl = 'http://localhost:5170';
  
  try {
    console.log('🔍 VERIFICANDO TODAS AS CONTAS DE CREDIÁRIO');
    console.log('='.repeat(50));
    
    // Buscar TODAS as contas (não só ativas)
    const accountsResponse = await fetch(`${baseUrl}/api/admin/credit-accounts`);
    const allAccounts = await accountsResponse.json();
    
    console.log(`📊 Total de contas encontradas: ${allAccounts.length}\n`);
    
    // Agrupar por status
    const groupedByStatus = allAccounts.reduce((groups, acc) => {
      const status = acc.status || 'undefined';
      if (!groups[status]) groups[status] = [];
      groups[status].push(acc);
      return groups;
    }, {});
    
    console.log('📋 CONTAS POR STATUS:');
    Object.keys(groupedByStatus).forEach(status => {
      const accounts = groupedByStatus[status];
      const totalPaid = accounts.reduce((sum, acc) => sum + parseFloat(acc.paidAmount || '0'), 0);
      const totalRemaining = accounts.reduce((sum, acc) => sum + parseFloat(acc.remainingAmount || '0'), 0);
      
      console.log(`\n   ${status.toUpperCase()}: ${accounts.length} contas`);
      console.log(`   💰 Total pago: R$ ${totalPaid.toFixed(2)}`);
      console.log(`   ⏳ Total pendente: R$ ${totalRemaining.toFixed(2)}`);
      
      // Mostrar detalhes das primeiras 3 contas
      accounts.slice(0, 3).forEach((acc, i) => {
        console.log(`      ${i+1}. ${acc.accountNumber} - Pago: R$ ${acc.paidAmount || '0.00'} - Pendente: R$ ${acc.remainingAmount || '0.00'}`);
      });
    });
    
    // Calcular totais gerais
    console.log('\n💳 TOTAIS GERAIS (TODAS AS CONTAS):');
    const totalCredito = allAccounts.reduce((sum, acc) => sum + parseFloat(acc.totalAmount || '0'), 0);
    const totalPago = allAccounts.reduce((sum, acc) => sum + parseFloat(acc.paidAmount || '0'), 0);
    const totalPendente = allAccounts.reduce((sum, acc) => sum + parseFloat(acc.remainingAmount || '0'), 0);
    
    console.log(`   📊 Total de crediário: R$ ${totalCredito.toFixed(2)}`);
    console.log(`   ✅ Total pago: R$ ${totalPago.toFixed(2)}`);
    console.log(`   ⏳ Total pendente: R$ ${totalPendente.toFixed(2)}`);
    
    // Verificar se a API está filtrando apenas contas ativas
    console.log('\n🔍 PROBLEMA IDENTIFICADO:');
    const activeAccounts = allAccounts.filter(acc => acc.status === 'active');
    const activePaid = activeAccounts.reduce((sum, acc) => sum + parseFloat(acc.paidAmount || '0'), 0);
    
    console.log(`   🟢 Contas ATIVAS: ${activeAccounts.length} - Pago: R$ ${activePaid.toFixed(2)}`);
    
    if (activePaid === 0 && totalPago > 0) {
      console.log(`   ❌ PROBLEMA: API só considera contas ATIVAS, mas os pagamentos estão em contas PAID_OFF`);
      console.log(`   💡 SOLUÇÃO: API deve incluir TODAS as contas para cálculo de receita`);
      
      const paidOffAccounts = allAccounts.filter(acc => acc.status === 'paid_off');
      const paidOffPaid = paidOffAccounts.reduce((sum, acc) => sum + parseFloat(acc.paidAmount || '0'), 0);
      console.log(`   💰 Receita perdida em contas PAID_OFF: R$ ${paidOffPaid.toFixed(2)}`);
    }
    
    // Testar novamente a API com a descoberta
    console.log('\n🧪 TESTANDO API CONSOLIDADA NOVAMENTE:');
    const consolidatedResponse = await fetch(`${baseUrl}/api/admin/financial/consolidated?period=365`);
    const consolidatedData = await consolidatedResponse.json();
    
    console.log(`   💳 API Credit Revenue: R$ ${(consolidatedData.revenueBreakdown?.creditAccounts || 0).toFixed(2)}`);
    console.log(`   💰 Deveria ser: R$ ${totalPago.toFixed(2)}`);
    
    if (totalPago > 0 && (consolidatedData.revenueBreakdown?.creditAccounts || 0) === 0) {
      console.log(`   ❌ CONFIRMADO: API não está incluindo receita de contas quitadas`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar contas:', error);
  }
};

testAllAccounts();