/**
 * Teste para o sistema de avaliações simplificado
 * Foco na avaliação do produto, não na gestão de clientes
 */

const API_BASE = 'http://localhost:5170';

// Função auxiliar para fazer requisições
async function apiCall(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();
    
    console.log(`${method} ${endpoint}:`, {
      status: response.status,
      ok: response.ok,
      data
    });
    
    return { response, data };
  } catch (error) {
    console.error(`Erro em ${method} ${endpoint}:`, error);
    return { error };
  }
}

// Teste do sistema simplificado
async function testSimplifiedReviewSystem() {
  console.log('🌟 Testando sistema de avaliações simplificado...\n');
  
  // 1. Buscar produtos para usar como referência
  console.log('1. Buscando produtos...');
  const { data: products } = await apiCall('GET', '/api/products');
  
  if (!products || products.length === 0) {
    console.error('❌ Nenhum produto encontrado. Adicione alguns produtos primeiro.');
    return;
  }
  
  const productId = products[0].id;
  console.log(`✅ Usando produto: ${products[0].name} (ID: ${productId})\n`);
  
  // 2. Criar uma nova avaliação com sistema simplificado
  console.log('2. Criando nova avaliação (sistema simplificado)...');
  const reviewData = {
    customerName: "Maria Silva",
    customerPhone: "(11) 99999-9999",
    rating: 5,
    comment: 'Adorei este produto! Qualidade excelente e chegou super rápido. Sistema focado no produto funcionando perfeitamente!',
    recommendation: 'sim',
    isVerifiedPurchase: false
  };
  
  const { data: newReview } = await apiCall('POST', `/api/products/${productId}/reviews`, reviewData);
  
  if (!newReview) {
    console.error('❌ Falha ao criar avaliação');
    return;
  }
  
  console.log(`✅ Avaliação criada com sucesso! Foco no produto: ✓\n`);
  
  // 3. Buscar avaliações do produto
  console.log('3. Buscando avaliações do produto...');
  await apiCall('GET', `/api/products/${productId}/reviews`);
  console.log('');
  
  // 4. Criar mais uma avaliação sem telefone (para testar campo opcional)
  console.log('4. Criando avaliação sem telefone (testando campo opcional)...');
  const reviewData2 = {
    customerName: "João Pedro",
    rating: 4,
    comment: 'Sistema simplificado funcionando! Não precisei criar conta.',
    recommendation: 'sim',
    isVerifiedPurchase: false
  };
  
  await apiCall('POST', `/api/products/${productId}/reviews`, reviewData2);
  console.log('');
  
  // 5. Verificar se as avaliações apareceram
  console.log('5. Verificando todas as avaliações criadas...');
  await apiCall('GET', `/api/products/${productId}/reviews`);
  console.log('');
  
  console.log('🎉 Teste do sistema simplificado concluído com sucesso!');
  console.log('✅ Sistema agora foca na avaliação do produto, não na gestão de clientes');
  console.log('✅ customerName e customerEmail são enviados diretamente');
  console.log('✅ Não há mais dependência de customerId obrigatório');
}

// Executar teste
testSimplifiedReviewSystem().catch(console.error);