import pkg from 'pg';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

dotenv.config();
const { Client } = pkg;

// Função para hash da senha (mesma usada no sistema)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function createMardecoresAdmin() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔗 Conectado ao Supabase');
    
    // Credenciais informadas pelo usuário
    const newAdmin = {
      username: 'mardecoresmakeup@gmail.com',
      password: 'Mardecores@09212615'
    };

    console.log('\n🔍 Verificando se usuário já existe...');
    const existingUser = await client.query(
      'SELECT id, username FROM users WHERE username = $1',
      [newAdmin.username]
    );

    if (existingUser.rows.length > 0) {
      console.log('⚠️  Usuário já existe! Atualizando senha...');
      
      // Atualizar a senha
      const hashedPassword = hashPassword(newAdmin.password);
      await client.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE username = $2',
        [hashedPassword, newAdmin.username]
      );
      
      console.log('✅ Senha atualizada com sucesso!');
    } else {
      console.log('➕ Criando novo usuário admin...');
      
      // Criar novo usuário
      const hashedPassword = hashPassword(newAdmin.password);
      const result = await client.query(
        'INSERT INTO users (username, password, role, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, username, role',
        [newAdmin.username, hashedPassword, 'admin']
      );
      
      console.log('✅ Usuário admin criado com sucesso!');
      console.log(`   👤 ID: ${result.rows[0].id}`);
    }

    console.log('\n🧪 Testando login com as novas credenciais...');
    const hashedPassword = hashPassword(newAdmin.password);
    const loginTest = await client.query(
      'SELECT id, username, role FROM users WHERE username = $1 AND password = $2',
      [newAdmin.username, hashedPassword]
    );

    if (loginTest.rows.length > 0) {
      console.log('✅ Teste de login bem-sucedido!');
      console.log(`   👤 Usuário: ${loginTest.rows[0].username}`);
      console.log(`   👑 Role: ${loginTest.rows[0].role}`);
    } else {
      console.log('❌ Falha no teste de login!');
    }

    console.log('\n🎯 Credenciais para acessar o painel:');
    console.log(`   📧 Email: ${newAdmin.username}`);
    console.log(`   🔑 Senha: ${newAdmin.password}`);
    console.log(`   🔗 URL: http://localhost:5170/admin/login`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

createMardecoresAdmin();