import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './packages/shared/schema';

async function setupSupabaseDatabase() {
  console.log('🚀 Configurando banco de dados Supabase...\n');
  
  // Verificar se as variáveis estão configuradas
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não configurada no arquivo .env');
    console.log('📝 Configure a DATABASE_URL do seu projeto Supabase');
    process.exit(1);
  }
  
  try {
    // Conectar ao banco
    const client = postgres(process.env.DATABASE_URL);
    const db = drizzle(client, { schema });
    
    console.log('✅ Conectado ao PostgreSQL do Supabase');
    
    // Verificar se as tabelas já existem
    console.log('🔍 Verificando tabelas existentes...');
    
    const tablesQuery = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name IN ('users', 'products', 'collections', 'coupons', 'financial_transactions', 'suppliers')
    `;
    
    const existingTables = tablesQuery.map(row => row.table_name);
    
    if (existingTables.length > 0) {
      console.log('ℹ️  Tabelas já existentes:', existingTables.join(', '));
      console.log('💡 Use "npm run db:push" para aplicar mudanças no schema');
    } else {
      console.log('📋 Nenhuma tabela encontrada. Execute "npm run db:push" para criar as tabelas');
    }
    
    // Fechar conexão
    await client.end();
    
    console.log('\n🎉 Configuração concluída com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. npm run db:push     # Criar/atualizar tabelas');
    console.log('2. npm run db:seed     # Inserir usuário admin inicial');
    console.log('3. npm run dev:supabase # Iniciar com Supabase');
    
  } catch (error) {
    console.error('❌ Erro ao configurar banco:', error);
    console.log('\n💡 Verifique se:');
    console.log('- A DATABASE_URL está correta');
    console.log('- O projeto Supabase está ativo');
    console.log('- Você tem permissões para acessar o banco');
    process.exit(1);
  }
}

// Executar setup
setupSupabaseDatabase();