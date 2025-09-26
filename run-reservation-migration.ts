import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

// Usar a mesma configuração que a aplicação
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL não configurada');
}

const client = postgres(databaseUrl, {
  max: 3,
  idle_timeout: 20,
  connect_timeout: 30,
  ssl: 'require' as const,
  transform: { undefined: null },
});

async function runMigration() {
  try {
    console.log('📋 Executando migração para tabela de reservas...');
    
    const migrationPath = path.join(process.cwd(), 'migrations', 'create-reservations-table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await client.unsafe(migrationSQL);
    console.log('✅ Migração executada com sucesso!');
    
    // Verificar se a tabela foi criada
    const tables = await client`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'reservations'
    `;
    
    if (tables.length > 0) {
      console.log('✅ Tabela reservations criada com sucesso!');
    } else {
      console.log('⚠️ Tabela não encontrada, pode já existir ou houve erro silencioso');
    }
    
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️ Tabela reservations já existe, prosseguindo...');
    } else {
      console.error('❌ Erro na migração:', error);
      throw error;
    }
  } finally {
    await client.end();
  }
}

runMigration().catch(error => {
  console.error('💥 Erro crítico:', error);
  process.exit(1);
});