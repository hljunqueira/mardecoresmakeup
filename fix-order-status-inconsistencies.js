/**
 * Script para corrigir inconsistências entre status de pedidos e contas de crediário
 */

const fixOrderStatusInconsistencies = async () => {
  const baseUrl = 'http://localhost:5170';
  
  try {
    console.log('🔍 === ANÁLISE DE INCONSISTÊNCIAS PEDIDO x CONTA ===\n');
    
    // 1. Buscar todos os pedidos de crediário
    console.log('📋 Buscando pedidos de crediário...');
    const ordersResponse = await fetch(`${baseUrl}/api/admin/orders`);
    const allOrders = await ordersResponse.json();
    
    const creditOrders = allOrders.filter(order => order.paymentMethod === 'credit');
    console.log(`✅ Encontrados ${creditOrders.length} pedidos de crediário`);
    
    // 2. Buscar todas as contas de crediário
    console.log('\n💳 Buscando contas de crediário...');
    const accountsResponse = await fetch(`${baseUrl}/api/admin/credit-accounts`);
    const accounts = await accountsResponse.json();
    console.log(`✅ Encontradas ${accounts.length} contas de crediário`);
    
    // 3. Buscar clientes para mapear IDs
    const customersResponse = await fetch(`${baseUrl}/api/admin/customers`);
    const customers = await customersResponse.json();
    
    console.log('\n🔍 Analisando inconsistências...\n');
    
    const inconsistencies = [];
    let fixedCount = 0;
    
    // 4. Verificar cada pedido de crediário
    for (const order of creditOrders) {
      // Encontrar a conta de crediário do cliente
      const creditAccount = accounts.find(acc => 
        acc.customerId === order.customerId && 
        (acc.status === 'active' || acc.status === 'paid_off')
      );
      
      if (!creditAccount) {
        console.log(`⚠️ Pedido ${order.orderNumber || order.id} sem conta de crediário`);
        continue;
      }
      
      const customer = customers.find(c => c.id === order.customerId);
      const customerName = customer?.name || 'Cliente não encontrado';
      
      // Verificar se há inconsistência
      const remainingAmount = parseFloat(creditAccount.remainingAmount || '0');
      const isAccountPaidOff = remainingAmount <= 0;
      const isOrderCompleted = order.status === 'completed';
      
      console.log(`📋 ${order.orderNumber || order.id} - ${customerName}:`);
      console.log(`   Pedido: ${order.status}`);
      console.log(`   Conta: R$ ${remainingAmount.toFixed(2)} restante (${creditAccount.status})`);
      
      if (isAccountPaidOff && !isOrderCompleted) {
        console.log(`   🚨 INCONSISTÊNCIA: Conta quitada mas pedido ainda ${order.status}`);
        
        inconsistencies.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName,
          currentOrderStatus: order.status,
          shouldBeStatus: 'completed',
          accountStatus: creditAccount.status,
          remainingAmount: remainingAmount
        });
        
        // 5. Corrigir automaticamente
        console.log(`   🔧 Corrigindo status do pedido para 'completed'...`);
        
        try {
          const updateResponse = await fetch(`${baseUrl}/api/admin/orders/${order.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'completed',
              paymentStatus: 'paid'
            })
          });
          
          if (updateResponse.ok) {
            console.log(`   ✅ Pedido corrigido com sucesso!`);
            fixedCount++;
          } else {
            console.log(`   ❌ Erro ao corrigir pedido: ${updateResponse.status}`);
          }
        } catch (error) {
          console.log(`   ❌ Erro ao corrigir pedido: ${error.message}`);
        }
        
      } else if (isAccountPaidOff && isOrderCompleted) {
        console.log(`   ✅ Consistente: Conta quitada e pedido completado`);
      } else if (!isAccountPaidOff && !isOrderCompleted) {
        console.log(`   ✅ Consistente: Conta pendente e pedido pendente`);
      } else if (!isAccountPaidOff && isOrderCompleted) {
        console.log(`   ⚠️ ATENÇÃO: Pedido completado mas conta ainda tem pendência`);
      }
      
      console.log('');
    }
    
    console.log('📊 === RESUMO DA CORREÇÃO ===');
    console.log(`🔍 Pedidos analisados: ${creditOrders.length}`);
    console.log(`🚨 Inconsistências encontradas: ${inconsistencies.length}`);
    console.log(`✅ Pedidos corrigidos: ${fixedCount}`);
    
    if (inconsistencies.length > 0) {
      console.log('\n📋 Detalhes das inconsistências encontradas:');
      inconsistencies.forEach((inc, index) => {
        console.log(`${index + 1}. ${inc.orderNumber} - ${inc.customerName}`);
        console.log(`   Status anterior: ${inc.currentOrderStatus} → ${inc.shouldBeStatus}`);
        console.log(`   Conta: ${inc.accountStatus} (R$ ${inc.remainingAmount.toFixed(2)} restante)`);
      });
    }
    
    if (fixedCount > 0) {
      console.log('\n🎉 Inconsistências corrigidas! O sistema agora está sincronizado.');
      console.log('💡 Recarregue a página de crediário para ver as mudanças.');
    } else {
      console.log('\n✅ Nenhuma inconsistência encontrada ou todas já estavam corretas.');
    }
    
  } catch (error) {
    console.error('❌ Erro durante a análise:', error);
  }
};

// Executar o script
console.log('🚀 Iniciando verificação de inconsistências...\n');
fixOrderStatusInconsistencies().then(() => {
  console.log('\n✅ Verificação concluída!');
}).catch(error => {
  console.error('❌ Erro na verificação:', error);
});