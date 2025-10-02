/**
 * 🐞 Script de Debug para Busca de Imagens
 * 
 * Execute este script no console do navegador para testar:
 * 1. Se a API de busca de imagens está funcionando
 * 2. Se o ProductWizard está funcionando corretamente
 * 3. Se há problemas de integração
 */

console.log('🔍 Iniciando debug da busca de imagens...');

// 1. Testar API diretamente
async function testImageSearchAPI() {
  console.log('\n📡 1. Testando API de busca de imagens...');
  
  try {
    const testQuery = 'batom';
    const response = await fetch(`/api/images/search?q=${testQuery}&count=5`);
    const data = await response.json();
    
    console.log('Resposta da API:', {
      status: response.status,
      ok: response.ok,
      data: data
    });
    
    if (data.success && data.images && data.images.length > 0) {
      console.log('✅ API funcionando! Imagens encontradas:', data.images.length);
      console.log('📸 Primeira imagem:', data.images[0]);
    } else {
      console.log('⚠️ API não retornou imagens');
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Erro na API:', error);
    return null;
  }
}

// 2. Verificar se há elementos na página
function checkPageElements() {
  console.log('\n🔍 2. Verificando elementos da página...');
  
  // Verificar se há formulário de produto
  const forms = document.querySelectorAll('form');
  console.log('📝 Formulários encontrados:', forms.length);
  
  // Verificar botões de busca de imagem
  const searchButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
    btn.textContent?.includes('Buscar Imagens')
  );
  console.log('🔍 Botões de busca encontrados:', searchButtons.length);
  
  // Verificar se há modal aberto
  const modals = document.querySelectorAll('[role="dialog"]');
  console.log('📱 Modais abertos:', modals.length);
  
  return {
    forms: forms.length,
    searchButtons: searchButtons.length,
    modals: modals.length
  };
}

// 3. Simular processo completo
async function simulateFullProcess() {
  console.log('\n🎭 3. Simulando processo completo...');
  
  // Verificar se há botão de adicionar produto
  const addButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
    btn.textContent?.includes('Adicionar Produto')
  );
  
  if (addButtons.length > 0) {
    console.log('✅ Botão "Adicionar Produto" encontrado');
    console.log('💡 Para testar manualmente:');
    console.log('   1. Clique em "Adicionar Produto"');
    console.log('   2. Preencha pelo menos nome, categoria e marca');
    console.log('   3. Clique em "Buscar Imagens Online"');
    console.log('   4. Observe os logs no console');
    console.log('   5. Selecione uma imagem');
    console.log('   6. Verifique se o formulário não é submetido automaticamente');
  } else {
    console.log('❌ Botão "Adicionar Produto" não encontrado');
  }
}

// 4. Interceptar submits de formulário para debug
function interceptFormSubmits() {
  console.log('\n🔧 4. Interceptando submits de formulário...');
  
  const forms = document.querySelectorAll('form');
  forms.forEach((form, index) => {
    form.addEventListener('submit', (e) => {
      console.log(`🚨 SUBMIT detectado no formulário ${index + 1}:`, {
        formId: form.id,
        formClass: form.className,
        submitter: e.submitter?.textContent || 'desconhecido',
        timestamp: new Date().toISOString()
      });
    });
  });
  
  console.log(`✅ Interceptação ativa em ${forms.length} formulários`);
}

// Executar todos os testes
async function runAllTests() {
  console.log('🚀 Executando todos os testes...\n');
  
  await testImageSearchAPI();
  checkPageElements();
  await simulateFullProcess();
  interceptFormSubmits();
  
  console.log('\n✅ Debug concluído! Observe os logs durante o uso normal.');
}

// Executar automaticamente
runAllTests();

// Disponibilizar funções globalmente para uso manual
window.debugImageSearch = {
  testAPI: testImageSearchAPI,
  checkElements: checkPageElements,
  simulate: simulateFullProcess,
  interceptSubmits: interceptFormSubmits,
  runAll: runAllTests
};

console.log('\n💡 Funções disponíveis:');
console.log('   window.debugImageSearch.testAPI()');
console.log('   window.debugImageSearch.checkElements()');
console.log('   window.debugImageSearch.simulate()');
console.log('   window.debugImageSearch.runAll()');