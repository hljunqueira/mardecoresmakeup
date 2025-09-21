import pkg from 'pg';
const { Client } = pkg;
import * as dotenv from 'dotenv';

dotenv.config();

console.log('DATABASE_URL:', process.env.DATABASE_URL);

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔗 Tentando conectar ao banco...');
    await client.connect();
    console.log('✅ Conectado com sucesso!');
    
    const result = await client.query('SELECT NOW()');
    console.log('📅 Tempo do servidor:', result.rows[0].now);
    
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
  } finally {
    await client.end();
  }
}

testConnection();