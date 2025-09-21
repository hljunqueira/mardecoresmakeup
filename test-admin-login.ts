import pkg from 'pg';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

dotenv.config();
const { Client } = pkg;

// Função para hash da senha (mesma usada no cadastro)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function testAdminLogin() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔗 Conectado ao Supabase');
    
    // Credenciais para teste
    const credentials = {
      username: 'henriquelinharesjunqueira@gmail.com',
      password: '183834@Hlj'
    };

    console.log('\n🔐 Testando login administrativo...');
    console.log(`📧 Email: ${credentials.username}`);
    
    // Hash da senha para comparação
    const hashedPassword = hashPassword(credentials.password);
    
    // Tentar fazer login
    const loginResult = await client.query(
      'SELECT id, username, role, created_at, last_login_at FROM users WHERE username = $1 AND password = $2',
      [credentials.username, hashedPassword]
    );

    if (loginResult.rows.length === 0) {
      console.log('❌ Login falhou! Credenciais inválidas.');
      return;
    }

    const user = loginResult.rows[0];
    console.log('✅ Login bem-sucedido!');
    console.log(`   👤 Usuário: ${user.username}`);
    console.log(`   👑 Role: ${user.role}`);
    console.log(`   📅 Conta criada: ${new Date(user.created_at).toLocaleDateString('pt-BR')}`);
    
    // Atualizar último login
    await client.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );
    console.log('   🕐 Último login atualizado');

    console.log('\n🎯 Simulando autenticação do painel admin...');
    
    // Simular resposta do endpoint de login
    const authResponse = {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      message: 'Login realizado com sucesso!'
    };

    console.log('📤 Resposta da API:');
    console.log(JSON.stringify(authResponse, null, 2));

    console.log('\n✅ Teste de autenticação concluído!');
    console.log('\n🚀 Pronto para usar o painel administrativo:');
    console.log('   📍 URL: http://localhost:5170/admin/login');
    console.log(`   📧 Email: ${credentials.username}`);
    console.log(`   🔑 Senha: ${credentials.password}`);
    
  } catch (error) {
    console.error('❌ Erro no teste de login:', error.message);
  } finally {
    await client.end();
  }
}

testAdminLogin();