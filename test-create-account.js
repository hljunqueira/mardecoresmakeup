// Script para criar conta de teste com saldo pendente
const createTestAccount = async () => {
  const baseUrl = 'http://localhost:5170';
  
  // Buscar clientes
  console.log('🔍 Buscando clientes...');
  const customersResponse = await fetch(`${baseUrl}/api/admin/customers`);
  const customers = await customersResponse.json();
  
  if (customers.length === 0) {
    console.log('❌ Nenhum cliente encontrado');
    return;
  }
  
  const customer = customers[0];
  console.log(`✅ Cliente selecionado: ${customer.name} (${customer.id})`);
  
  // Criar conta de crediário com valor pendente
  const accountData = {
    customerId: customer.id,
    totalAmount: 100.00,
    paidAmount: 0.00,
    remainingAmount: 100.00,
    installments: 1,
    paymentFrequency: 'monthly',
    notes: 'Conta de teste para verificar pagamentos menores que R$ 20'
  };
  
  console.log('💳 Criando conta de crediário...');
  
  try {
    const response = await fetch(`${baseUrl}/api/admin/credit-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accountData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ Conta criada: ${result.accountNumber} - Total: R$ ${result.totalAmount}`);
      console.log(`📋 ID da conta: ${result.id}`);
      
      // Testar pagamentos pequenos
      await testSmallPayments(result.id);
    } else {
      console.log(`❌ Erro ao criar conta: ${result.message}`);
    }
  } catch (error) {
    console.log(`❌ Erro de conexão: ${error.message}`);
  }
};

const testSmallPayments = async (accountId) => {
  const baseUrl = 'http://localhost:5170';
  const testValues = [5, 10, 15, 19.99, 20, 25];
  
  console.log('\n🧪 Testando pagamentos com diferentes valores...');
  
  for (const amount of testValues) {
    console.log(`\n💰 Testando R$ ${amount}...`);
    
    const paymentData = {
      creditAccountId: accountId,
      amount: amount,
      paymentMethod: 'pix',
      notes: `Teste de pagamento R$ ${amount}`
    };
    
    try {
      const response = await fetch(`${baseUrl}/api/admin/credit-payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ R$ ${amount}: SUCESSO - Pagamento registrado`);
      } else {
        console.log(`❌ R$ ${amount}: ERRO - ${result.message}`);
      }
    } catch (error) {
      console.log(`❌ R$ ${amount}: ERRO DE CONEXÃO - ${error.message}`);
    }
  }
};

createTestAccount().catch(console.error);