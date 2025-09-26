import postgres from 'postgres';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

async function createProductRequestsTable() {
  console.log('🔄 Criando tabela product_requests diretamente no PostgreSQL...');
  
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL não encontrada');
    }
    
    console.log('🔗 Conectando ao banco:', databaseUrl.replace(/:([^:@]+)@/, ':***@'));
    
    const sql = postgres(databaseUrl, {
      max: 1,
      ssl: 'require',
      connect_timeout: 30
    });
    
    // Criar tabela product_requests
    console.log('📝 Criando tabela product_requests...');
    await sql`
      CREATE TABLE IF NOT EXISTS product_requests (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_name text NOT NULL,
        product_name text NOT NULL,
        phone text NOT NULL,
        status text DEFAULT 'pending',
        notes text,
        contacted_at timestamp,
        created_at timestamp DEFAULT now()
      );
    `;
    
    // Criar índices
    console.log('📝 Criando índices...');
    await sql`
      CREATE INDEX IF NOT EXISTS product_requests_status_idx ON product_requests (status);
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS product_requests_date_idx ON product_requests (created_at);
    `;
    
    // Verificar se a tabela foi criada
    console.log('🔍 Verificando se a tabela foi criada...');
    const result = await sql`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'product_requests' 
      ORDER BY ordinal_position;
    `;
    
    if (result.length > 0) {
      console.log('✅ Tabela product_requests criada com sucesso!');
      console.log('📊 Colunas da tabela:');
      result.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('⚠️ Tabela não foi encontrada após criação');
    }
    
    // Fechar conexão
    await sql.end();
    console.log('✅ Migração concluída!');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

// Executar
createProductRequestsTable()
  .then(() => {
    console.log('🎯 Processo finalizado com sucesso');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });