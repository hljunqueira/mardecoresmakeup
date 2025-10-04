// Teste específico do endpoint consolidado da API
const testConsolidatedAPI = async () => {
  const baseUrl = 'http://localhost:5170';
  
  try {
    console.log('🔍 TESTANDO ENDPOINT CONSOLIDADO DA API');
    console.log('='.repeat(50));
    
    // 1. Testar diferentes períodos
    const periods = ['30', '90', '365'];
    
    for (const period of periods) {
      console.log(`\n📅 TESTANDO PERÍODO: ${period} dias`);
      
      const response = await fetch(`${baseUrl}/api/admin/financial/consolidated?period=${period}&includeManualTransactions=true&includeOrders=true&includeCreditAccounts=true`);
      const data = await response.json();
      
      console.log(`   📈 Total Revenue: R$ ${(data.totalRevenue || 0).toFixed(2)}`);
      console.log(`   💰 Manual Transactions: R$ ${(data.revenueBreakdown?.manualTransactions || 0).toFixed(2)}`);
      console.log(`   🛒 Cash Orders: R$ ${(data.revenueBreakdown?.cashOrders || 0).toFixed(2)}`);
      console.log(`   💳 Credit Accounts: R$ ${(data.revenueBreakdown?.creditAccounts || 0).toFixed(2)}`);
      console.log(`   📊 Active Credit Accounts: ${data.performance?.activeCreditAccounts || 0}`);
      console.log(`   ⏳ A Receber: R$ ${(data.accountsReceivable?.creditAccountsBalance || 0).toFixed(2)}`);
      
      // Mostrar metadata para debug
      console.log(`   🔍 Metadata:`, data.metadata);
    }
    
    // 2. Testar sem filtros de data
    console.log(`\n🌍 TESTANDO SEM FILTROS DE PERÍODO:`);
    const allTimeResponse = await fetch(`${baseUrl}/api/admin/financial/consolidated?period=999999`);
    const allTimeData = await allTimeResponse.json();
    
    console.log(`   📈 Total Revenue: R$ ${(allTimeData.totalRevenue || 0).toFixed(2)}`);
    console.log(`   💳 Credit Accounts: R$ ${(allTimeData.revenueBreakdown?.creditAccounts || 0).toFixed(2)}`);
    console.log(`   📊 Active Credit Accounts: ${allTimeData.performance?.activeCreditAccounts || 0}`);
    
    // 3. Verificar diretamente no banco das contas de crediário
    console.log(`\n💾 DADOS DIRETOS DAS CONTAS:`);
    const accountsResponse = await fetch(`${baseUrl}/api/admin/credit-accounts`);
    const accounts = await accountsResponse.json();
    
    const activeAccounts = accounts.filter(acc => acc.status === 'active');
    const totalPaid = activeAccounts.reduce((sum, acc) => sum + parseFloat(acc.paidAmount || '0'), 0);
    
    console.log(`   📊 Active Accounts: ${activeAccounts.length}`);
    console.log(`   💰 Total Paid (Direct): R$ ${totalPaid.toFixed(2)}`);
    
    // 4. Comparar com o que a API retorna vs realidade
    console.log(`\n🔍 ANÁLISE DE DIFERENÇAS:`);
    const apiCreditRevenue = allTimeData.revenueBreakdown?.creditAccounts || 0;
    const realCreditRevenue = totalPaid;
    
    if (Math.abs(apiCreditRevenue - realCreditRevenue) < 0.01) {
      console.log(`   ✅ CONSISTENTE: API e dados diretos batem`);
    } else {
      console.log(`   ❌ INCONSISTENTE:`);
      console.log(`      API retorna: R$ ${apiCreditRevenue.toFixed(2)}`);
      console.log(`      Dados reais: R$ ${realCreditRevenue.toFixed(2)}`);
      console.log(`      Diferença: R$ ${Math.abs(apiCreditRevenue - realCreditRevenue).toFixed(2)}`);
    }
    
    // 5. Verificar datas das contas de crediário
    console.log(`\n📅 VERIFICAÇÃO DE DATAS DAS CONTAS:`);
    activeAccounts.forEach((acc, i) => {
      if (i < 3) { // Mostrar apenas as 3 primeiras
        console.log(`   ${i+1}. ${acc.accountNumber} - Criada: ${acc.createdAt} - Pago: R$ ${acc.paidAmount}`);
      }
    });
    
    const now = new Date();
    const days30Ago = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const recentAccounts = activeAccounts.filter(acc => {
      const createdDate = new Date(acc.createdAt);
      return createdDate >= days30Ago;
    });
    
    console.log(`   📊 Contas criadas nos últimos 30 dias: ${recentAccounts.length}`);
    const recentPaid = recentAccounts.reduce((sum, acc) => sum + parseFloat(acc.paidAmount || '0'), 0);
    console.log(`   💰 Pago nas contas recentes: R$ ${recentPaid.toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Erro ao testar API consolidada:', error);
  }
};

testConsolidatedAPI();