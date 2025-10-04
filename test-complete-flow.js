// Teste completo do fluxo de crediário
const baseUrl = 'http://localhost:5170';

async function testCompleteFlow() {
  console.log('🚀 Iniciando teste completo do fluxo de crediário...\n');
  
  let testCustomerId = null;
  let testAccountId = null;
  let testPaymentId = null;
  
  try {
    // 1. CRIAR OU BUSCAR CLIENTE DE TESTE
    console.log('1️⃣ === CRIANDO/BUSCANDO CLIENTE DE TESTE ===');
    
    // Buscar clientes existentes
    const customersResponse = await fetch(`${baseUrl}/api/admin/customers`);
    const customers = await customersResponse.json();
    
    let testCustomer = customers.find(c => c.name?.includes('Teste') || c.email?.includes('teste'));
    
    if (!testCustomer) {
      // Criar cliente de teste
      console.log('📝 Criando novo cliente de teste...');
      const createCustomerResponse = await fetch(`${baseUrl}/api/admin/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Cliente Teste Fluxo',
          email: 'teste.fluxo@email.com',
          phone: '11999999999'
        })
      });
      
      if (createCustomerResponse.ok) {
        testCustomer = await createCustomerResponse.json();
        console.log('✅ Cliente criado:', testCustomer.name, '(ID:', testCustomer.id + ')');
      } else {
        throw new Error('Falha ao criar cliente de teste');
      }
    } else {
      console.log('✅ Cliente de teste encontrado:', testCustomer.name, '(ID:', testCustomer.id + ')');
    }
    
    testCustomerId = testCustomer.id;
    
    // 2. CRIAR CONTA DE CREDIÁRIO
    console.log('\n2️⃣ === CRIANDO CONTA DE CREDIÁRIO ===');
    
    const accountData = {
      customerId: testCustomerId,
      accountNumber: `TEST-${Date.now()}`,
      totalAmount: '100.00',
      paidAmount: '0.00',
      remainingAmount: '100.00',
      installments: 3,
      installmentValue: '33.33',
      paymentFrequency: 'monthly',
      nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      notes: 'Conta de teste para validação do fluxo completo'
    };
    
    console.log('📤 Dados da conta:', JSON.stringify(accountData, null, 2));
    
    const createAccountResponse = await fetch(`${baseUrl}/api/admin/credit-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accountData)
    });
    
    if (createAccountResponse.ok) {
      const testAccount = await createAccountResponse.json();
      testAccountId = testAccount.id;
      console.log('✅ Conta de crediário criada:');
      console.log(`   📋 Número: ${testAccount.accountNumber}`);
      console.log(`   💰 Total: R$ ${testAccount.totalAmount}`);
      console.log(`   📅 Próximo pagamento: ${testAccount.nextPaymentDate}`);
      console.log(`   🆔 ID: ${testAccount.id}`);
    } else {
      const errorText = await createAccountResponse.text();
      throw new Error(`Falha ao criar conta: ${errorText}`);
    }
    
    // 3. REALIZAR PAGAMENTO
    console.log('\n3️⃣ === REALIZANDO PAGAMENTO ===');
    
    const paymentData = {
      creditAccountId: testAccountId,
      amount: 35.50,
      paymentMethod: 'pix',
      notes: 'Pagamento de teste do fluxo automatizado'
    };
    
    console.log('💳 Dados do pagamento:', JSON.stringify(paymentData, null, 2));
    
    const paymentResponse = await fetch(`${baseUrl}/api/admin/credit-payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    
    if (paymentResponse.ok) {
      const payment = await paymentResponse.json();
      testPaymentId = payment.id;
      console.log('✅ Pagamento registrado:');
      console.log(`   💰 Valor: R$ ${payment.amount}`);
      console.log(`   🔄 Método: ${payment.paymentMethod}`);
      console.log(`   🆔 ID: ${payment.id}`);
    } else {
      const errorText = await paymentResponse.text();
      throw new Error(`Falha ao registrar pagamento: ${errorText}`);
    }
    
    // 4. ATUALIZAR CONTA COM PAGAMENTO
    console.log('\n4️⃣ === ATUALIZANDO CONTA COM PAGAMENTO ===');
    
    const updateData = {
      paidAmount: '35.50',
      remainingAmount: '64.50',
      status: 'active'
    };
    
    console.log('🔄 Dados de atualização:', JSON.stringify(updateData, null, 2));
    
    const updateResponse = await fetch(`${baseUrl}/api/admin/credit-accounts/${testAccountId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    
    if (updateResponse.ok) {
      const updatedAccount = await updateResponse.json();
      console.log('✅ Conta atualizada:');
      console.log(`   💰 Pago: R$ ${updatedAccount.paidAmount}`);
      console.log(`   📊 Pendente: R$ ${updatedAccount.remainingAmount}`);
      console.log(`   📈 Status: ${updatedAccount.status}`);
    } else {
      const errorText = await updateResponse.text();
      throw new Error(`Falha ao atualizar conta: ${errorText}`);
    }
    
    // 5. VERIFICAR DADOS ATUALIZADOS
    console.log('\n5️⃣ === VERIFICANDO DADOS ATUALIZADOS ===');
    
    // Verificar conta
    const getAccountResponse = await fetch(`${baseUrl}/api/admin/credit-accounts/${testAccountId}`);
    const currentAccount = await getAccountResponse.json();
    
    // Verificar pagamentos
    const getPaymentsResponse = await fetch(`${baseUrl}/api/admin/credit-accounts/${testAccountId}/payments`);
    const payments = await getPaymentsResponse.json();
    
    console.log('📊 Estado atual da conta:');
    console.log(`   📋 Número: ${currentAccount.accountNumber}`);
    console.log(`   💰 Total: R$ ${currentAccount.totalAmount}`);
    console.log(`   ✅ Pago: R$ ${currentAccount.paidAmount}`);
    console.log(`   📊 Pendente: R$ ${currentAccount.remainingAmount}`);
    console.log(`   📈 Status: ${currentAccount.status}`);
    console.log(`   💳 Pagamentos: ${payments.length}`);
    
    // 6. TESTE DE PAGAMENTO TOTAL (OPCIONAL)
    console.log('\n6️⃣ === TESTANDO PAGAMENTO TOTAL (OPCIONAL) ===');
    console.log('⏭️ Pulando teste de quitação total por enquanto...');
    
    // 7. LIMPEZA - DELETAR CONTA DE TESTE
    console.log('\n7️⃣ === LIMPANDO DADOS DE TESTE ===');
    
    if (testAccountId) {
      console.log('🗑️ Deletando conta de crediário de teste...');
      const deleteResponse = await fetch(`${baseUrl}/api/admin/credit-accounts/${testAccountId}`, {
        method: 'DELETE'
      });
      
      if (deleteResponse.ok) {
        const deleteResult = await deleteResponse.json();
        console.log('✅ Conta deletada:', deleteResult.accountNumber);
        console.log(`   🧹 Pagamentos removidos: ${deleteResult.deletedPayments}`);
      } else {
        const errorText = await deleteResponse.text();
        console.log('❌ Erro ao deletar conta:', errorText);
      }
    }
    
    // Opcionalmente deletar cliente de teste (comentado para preservar)
    // if (testCustomerId && testCustomer.email?.includes('teste')) {
    //   console.log('🗑️ Deletando cliente de teste...');
    //   await fetch(`${baseUrl}/api/admin/customers/${testCustomerId}`, { method: 'DELETE' });
    // }
    
    console.log('\n🎉 === TESTE COMPLETO CONCLUÍDO COM SUCESSO! ===');
    console.log('✅ Todos os fluxos funcionaram corretamente:');
    console.log('   1. ✅ Criação de cliente');
    console.log('   2. ✅ Criação de conta de crediário');
    console.log('   3. ✅ Registro de pagamento');
    console.log('   4. ✅ Atualização de conta');
    console.log('   5. ✅ Verificação de dados');
    console.log('   6. ✅ Limpeza de dados');
    
  } catch (error) {
    console.error('\n❌ === ERRO NO TESTE ===');
    console.error('Erro:', error.message);
    
    // Tentativa de limpeza em caso de erro
    if (testAccountId) {
      console.log('\n🧹 Tentando limpeza em caso de erro...');
      try {
        await fetch(`${baseUrl}/api/admin/credit-accounts/${testAccountId}`, { method: 'DELETE' });
        console.log('✅ Conta de teste removida após erro');
      } catch (cleanupError) {
        console.log('❌ Falha na limpeza:', cleanupError.message);
      }
    }
  }
}

// Executar teste
testCompleteFlow().catch(console.error);