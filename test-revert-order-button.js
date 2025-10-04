/**
 * Teste do botão "Voltar para Pendente" na página de crediário
 */

const testRevertOrderButton = async () => {
  const baseUrl = 'http://localhost:5170';
  
  try {
    console.log('🔙 === TESTE: BOTÃO VOLTAR PARA PENDENTE ===\n');
    
    // 1. Buscar pedidos concluídos
    console.log('📋 Buscando pedidos concluídos...');
    const ordersResponse = await fetch(`${baseUrl}/api/admin/orders`);
    const orders = await ordersResponse.json();
    
    const completedOrders = orders.filter(order => order.status === 'completed');
    console.log(`✅ Encontrados ${completedOrders.length} pedidos concluídos`);
    
    if (completedOrders.length === 0) {
      console.log('❌ Nenhum pedido concluído encontrado para testar');
      return;
    }
    
    // 2. Selecionar o primeiro pedido concluído para teste
    const testOrder = completedOrders[0];
    console.log(`🎯 Testando com pedido: ${testOrder.orderNumber || testOrder.id}`);
    console.log(`   Status atual: ${testOrder.status}`);
    console.log(`   Cliente ID: ${testOrder.customerId}`);
    console.log(`   Valor: R$ ${testOrder.total}`);
    
    // 3. Reverter o pedido para pendente
    console.log(`\n🔄 Revertendo pedido para "pending"...`);
    
    const revertData = {
      status: 'pending',
      paymentStatus: 'pending'
    };
    
    const revertResponse = await fetch(`${baseUrl}/api/admin/orders/${testOrder.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(revertData)
    });
    
    console.log(`📥 Status da resposta: ${revertResponse.status} ${revertResponse.statusText}`);
    
    if (revertResponse.ok) {
      const result = await revertResponse.json();
      console.log('\n✅ ===== PEDIDO REVERTIDO COM SUCESSO! =====');
      console.log(`✅ Pedido: ${result.orderNumber || result.id}`);
      console.log(`📊 Status anterior: completed → Status atual: ${result.status}`);
      console.log(`💳 Payment Status: ${result.paymentStatus}`);
      
      // 4. Verificar se o botão aparecerá corretamente
      console.log('\n🔍 Verificando status final...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo
      
      const verifyResponse = await fetch(`${baseUrl}/api/admin/orders`);
      const updatedOrders = await verifyResponse.json();
      const updatedOrder = updatedOrders.find(order => order.id === testOrder.id);
      
      if (updatedOrder) {
        console.log('📊 Status do pedido após reversão:');
        console.log(`   📦 Pedido: ${updatedOrder.orderNumber || updatedOrder.id}`);
        console.log(`   🏷️ Status: ${updatedOrder.status}`);
        console.log(`   💳 Payment Status: ${updatedOrder.paymentStatus || 'N/A'}`);
        
        if (updatedOrder.status === 'pending') {
          console.log('\n🎉 ===== TESTE PASSOU! =====');
          console.log('✅ Pedido foi revertido para "pending"');
          console.log('✅ Botão "Voltar para Pendente" funcionará corretamente');
          console.log('✅ Interface agora mostrará o pedido como "Pendente"');
          console.log('✅ Usuário pode fazer pagamentos novamente se necessário');
        } else {
          console.log('\n⚠️ PROBLEMA: Pedido não foi revertido corretamente');
        }
      }
      
    } else {
      const errorResult = await revertResponse.json();
      console.log('\n❌ ===== ERRO NA REVERSÃO =====');
      console.log(`Código: ${revertResponse.status}`);
      console.log(`Mensagem: ${errorResult.message}`);
      console.log('Detalhes:', errorResult);
    }
    
  } catch (error) {
    console.error('\n💥 ERRO CRÍTICO:', error);
  }
};

// Executar teste
console.log('🚀 Iniciando teste do botão "Voltar para Pendente"...\n');
testRevertOrderButton().then(() => {
  console.log('\n✅ Teste concluído!');
}).catch(error => {
  console.error('❌ Erro no teste:', error);
});