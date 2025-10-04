const testFinancialPIXFix = async () => {
  const baseUrl = 'http://localhost:5170';
  
  try {
    console.log('🔍 TESTANDO CORREÇÃO DO PIX NA CENTRAL FINANCEIRA');
    console.log('=' .repeat(60));
    
    // 1. Buscar dados como o frontend faz
    const [ordersResponse, transactionsResponse] = await Promise.all([
      fetch(`${baseUrl}/api/admin/orders`),
      fetch(`${baseUrl}/api/admin/transactions`)
    ]);
    
    const orders = await ordersResponse.json();
    const transactions = await transactionsResponse.json();
    
    console.log(`📊 Dados carregados:`);
    console.log(`   - Pedidos: ${orders.length}`);
    console.log(`   - Transações: ${transactions.length}`);
    
    // 2. Calcular PIX como o frontend atualmente faz (APENAS PEDIDOS)
    const pixOrders = orders.filter(order => order.paymentMethod === 'pix' && order.status === 'completed');
    const pixFromOrdersOnly = pixOrders.reduce((sum, order) => sum + parseFloat(order.total?.toString() || '0'), 0);
    
    console.log(`\n💳 CÁLCULO ATUAL (APENAS PEDIDOS):`);
    console.log(`   - Pedidos PIX: ${pixOrders.length}`);
    console.log(`   - Valor total: R$ ${pixFromOrdersOnly.toFixed(2)}`);
    
    // 3. Buscar transações de crediário pagas (que seriam via PIX)
    const creditTransactions = transactions.filter(t => 
      t.type === 'income' && 
      t.category === 'Crediário' && 
      t.status === 'completed'
    );
    
    const pixFromCredit = creditTransactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    
    console.log(`\n💰 TRANSAÇÕES DE CREDIÁRIO (VIA PIX):`);
    console.log(`   - Transações de crediário: ${creditTransactions.length}`);
    console.log(`   - Valor total: R$ ${pixFromCredit.toFixed(2)}`);
    
    creditTransactions.forEach((t, index) => {
      console.log(`   ${index + 1}. R$ ${t.amount} - ${t.description}`);
    });
    
    // 4. Calcular PIX TOTAL (pedidos + crediário)
    const pixTotal = pixFromOrdersOnly + pixFromCredit;
    
    console.log(`\n🎯 CÁLCULO CORRIGIDO (PEDIDOS + CREDIÁRIO):`);
    console.log(`   - PIX de pedidos: R$ ${pixFromOrdersOnly.toFixed(2)}`);
    console.log(`   - PIX de crediário: R$ ${pixFromCredit.toFixed(2)}`);
    console.log(`   - TOTAL PIX: R$ ${pixTotal.toFixed(2)}`);
    
    console.log(`\n📈 DIFERENÇA:`);
    console.log(`   - Valor atual: R$ ${pixFromOrdersOnly.toFixed(2)}`);
    console.log(`   - Valor correto: R$ ${pixTotal.toFixed(2)}`);
    console.log(`   - Diferença: +R$ ${(pixTotal - pixFromOrdersOnly).toFixed(2)}`);
    
    if (pixFromCredit > 0) {
      console.log(`\n✅ CORREÇÃO NECESSÁRIA CONFIRMADA!`);
      console.log(`   O card PIX deve mostrar R$ ${pixTotal.toFixed(2)} em vez de R$ ${pixFromOrdersOnly.toFixed(2)}`);
      console.log(`   Isso inclui os R$ ${pixFromCredit.toFixed(2)} da Valeria e outros pagamentos de crediário`);
    } else {
      console.log(`\n⚠️  Nenhuma transação de crediário encontrada`);
    }
    
    // 5. Verificar especificamente a Valeria
    const valeriaTransaction = creditTransactions.find(t => 
      parseFloat(t.amount.toString()) === 45 || 
      t.description.toLowerCase().includes('valeria')
    );
    
    if (valeriaTransaction) {
      console.log(`\n👤 TRANSAÇÃO DA VALERIA ENCONTRADA:`);
      console.log(`   ID: ${valeriaTransaction.id}`);
      console.log(`   Valor: R$ ${valeriaTransaction.amount}`);
      console.log(`   Descrição: ${valeriaTransaction.description}`);
      console.log(`   Data: ${valeriaTransaction.date}`);
    }
    
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
};

// Executar teste
testFinancialPIXFix();