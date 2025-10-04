// Teste para verificar as mensagens visuais da reversão de pedidos
console.log('🧪 Testando mensagens visuais da reversão de pedidos...');

async function testVisualMessages() {
  try {
    console.log('\n📋 Verificando se existem pedidos concluídos...');
    
    // Buscar pedidos
    const ordersResponse = await fetch('http://localhost:5170/api/admin/orders');
    const orders = await ordersResponse.json();
    
    const completedOrders = orders.filter(order => order.status === 'completed');
    console.log(`✅ Encontrados ${completedOrders.length} pedidos concluídos`);
    
    if (completedOrders.length === 0) {
      console.log('⚠️ Não há pedidos concluídos para testar a reversão');
      return;
    }
    
    // Testar reversão do primeiro pedido concluído
    const orderToRevert = completedOrders[0];
    console.log(`\n🔄 Testando reversão do pedido ${orderToRevert.id}...`);
    
    const revertResponse = await fetch(`http://localhost:5170/api/admin/orders/${orderToRevert.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'pending',
        paymentStatus: 'pending'
      }),
    });
    
    if (!revertResponse.ok) {
      throw new Error('Falha ao reverter pedido');
    }
    
    console.log('✅ Pedido revertido com sucesso!');
    console.log('🎨 Mensagens visuais esperadas:');
    console.log('  1. Toast notification de sucesso');
    console.log('  2. Alerta visual no topo da página');
    console.log('  3. Animação de entrada do alerta');
    console.log('  4. Emoji e cores visuais no botão');
    console.log('  5. Loading spinner durante processamento');
    
    // Verificar o status atual
    const updatedOrdersResponse = await fetch('http://localhost:5170/api/admin/orders');
    const updatedOrders = await updatedOrdersResponse.json();
    const updatedOrder = updatedOrders.find(o => o.id === orderToRevert.id);
    
    console.log(`\n📊 Status do pedido após reversão: ${updatedOrder.status}`);
    console.log(`💳 Status de pagamento: ${updatedOrder.paymentStatus}`);
    
    // Agora voltar para completed para testar novamente
    console.log('\n🔄 Voltando pedido para completed para manter estado de teste...');
    
    await fetch(`http://localhost:5170/api/admin/orders/${orderToRevert.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'completed',
        paymentStatus: 'paid'
      }),
    });
    
    console.log('✅ Pedido restaurado para estado completed');
    console.log('\n🎉 Teste de mensagens visuais concluído!');
    console.log('👀 Acesse http://localhost:5170/admin/crediario para ver as melhorias visuais');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testVisualMessages();