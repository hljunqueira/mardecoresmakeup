import 'dotenv/config';
import postgres from 'postgres';

async function debugProductsTable() {
  console.log('🔍 Diagnosticando tabela products...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não configurada');
    process.exit(1);
  }
  
  const client = postgres(process.env.DATABASE_URL);
  
  try {
    // 1. Verificar estrutura da tabela
    console.log('📋 Estrutura da tabela products:');
    const columns = await client`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'products'
      ORDER BY ordinal_position
    `;
    
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
    // 2. Contar produtos
    const count = await client`SELECT COUNT(*) as total FROM products`;
    console.log(`\n📊 Total de produtos: ${count[0].total}`);
    
    // 3. Verificar alguns produtos
    if (parseInt(count[0].total) > 0) {
      console.log('\n📝 Primeiros 3 produtos:');
      const products = await client`
        SELECT id, name, price, category, brand, active, ten_deal
        FROM products 
        ORDER BY created_at DESC
        LIMIT 3
      `;
      
      products.forEach(p => {
        console.log(`  - ${p.name} | R$ ${p.price} | ${p.category || 'Sem categoria'} | ${p.brand || 'Sem marca'} | Ativo: ${p.active} | Tudo por 10: ${p.ten_deal}`);
      });
    }
    
    // 4. Testar uma query simples
    console.log('\n🧪 Testando query getAllProducts...');
    const allProducts = await client`SELECT * FROM products ORDER BY created_at DESC LIMIT 1`;
    console.log('✅ Query funcionando, primeiro produto:', allProducts[0] ? allProducts[0].name : 'Nenhum produto');
    
  } catch (error) {
    console.error('❌ Erro ao diagnosticar:', error);
  } finally {
    await client.end();
  }
}

debugProductsTable();