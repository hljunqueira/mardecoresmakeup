import postgres from 'postgres';

// Usar a mesma configuração da aplicação
const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:ServidorMardecores2025@db.wudcabcsxmahlufgsyop.supabase.co:5432/postgres";

const client = postgres(databaseUrl, {
  max: 3,
  idle_timeout: 20,
  connect_timeout: 30,
  ssl: 'require' as const,
  transform: { undefined: null },
});

async function checkReservationsTable() {
  try {
    console.log('🔍 Verificando tabela reservations...');
    
    // 1. Verificar se a tabela existe
    const tableExists = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'reservations'
      );
    `;
    
    console.log('📋 Tabela existe:', tableExists[0].exists);
    
    if (tableExists[0].exists) {
      // 2. Verificar estrutura da tabela
      console.log('\n📊 Estrutura da tabela:');
      const columns = await client`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'reservations'
        ORDER BY ordinal_position;
      `;
      
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });
      
      // 3. Verificar índices
      console.log('\n🔗 Índices:');
      const indexes = await client`
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'reservations';
      `;
      
      indexes.forEach(idx => {
        console.log(`  - ${idx.indexname}: ${idx.indexdef}`);
      });
      
      // 4. Contar registros existentes
      const count = await client`SELECT COUNT(*) FROM reservations`;
      console.log(`\n📈 Total de registros: ${count[0].count}`);
      
      // 5. Testar inserção de dados de teste
      console.log('\n🧪 Testando inserção...');
      const testInsert = await client`
        INSERT INTO reservations (product_id, customer_name, quantity, unit_price, payment_date, status)
        VALUES ('test-product-id', 'Cliente Teste', 1, 25.50, NOW() + INTERVAL '1 day', 'active')
        RETURNING id;
      `;
      console.log('✅ Inserção bem-sucedida, ID:', testInsert[0].id);
      
      // 6. Remover dados de teste
      await client`DELETE FROM reservations WHERE id = ${testInsert[0].id}`;
      console.log('🗑️ Dados de teste removidos');
      
    } else {
      console.log('❌ Tabela não existe. Criando agora...');
      
      // Criar a tabela
      await client`
        CREATE TABLE reservations (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id varchar NOT NULL,
          customer_name text NOT NULL,
          quantity integer NOT NULL,
          unit_price decimal(10,2) NOT NULL,
          payment_date timestamp NOT NULL,
          status text DEFAULT 'active',
          notes text,
          created_at timestamp DEFAULT now(),
          completed_at timestamp
        );
      `;
      
      // Criar índices
      await client`CREATE INDEX reservations_product_idx ON reservations(product_id);`;
      await client`CREATE INDEX reservations_status_idx ON reservations(status);`;
      await client`CREATE INDEX reservations_payment_date_idx ON reservations(payment_date);`;
      
      console.log('✅ Tabela reservations criada com sucesso!');
    }
    
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️ Tabela reservations já existe, prosseguindo...');
    } else {
      console.error('❌ Erro ao verificar tabela:', error);
      throw error;
    }
  } finally {
    await client.end();
  }
}

checkReservationsTable().catch(error => {
  console.error('💥 Erro crítico:', error);
  process.exit(1);
});