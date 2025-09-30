// Script para criar conta de teste e reproduzir o problema exato
const createTestAccountAndDebug = async () => {
  const baseUrl = 'http://localhost:5170';
  
  console.log('🔧 Criando cenário de teste para reproduzir o problema...');
  
  try {
    // 1. Buscar ou criar cliente
    console.log('👤 Buscando clientes...');
    const customersResponse = await fetch(`${baseUrl}/api/admin/customers`);
    const customers = await customersResponse.json();
    
    let testCustomer = customers.find(c => c.name === 'Cliente Teste JSON');
    
    if (!testCustomer) {
      console.log('👤 Criando cliente de teste...');
      const customerResponse = await fetch(`${baseUrl}/api/admin/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Cliente Teste JSON',
          phone: '11999999999',
          email: 'teste@json.com'
        })
      });
      testCustomer = await customerResponse.json();
      console.log(`✅ Cliente criado: ${testCustomer.id}`);
    } else {
      console.log(`✅ Cliente existente: ${testCustomer.id}`);
    }
    
    // 2. Criar conta de crediário com R$ 20,00
    console.log('💳 Criando conta de crediário...');
    const accountResponse = await fetch(`${baseUrl}/api/admin/credit-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: testCustomer.id,
        accountNumber: `TEST-${Date.now()}`,
        totalAmount: '20.00',
        paidAmount: '0.00',
        remainingAmount: '20.00',
        status: 'active',
        nextPaymentDate: new Date().toISOString().split('T')[0]
      })
    });
    
    const testAccount = await accountResponse.json();
    console.log(`✅ Conta criada: ${testAccount.accountNumber} - R$ ${testAccount.remainingAmount} pendente`);
    
    // 3. Agora testar os diferentes cenários de pagamento
    console.log('\n🧪 Testando cenários que podem causar JSON parsing error...');
    
    const testCases = [
      {
        name: 'Valor exato R$ 20,00',
        payload: {
          creditAccountId: testAccount.id,
          amount: 20.00,
          paymentMethod: 'pix',
          notes: '',
          status: 'completed'
        }
      },
      {
        name: 'Valor string "20"',
        payload: {
          creditAccountId: testAccount.id,
          amount: "20",
          paymentMethod: 'pix',
          notes: '',
          status: 'completed'
        }
      },
      {
        name: 'Com notas em português',
        payload: {
          creditAccountId: testAccount.id,
          amount: 5.00,
          paymentMethod: 'pix',
          notes: 'Pagamento com acentuação: ção, ã, ê',
          status: 'completed'
        }
      },
      {
        name: 'Campo undefined',
        payload: {
          creditAccountId: testAccount.id,
          amount: 5.00,
          paymentMethod: 'pix',
          notes: undefined,
          status: 'completed'
        }
      },
      {
        name: 'Campo null',
        payload: {
          creditAccountId: testAccount.id,
          amount: 5.00,
          paymentMethod: 'pix',
          notes: null,
          status: 'completed'
        }
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n🔬 Teste: ${testCase.name}`);
      console.log('📤 Payload original:', testCase.payload);
      
      try {
        const jsonString = JSON.stringify(testCase.payload);
        console.log('📤 JSON stringified:', jsonString);
        
        const response = await fetch(`${baseUrl}/api/admin/credit-payments`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: jsonString
        });
        
        console.log(`📥 Status HTTP: ${response.status}`);
        console.log(`📥 Content-Type: ${response.headers.get('content-type')}`);
        
        try {
          const result = await response.json();
          if (response.ok) {
            console.log(`✅ SUCESSO:`, result);
          } else {
            console.log(`❌ ERRO:`, result);
          }
        } catch (parseError) {
          const text = await response.text();
          console.log(`❌ ERRO DE PARSING JSON:`, parseError.message);
          console.log(`📄 Resposta raw:`, text.substring(0, 300));
        }
        
      } catch (networkError) {
        console.log(`❌ ERRO DE REDE:`, networkError.message);
      }
      
      // Aguardar entre testes
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
};

createTestAccountAndDebug().catch(console.error);