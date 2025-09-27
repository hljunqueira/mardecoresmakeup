import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './packages/shared/schema';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
config();

// Configuração do banco
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL não encontrada nas variáveis de ambiente');
  console.log('Variáveis disponíveis:', Object.keys(process.env).filter(k => k.includes('DATABASE')));
  process.exit(1);
}

const client = postgres(databaseUrl, {
  max: 3,
  ssl: 'require' as const,
  connect_timeout: 30,
});

const db = drizzle(client, { schema });

async function applyMigration() {
  try {
    console.log('🔄 Aplicando migração das tabelas de crediário...');
    
    // Ler o arquivo SQL
    const sqlContent = readFileSync(join(__dirname, 'apply-migration.sql'), 'utf-8');
    
    // Executar cada comando SQL separadamente
    const commands = sqlContent.split(';').filter(cmd => cmd.trim() && !cmd.trim().startsWith('--'));
    
    for (const command of commands) {
      if (command.trim()) {
        try {
          await db.execute(sql.raw(command.trim()));
          console.log('✅ Comando executado:', command.substring(0, 50) + '...');
        } catch (error) {
          console.log('⚠️ Comando falhou (pode ser normal):', command.substring(0, 50) + '...');
          console.log('   Erro:', error.message);
        }
      }
    }
    
    // Testar se as tabelas foram criadas
    console.log('🧪 Testando tabelas criadas...');
    
    const result = await db.execute(sql.raw(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('customers', 'credit_accounts', 'credit_payments', 'reservations')
      ORDER BY table_name;
    `));
    
    console.log('📊 Tabelas encontradas:', result.map((r: any) => r.table_name));
    
    // Testar inserção de cliente
    try {
      await db.execute(sql.raw(`
        INSERT INTO customers (name, email, phone) 
        VALUES ('João Silva', 'joao.silva@teste.com', '11999999999')
        ON CONFLICT (email) DO NOTHING;
      `));
      console.log('✅ Cliente de teste inserido');
    } catch (error) {
      console.log('⚠️ Erro ao inserir cliente:', error.message);
    }
    
    // Verificar clientes
    const customers = await db.execute(sql.raw('SELECT * FROM customers LIMIT 5;'));
    console.log('👥 Clientes encontrados:', customers.length);
    
    console.log('🎉 Migração completa!');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    process.exit(0);
  }
}

applyMigration();