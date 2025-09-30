/**
 * Script de teste para as APIs de avaliações
 * Execute este script no console do navegador ou Node.js
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

// Função para testar o sistema de avaliações completo
async function testReviewsSystem() {
  console.log('🌟 Iniciando testes do sistema de avaliações...\n');
  
  // 1. Buscar produtos para usar como referência
  console.log('1. Buscando produtos...');
  const { data: products } = await apiCall('GET', '/api/products');
  
  if (!products || products.length === 0) {
    console.error('❌ Nenhum produto encontrado. Adicione alguns produtos primeiro.');
    return;
  }
  
  const productId = products[0].id;
  console.log(`✅ Usando produto: ${products[0].name} (ID: ${productId})\n`);
  
  // 2. Buscar clientes para usar como referência
  console.log('2. Buscando clientes...');
  const { data: customers } = await apiCall('GET', '/api/admin/customers');
  
  if (!customers || customers.length === 0) {
    console.error('❌ Nenhum cliente encontrado. Adicione alguns clientes primeiro.');
    return;
  }
  
  const customerId = customers[0].id;
  console.log(`✅ Usando cliente: ${customers[0].name} (ID: ${customerId})\n`);
  
  // 3. Criar uma nova avaliação
  console.log('3. Criando nova avaliação...');
  const reviewData = {
    customerId: customerId,
    rating: 5,
    title: 'Produto incrível!',
    comment: 'Adorei este produto! Qualidade excelente e chegou super rápido.',
    isVerifiedPurchase: true
  };
  
  const { data: newReview } = await apiCall('POST', `/api/products/${productId}/reviews`, reviewData);
  
  if (!newReview) {
    console.error('❌ Falha ao criar avaliação');
    return;
  }
  
  const reviewId = newReview.id;
  console.log(`✅ Avaliação criada com ID: ${reviewId}\n`);
  
  // 4. Buscar avaliações do produto
  console.log('4. Buscando avaliações do produto...');
  await apiCall('GET', `/api/products/${productId}/reviews`);
  console.log('');
  
  // 5. Buscar todas as avaliações (admin)
  console.log('5. Buscando todas as avaliações (admin)...');
  await apiCall('GET', '/api/admin/reviews');
  console.log('');
  
  // 6. Buscar avaliação específica
  console.log('6. Buscando avaliação específica...');
  await apiCall('GET', `/api/admin/reviews/${reviewId}`);
  console.log('');
  
  // 7. Atualizar avaliação
  console.log('7. Atualizando avaliação...');
  const updateData = {
    rating: 4,
    title: 'Produto muito bom (atualizado)',
    comment: 'Produto excelente, mas o preço poderia ser melhor. Recomendo!'
  };
  await apiCall('PUT', `/api/admin/reviews/${reviewId}`, updateData);
  console.log('');
  
  // 8. Reprovar avaliação
  console.log('8. Reprovando avaliação...');
  await apiCall('PATCH', `/api/admin/reviews/${reviewId}/approve`, { isApproved: false });
  console.log('');
  
  // 9. Aprovar avaliação novamente
  console.log('9. Aprovando avaliação novamente...');
  await apiCall('PATCH', `/api/admin/reviews/${reviewId}/approve`, { isApproved: true });
  console.log('');
  
  // 10. Verificar se o produto foi atualizado com rating
  console.log('10. Verificando produto atualizado...');
  await apiCall('GET', `/api/products/${productId}`);
  console.log('');
  
  // 11. Deletar avaliação
  console.log('11. Deletando avaliação...');
  await apiCall('DELETE', `/api/admin/reviews/${reviewId}`);
  console.log('');
  
  // 12. Verificar se foi deletada
  console.log('12. Verificando se avaliação foi deletada...');
  await apiCall('GET', `/api/admin/reviews/${reviewId}`);
  console.log('');
  
  console.log('🎉 Testes do sistema de avaliações concluídos!');
}

// Função para criar dados de exemplo
async function createSampleReviews() {
  console.log('📝 Criando dados de exemplo...\n');
  
  // Buscar produtos e clientes
  const { data: products } = await apiCall('GET', '/api/products');
  const { data: customers } = await apiCall('GET', '/api/admin/customers');
  
  if (!products || !customers || products.length === 0 || customers.length === 0) {
    console.error('❌ Necessário ter produtos e clientes cadastrados');
    return;
  }
  
  // Criar várias avaliações de exemplo
  const sampleReviews = [
    {
      rating: 5,
      title: 'Excelente qualidade!',
      comment: 'Produto maravilhoso, superou minhas expectativas. Recomendo muito!',
      isVerifiedPurchase: true
    },
    {
      rating: 4,
      title: 'Muito bom',
      comment: 'Boa qualidade e entrega rápida. Voltarei a comprar.',
      isVerifiedPurchase: true
    },
    {
      rating: 5,
      title: 'Perfeito!',
      comment: 'Exatamente como nas fotos. Amei as cores!',
      isVerifiedPurchase: false
    },
    {
      rating: 3,
      title: 'Regular',
      comment: 'Produto ok, mas esperava um pouco mais.',
      isVerifiedPurchase: true
    },
    {
      rating: 5,
      title: 'Recomendo!',
      comment: 'Qualidade excepcional e preço justo. Parabéns!',
      isVerifiedPurchase: true
    }
  ];
  
  for (let i = 0; i < Math.min(sampleReviews.length, products.length, customers.length); i++) {
    const productId = products[i % products.length].id;
    const customerId = customers[i % customers.length].id;
    
    const reviewData = {
      ...sampleReviews[i],
      customerId
    };
    
    console.log(`Criando avaliação ${i + 1} para produto ${products[i % products.length].name}...`);
    await apiCall('POST', `/api/products/${productId}/reviews`, reviewData);
  }
  
  console.log('✅ Dados de exemplo criados com sucesso!');
}

// Exportar funções para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testReviewsSystem,
    createSampleReviews,
    apiCall
  };
}

// Auto-executar se estiver no browser
if (typeof window !== 'undefined') {
  console.log('🌟 Scripts de teste de avaliações carregados!');
  console.log('Execute: testReviewsSystem() para testar o sistema completo');
  console.log('Execute: createSampleReviews() para criar dados de exemplo');
}