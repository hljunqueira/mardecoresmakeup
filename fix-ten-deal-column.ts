import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

async function addTenDealColumn() {
  console.log('🔄 Adicionando coluna ten_deal à tabela products...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não configurada');
    process.exit(1);
  }
  
  const client = postgres(process.env.DATABASE_URL);
  const db = drizzle(client);
  
  try {
    // Verificar se a coluna já existe
    console.log('🔍 Verificando se a coluna ten_deal já existe...');
    
    const columnExists = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      AND column_name = 'ten_deal'
    `;
    
    if (columnExists.length > 0) {
      console.log('✅ Coluna ten_deal já existe');
      return;
    }
    
    // Adicionar a coluna
    console.log('🔄 Adicionando coluna ten_deal...');
    await client`ALTER TABLE products ADD COLUMN ten_deal boolean DEFAULT false`;
    
    // Criar índice
    console.log('🔄 Criando índice...');
    await client`CREATE INDEX products_ten_deal_idx ON products(ten_deal)`;
    
    console.log('✅ Coluna ten_deal adicionada com sucesso!');
    
    // Verificar produtos existentes
    const products = await client`SELECT COUNT(*) as count FROM products`;
    console.log('📊 Produtos no banco:', products[0].count);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
  }
}

addTenDealColumn();