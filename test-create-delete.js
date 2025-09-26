async function createTestReservation() {
  try {
    // 1. Buscar um produto para criar a reserva
    console.log('📋 Buscando produtos...');
    const productsResponse = await fetch('http://localhost:5170/api/admin/products');
    const products = await productsResponse.json();
    
    if (products.length === 0) {
      console.log('❌ Nenhum produto encontrado');
      return;
    }
    
    const product = products[0];
    console.log('🎯 Produto selecionado:', product.name, '(ID:', product.id, ')');
    
    // 2. Criar uma nova reserva
    const reservationData = {
      productId: product.id,
      customerName: 'Cliente Teste DELETE',
      quantity: 1,
      unitPrice: '25.00',
      paymentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias no futuro
      status: 'active'
    };
    
    console.log('🆕 Criando reserva:', reservationData);
    
    const createResponse = await fetch('http://localhost:5170/api/admin/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reservationData)
    });
    
    if (createResponse.ok) {
      const newReservation = await createResponse.json();
      console.log('✅ Reserva criada com sucesso:', newReservation.id);
      return newReservation.id;
    } else {
      const error = await createResponse.text();
      console.log('❌ Erro ao criar reserva:', error);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

async function testDeleteReservation() {
  const reservationId = await createTestReservation();
  
  if (!reservationId) {
    console.log('❌ Não foi possível criar reserva para teste');
    return;
  }
  
  // Aguardar um pouco
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Tentar deletar
  console.log(`🗑️ Tentando deletar reserva: ${reservationId}`);
  
  try {
    const deleteResponse = await fetch(`http://localhost:5170/api/admin/reservations/${reservationId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Status da resposta DELETE:', deleteResponse.status);
    const result = await deleteResponse.text();
    console.log('📄 Resposta DELETE:', result);
    
    // Verificar se foi deletada
    const checkResponse = await fetch('http://localhost:5170/api/admin/reservations');
    const allReservations = await checkResponse.json();
    const foundReservation = allReservations.find(r => r.id === reservationId);
    
    if (foundReservation) {
      console.log('❌ Reserva ainda existe após tentativa de deleção');
    } else {
      console.log('✅ Reserva foi deletada com sucesso!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao deletar:', error);
  }
}

testDeleteReservation();