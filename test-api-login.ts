import fetch from 'node-fetch';

async function testLogin() {
  try {
    console.log('🧪 Testando login via API...');
    
    const response = await fetch('http://localhost:5170/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'mardecoresmakeup@gmail.com',
        password: 'Mardecores@09212615'
      })
    });

    const result = await response.json();
    
    console.log('📊 Status:', response.status);
    console.log('📤 Resposta:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Login funcionou perfeitamente!');
    } else {
      console.log('❌ Erro no login:', (result as any).message);
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

testLogin();