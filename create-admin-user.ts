import pkg from 'pg';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

dotenv.config();
const { Client } = pkg;

// Função para hash da senha (simples para desenvolvimento)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function createAdminUser() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔗 Conectado ao Supabase');
    
    // Dados do usuário admin
    const adminData = {
      username: 'henriquelinharesjunqueira@gmail.com',
      password: '183834@Hlj',
      role: 'admin'
    };

    console.log('\n👤 Cadastrando usuário administrativo...');
    
    // Verificar se já existe
    const existingUser = await client.query(
      'SELECT id, username FROM users WHERE username = $1',
      [adminData.username]
    );

    if (existingUser.rows.length > 0) {
      console.log('⚠️ Usuário já existe! Atualizando senha...');
      
      // Atualizar senha
      const hashedPassword = hashPassword(adminData.password);
      await client.query(
        'UPDATE users SET password = $1, last_login_at = NULL WHERE username = $2',
        [hashedPassword, adminData.username]
      );
      
      console.log('✅ Senha do usuário admin atualizada!');
    } else {
      console.log('➕ Criando novo usuário admin...');
      
      // Criar novo usuário
      const hashedPassword = hashPassword(adminData.password);
      const result = await client.query(
        'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at',
        [adminData.username, hashedPassword, adminData.role]
      );
      
      const newUser = result.rows[0];
      console.log('✅ Usuário admin criado com sucesso!');
      console.log(`   📧 Email: ${newUser.username}`);
      console.log(`   👑 Role: ${newUser.role}`);
      console.log(`   📅 Criado: ${new Date(newUser.created_at).toLocaleDateString('pt-BR')}`);
    }

    // Listar todos os usuários admin
    console.log('\n👥 Usuários administrativos:');
    const allUsers = await client.query(
      'SELECT id, username, role, created_at, last_login_at FROM users ORDER BY created_at DESC'
    );
    
    allUsers.rows.forEach(user => {
      const lastLogin = user.last_login_at 
        ? new Date(user.last_login_at).toLocaleDateString('pt-BR')
        : 'Nunca';
      console.log(`   • ${user.username} (${user.role}) - Último login: ${lastLogin}`);
    });

    console.log('\n🔐 Credenciais configuradas:');
    console.log(`   📧 Email: ${adminData.username}`);
    console.log(`   🔑 Senha: ${adminData.password}`);
    console.log('\n🚀 Pronto para fazer login no painel admin!');
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error.message);
  } finally {
    await client.end();
  }
}

createAdminUser();