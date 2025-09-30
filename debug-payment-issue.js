// Script para debugar o problema específico de JSON parsing nos pagamentos
const testPaymentSubmission = async () => {
  const baseUrl = 'http://localhost:5170';
  
  console.log('🧪 Iniciando teste específico do problema de JSON parsing...');
  
  try {
    // 1. Buscar conta com R$ 20,00 pendente (baseado na imagem do usuário)
    console.log('🔍 Buscando contas de crediário...');
    const accountsResponse = await fetch(`${baseUrl}/api/admin/credit-accounts`);
    const accounts = await accountsResponse.json();
    
    // Procurar conta com valor específico
    const targetAccount = accounts.find(acc => {
      const remaining = parseFloat(acc.remainingAmount || '0');
      return acc.status === 'active' && Math.abs(remaining - 20) < 0.1; // Tolerância de 10 centavos
    });
    
    if (!targetAccount) {
      console.log('❌ Não encontrou conta com ~R$ 20,00 pendente');
      console.log('📋 Contas disponíveis:');
      accounts.forEach(acc => {
        console.log(`   - ${acc.accountNumber}: R$ ${acc.remainingAmount} (${acc.status})`);
      });
      return;
    }
    
    console.log(`✅ Conta encontrada: ${targetAccount.accountNumber} - Pendente: R$ ${targetAccount.remainingAmount}`);
    
    // 2. Testar diferentes payloads JSON para identificar o problema
    const testPayloads = [
      {
        name: 'Payload Simples',
        data: {
          creditAccountId: targetAccount.id,
          amount: 20,
          paymentMethod: 'pix',
          notes: 'Teste simples',
          status: 'completed'
        }
      },
      {
        name: 'Payload com strings',
        data: {
          creditAccountId: targetAccount.id,
          amount: "20",
          paymentMethod: 'pix',
          notes: 'Teste com string',
          status: 'completed'
        }
      },
      {
        name: 'Payload frontend exato',
        data: {
          creditAccountId: targetAccount.id,
          amount: 20.00,
          paymentMethod: 'pix',
          notes: '',
          status: 'completed'
        }
      }
    ];
    
    for (const test of testPayloads) {
      console.log(`\n🧪 Testando: ${test.name}`);
      console.log('📤 Payload:', JSON.stringify(test.data, null, 2));
      
      try {
        const response = await fetch(`${baseUrl}/api/admin/credit-payments`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(test.data)
        });
        
        console.log(`📥 Status: ${response.status}`);
        console.log(`📥 Headers:`, Object.fromEntries(response.headers.entries()));
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const result = await response.json();
          if (response.ok) {
            console.log(`✅ Sucesso: ${JSON.stringify(result)}`);
          } else {
            console.log(`❌ Erro JSON: ${JSON.stringify(result)}`);
          }
        } else {
          const text = await response.text();
          console.log(`❌ Resposta não-JSON: ${text.substring(0, 200)}...`);
        }
        
      } catch (error) {
        console.log(`❌ Erro de rede/parsing: ${error.message}`);
      }
      
      // Aguardar um pouco entre testes
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
};

testPaymentSubmission().catch(console.error);