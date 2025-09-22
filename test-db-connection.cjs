const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function testDatabaseConnection() {
  console.log('🔍 Testando conectividade com PostgreSQL...\n');
  
  const databaseUrl = process.env.DATABASE_URL;
  console.log('📡 URL de conexão:', databaseUrl?.replace(/:([^:@]+)@/, ':***@'));
  
  // Teste com Client básico (sem pool)
  const client = new Client({
    connectionString: databaseUrl,
    // Configurações para resolver problemas de conectividade
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    connectionTimeoutMillis: 10000,
    query_timeout: 5000,
    statement_timeout: 5000,
    idle_in_transaction_session_timeout: 5000,
  });

  try {
    console.log('🔌 Tentando conectar...');
    await client.connect();
    console.log('✅ Conexão estabelecida com sucesso!');
    
    console.log('🏥 Testando query básica...');
    const result = await client.query('SELECT version() as version, now() as current_time');
    console.log('✅ Query executada com sucesso!');
    console.log('📊 Versão PostgreSQL:', result.rows[0].version.split(' ')[0]);
    console.log('⏰ Horário do servidor:', result.rows[0].current_time);
    
    console.log('\n🗂️ Testando tabela users...');
    const usersTest = await client.query('SELECT COUNT(*) as count FROM users');
    console.log('✅ Tabela users acessível!');
    console.log('👥 Total de usuários:', usersTest.rows[0].count);
    
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    console.error('🔍 Código do erro:', error.code);
    console.error('📍 Stack trace:', error.stack);
    
    // Sugestões de resolução
    console.log('\n💡 Possíveis soluções:');
    console.log('1. Verificar se o Supabase está ativo');
    console.log('2. Verificar senha do banco de dados');
    console.log('3. Verificar se há firewall bloqueando');
    console.log('4. Tentar usar pooler de conexão');
    
  } finally {
    await client.end();
    console.log('🔚 Conexão fechada');
  }
}

testDatabaseConnection();