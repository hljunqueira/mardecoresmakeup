// Script para debugar o erro 500 específico da conta de crediário
const baseUrl = 'http://localhost:5170';
const accountId = '2f3947c4-201e-4750-8f9a-920e5729ee93';

async function debugCreditError() {
  console.log('🔍 Debugging erro 500 na conta de crediário...');
  console.log(`📋 Account ID: ${accountId}`);
  
  try {
    // 1. Verificar se a conta existe
    console.log('\n1️⃣ Verificando se a conta existe...');
    const getResponse = await fetch(`${baseUrl}/api/admin/credit-accounts/${accountId}`);
    
    if (getResponse.ok) {
      const account = await getResponse.json();
      console.log('✅ Conta encontrada:', {
        id: account.id,
        customerId: account.customerId,
        accountNumber: account.accountNumber,
        totalAmount: account.totalAmount,
        paidAmount: account.paidAmount,
        remainingAmount: account.remainingAmount,
        status: account.status
      });
      
      // 2. Tentar diferentes cenários de atualização
      console.log('\n2️⃣ Testando diferentes payloads de atualização...');
      
      const testCases = [
        {
          name: 'Atualização simples - remainingAmount apenas',
          payload: { remainingAmount: "45.00" }
        },
        {
          name: 'Atualização com paidAmount',
          payload: { 
            paidAmount: "10.00",
            remainingAmount: "35.00"
          }
        },
        {
          name: 'Atualização com status',
          payload: { 
            status: 'active',
            remainingAmount: "45.00"
          }
        },
        {
          name: 'Payload vazio (deve falhar)',
          payload: {}
        }
      ];
      
      for (const testCase of testCases) {
        console.log(`\n🧪 Teste: ${testCase.name}`);
        console.log(`📤 Payload:`, JSON.stringify(testCase.payload, null, 2));
        
        try {
          const updateResponse = await fetch(`${baseUrl}/api/admin/credit-accounts/${accountId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testCase.payload)
          });
          
          const responseText = await updateResponse.text();
          
          if (updateResponse.ok) {
            console.log('✅ SUCESSO:', JSON.parse(responseText));
          } else {
            console.log(`❌ ERRO ${updateResponse.status}:`, responseText);
          }
        } catch (error) {
          console.log('❌ ERRO DE CONEXÃO:', error.message);
        }
        
        // Pequena pausa entre testes
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } else {
      const errorText = await getResponse.text();
      console.log(`❌ Conta não encontrada (${getResponse.status}):`, errorText);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar
debugCreditError().catch(console.error);