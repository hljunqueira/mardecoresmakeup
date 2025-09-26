async function testDeleteAPI() {
  try {
    // 1. Primeiro, buscar todas as reservas
    console.log('📋 Buscando todas as reservas...');
    const reservationsResponse = await fetch('http://localhost:5170/api/admin/reservations');
    const reservations = await reservationsResponse.json();
    console.log('🔍 Reservas encontradas:', reservations);
    
    if (reservations.length === 0) {
      console.log('❌ Nenhuma reserva encontrada para testar');
      return;
    }
    
    // 2. Tentar deletar a primeira reserva
    const reservationToDelete = reservations[0];
    console.log(`🗑️ Tentando deletar reserva: ${reservationToDelete.id}`);
    
    const deleteResponse = await fetch(`http://localhost:5170/api/admin/reservations/${reservationToDelete.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Status da resposta:', deleteResponse.status);
    const result = await deleteResponse.text();
    console.log('📄 Resposta:', result);
    
    // 3. Verificar se foi deletada
    console.log('🔍 Verificando se a reserva foi deletada...');
    const afterDeleteResponse = await fetch('http://localhost:5170/api/admin/reservations');
    const afterDeleteReservations = await afterDeleteResponse.json();
    console.log('📋 Reservas após a deleção:', afterDeleteReservations);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testDeleteAPI();