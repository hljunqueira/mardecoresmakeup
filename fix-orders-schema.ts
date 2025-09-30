// Script para corrigir schema da tabela orders para suportar pedidos à vista
import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixOrdersSchema() {
  console.log('🔧 Corrigindo schema da tabela orders...');

  try {
    // 1. Tornar customer_id nullable para permitir vendas à vista
    await sql`
      ALTER TABLE orders 
      ALTER COLUMN customer_id DROP NOT NULL;
    `;
    console.log('✅ Campo customer_id agora é nullable');

    // 2. Adicionar campos para dados de cliente em vendas à vista
    await sql`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS customer_name TEXT,
      ADD COLUMN IF NOT EXISTS customer_phone TEXT,
      ADD COLUMN IF NOT EXISTS customer_email TEXT;
    `;
    console.log('✅ Campos customer_name, customer_phone, customer_email adicionados');

    console.log('🎉 Schema da tabela orders corrigido com sucesso!');
    console.log('');
    console.log('Agora a tabela suporta:');
    console.log('- Pedidos crediário: customer_id preenchido');
    console.log('- Pedidos à vista: customer_name/customer_phone preenchidos');
    
  } catch (error) {
    console.error('❌ Erro ao corrigir schema:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  fixOrdersSchema()
    .then(() => {
      console.log('✅ Migração concluída');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Falha na migração:', error);
      process.exit(1);
    });
}