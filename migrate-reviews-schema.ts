/**
 * Script para migrar o schema de avaliações usando Drizzle
 * Adiciona campos customer_name, customer_email e torna customer_id opcional
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './packages/shared/schema';

// Configuração do banco
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:ServidorMardecores2025@db.wudcabcsxmahlufgsyop.supabase.co:5432/postgres";

async function migrateReviewsSchema() {
  console.log('🔄 Iniciando migração do schema de avaliações...\n');

  const sql = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(sql, { schema });

  try {
    console.log('1. Adicionando colunas customer_name e customer_email...');
    
    // Adicionar as novas colunas
    await sql`
      ALTER TABLE product_reviews 
      ADD COLUMN IF NOT EXISTS customer_name text,
      ADD COLUMN IF NOT EXISTS customer_email text
    `;
    
    console.log('✅ Colunas adicionadas com sucesso');

    console.log('2. Tornando customer_id opcional...');
    
    // Tornar customer_id opcional (remover NOT NULL constraint)
    await sql`
      ALTER TABLE product_reviews 
      ALTER COLUMN customer_id DROP NOT NULL
    `;
    
    console.log('✅ customer_id agora é opcional');

    console.log('3. Migrando dados existentes...');
    
    // Migrar dados existentes (copiar nome e email dos clientes)
    const migratedRows = await sql`
      UPDATE product_reviews 
      SET customer_name = customers.name,
          customer_email = customers.email
      FROM customers 
      WHERE product_reviews.customer_id = customers.id
      AND product_reviews.customer_name IS NULL
    `;
    
    console.log(`✅ ${migratedRows.length} avaliações existentes migradas`);

    console.log('4. Adicionando comentários explicativos...');
    
    // Adicionar comentários (um por vez)
    await sql`COMMENT ON COLUMN product_reviews.customer_name IS 'Nome do avaliador (simplificado, sem necessidade de cadastro)'`;
    await sql`COMMENT ON COLUMN product_reviews.customer_email IS 'Email do avaliador (opcional)'`;
    await sql`COMMENT ON COLUMN product_reviews.customer_id IS 'ID do cliente (opcional, para compatibilidade com compras verificadas)'`;
    
    console.log('✅ Comentários adicionados');

    console.log('\n🎉 Migração concluída com sucesso!');
    console.log('📋 Alterações realizadas:');
    console.log('   ✓ Adicionadas colunas customer_name e customer_email');
    console.log('   ✓ customer_id agora é opcional');
    console.log('   ✓ Dados existentes migrados');
    console.log('   ✓ Sistema agora focado na avaliação do produto\n');

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Executar migração imediatamente
migrateReviewsSchema()
  .then(() => {
    console.log('🚀 Sistema de avaliações simplificado pronto para uso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha na migração:', error);
    process.exit(1);
  });

export { migrateReviewsSchema };