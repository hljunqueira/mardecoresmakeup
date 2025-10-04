const investigateValeriaPayment = async () => {
  const baseUrl = 'http://localhost:5170';
  
  try {
    console.log('🔍 INVESTIGAÇÃO COMPLETA - CASO VALERIA - R$ 45 VIA PIX');
    console.log('=' .repeat(60));
    
    // 1. BUSCAR TODAS AS CONTAS PARA ENCONTRAR A VALERIA
    console.log('\n📋 1. BUSCANDO CONTAS DE CREDIÁRIO...');
    const accountsResponse = await fetch(`${baseUrl}/api/admin/credit-accounts`);
    const accounts = await accountsResponse.json();
    
    console.log(`Total de contas: ${accounts.length}`);
    
    // Buscar contas que podem ser da Valeria (com valor próximo a R$ 45)
    const possibleValeriaAccounts = accounts.filter(acc => {
      const total = parseFloat(acc.totalAmount || '0');
      const remaining = parseFloat(acc.remainingAmount || '0');
      return total === 45 || remaining === 45 || total >= 40;
    });
    
    console.log(`Contas possíveis da Valeria: ${possibleValeriaAccounts.length}`);
    
    possibleValeriaAccounts.forEach((acc, index) => {
      console.log(`\n${index + 1}. Conta: ${acc.accountNumber}`);
      console.log(`   ID: ${acc.id}`);
      console.log(`   Status: ${acc.status}`);
      console.log(`   Total: R$ ${acc.totalAmount}`);
      console.log(`   Pago: R$ ${acc.paidAmount || '0.00'}`);
      console.log(`   Restante: R$ ${acc.remainingAmount}`);
      console.log(`   Cliente ID: ${acc.customerId}`);
    });
    
    // 2. BUSCAR CLIENTES PARA ENCONTRAR VALERIA PELO NOME
    console.log('\n👥 2. BUSCANDO CLIENTES...');
    const customersResponse = await fetch(`${baseUrl}/api/admin/customers`);
    const customers = await customersResponse.json();
    
    const valeriaCustomer = customers.find(c => 
      c.name && c.name.toLowerCase().includes('valeria')
    );
    
    if (valeriaCustomer) {
      console.log(`✅ Cliente Valeria encontrada:`);
      console.log(`   ID: ${valeriaCustomer.id}`);
      console.log(`   Nome: ${valeriaCustomer.name}`);
      console.log(`   Email: ${valeriaCustomer.email || 'N/A'}`);
      console.log(`   Telefone: ${valeriaCustomer.phone || 'N/A'}`);
      console.log(`   Total gasto: R$ ${valeriaCustomer.totalSpent || '0.00'}`);
      
      // Buscar conta de crediário da Valeria
      const valeriaAccount = accounts.find(acc => acc.customerId === valeriaCustomer.id);
      
      if (valeriaAccount) {
        console.log(`\n📋 CONTA DE CREDIÁRIO DA VALERIA:`);
        console.log(`   Número: ${valeriaAccount.accountNumber}`);
        console.log(`   Status: ${valeriaAccount.status}`);
        console.log(`   Total: R$ ${valeriaAccount.totalAmount}`);
        console.log(`   Pago: R$ ${valeriaAccount.paidAmount || '0.00'}`);
        console.log(`   Restante: R$ ${valeriaAccount.remainingAmount}`);
        
        // 3. BUSCAR PAGAMENTOS DESTA CONTA
        console.log(`\n💳 3. VERIFICANDO PAGAMENTOS DA CONTA ${valeriaAccount.accountNumber}...`);
        
        try {
          const paymentsResponse = await fetch(`${baseUrl}/api/admin/credit-accounts/${valeriaAccount.id}/payments`);
          const payments = await paymentsResponse.json();
          
          console.log(`Total de pagamentos registrados: ${payments.length}`);
          
          payments.forEach((payment, index) => {
            console.log(`\n${index + 1}. Pagamento R$ ${payment.amount}`);
            console.log(`   Método: ${payment.paymentMethod}`);
            console.log(`   Data: ${payment.createdAt}`);
            console.log(`   Status: ${payment.status || 'N/A'}`);
            console.log(`   Notas: ${payment.notes || 'N/A'}`);
            console.log(`   ID: ${payment.id}`);
          });
          
          // Verificar se tem pagamento de R$ 45 via PIX
          const pixPayment45 = payments.find(p => 
            parseFloat(p.amount) === 45 && p.paymentMethod === 'pix'
          );
          
          if (pixPayment45) {
            console.log(`\n✅ PAGAMENTO DE R$ 45 VIA PIX ENCONTRADO!`);
            console.log(`   ID: ${pixPayment45.id}`);
            console.log(`   Data: ${pixPayment45.createdAt}`);
            
            // 4. VERIFICAR SE GEROU TRANSAÇÃO FINANCEIRA
            console.log(`\n💰 4. VERIFICANDO TRANSAÇÃO FINANCEIRA...`);
            
            const transactionsResponse = await fetch(`${baseUrl}/api/admin/transactions`);
            const transactions = await transactionsResponse.json();
            
            const relatedTransactions = transactions.filter(t => 
              t.metadata && 
              typeof t.metadata === 'object' && 
              (t.metadata.creditAccountId === valeriaAccount.id ||
               t.metadata.accountNumber === valeriaAccount.accountNumber ||
               parseFloat(t.amount) === 45)
            );
            
            console.log(`Transações relacionadas: ${relatedTransactions.length}`);
            
            relatedTransactions.forEach((t, index) => {
              console.log(`\n${index + 1}. Transação R$ ${t.amount}`);
              console.log(`   Descrição: ${t.description}`);
              console.log(`   Categoria: ${t.category}`);
              console.log(`   Status: ${t.status}`);
              console.log(`   Fonte: ${t.metadata?.source || 'N/A'}`);
              console.log(`   Data: ${t.date}`);
            });
            
            // 5. VERIFICAR PORQUE A CONTA NÃO ATUALIZOU
            console.log(`\n🔍 5. ANÁLISE DO PROBLEMA:`);
            
            const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
            const accountPaid = parseFloat(valeriaAccount.paidAmount || '0');
            const accountRemaining = parseFloat(valeriaAccount.remainingAmount || '0');
            const accountTotal = parseFloat(valeriaAccount.totalAmount || '0');
            
            console.log(`   Total dos pagamentos individuais: R$ ${totalPaid.toFixed(2)}`);
            console.log(`   Valor 'pago' na conta: R$ ${accountPaid.toFixed(2)}`);
            console.log(`   Valor 'restante' na conta: R$ ${accountRemaining.toFixed(2)}`);
            console.log(`   Valor 'total' da conta: R$ ${accountTotal.toFixed(2)}`);
            
            if (totalPaid !== accountPaid) {
              console.log(`\n🚨 PROBLEMA ENCONTRADO: DISCREPÂNCIA NOS VALORES!`);
              console.log(`   A conta não foi atualizada corretamente após o pagamento`);
              console.log(`   Diferença: R$ ${(totalPaid - accountPaid).toFixed(2)}`);
              
              // Calcular valores corretos
              const correctRemaining = Math.max(0, accountTotal - totalPaid);
              
              console.log(`\n💡 VALORES CORRETOS DEVERIAM SER:`);
              console.log(`   Pago: R$ ${totalPaid.toFixed(2)}`);
              console.log(`   Restante: R$ ${correctRemaining.toFixed(2)}`);
              console.log(`   Status: ${correctRemaining <= 0 ? 'paid_off' : 'active'}`);
              
              // Tentar corrigir a conta
              console.log(`\n🔧 TENTANDO CORRIGIR A CONTA...`);
              
              const correctionData = {
                paidAmount: totalPaid.toString(),
                remainingAmount: correctRemaining.toString(),
                status: correctRemaining <= 0 ? 'paid_off' : 'active'
              };
              
              const updateResponse = await fetch(`${baseUrl}/api/admin/credit-accounts/${valeriaAccount.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(correctionData)
              });
              
              if (updateResponse.ok) {
                console.log(`✅ CONTA CORRIGIDA COM SUCESSO!`);
                
                const updatedAccount = await updateResponse.json();
                console.log(`   Novo status: ${updatedAccount.status}`);
                console.log(`   Novo valor pago: R$ ${updatedAccount.paidAmount}`);
                console.log(`   Novo valor restante: R$ ${updatedAccount.remainingAmount}`);
              } else {
                console.log(`❌ Erro ao corrigir conta: ${updateResponse.statusText}`);
              }
            }
            
          } else {
            console.log(`❌ PAGAMENTO DE R$ 45 VIA PIX NÃO ENCONTRADO!`);
          }
          
        } catch (paymentError) {
          console.error(`❌ Erro ao buscar pagamentos: ${paymentError.message}`);
        }
        
      } else {
        console.log(`❌ Conta de crediário da Valeria não encontrada!`);
      }
      
    } else {
      console.log(`❌ Cliente Valeria não encontrado!`);
      console.log(`Clientes disponíveis:`);
      customers.slice(0, 10).forEach(c => {
        console.log(`   - ${c.name} (ID: ${c.id})`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 INVESTIGAÇÃO CONCLUÍDA');
    
  } catch (error) {
    console.error('❌ Erro na investigação:', error.message);
  }
};

// Executar investigação
investigateValeriaPayment();