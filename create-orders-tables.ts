// ========================================
// 🛒 MIGRAÇÃO: SISTEMA DE PEDIDOS
// ========================================
// Data: 2025-09-29
// Objetivo: Criar tabelas para o novo sistema de pedidos
// Compatibilidade: 100% - Não afeta tabelas existentes

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL não encontrada no arquivo .env');
  process.exit(1);
}

console.log('🚀 Iniciando migração do Sistema de Pedidos...');
console.log('📅 Data:', new Date().toISOString());

// Configurar conexão
const sql = postgres(databaseUrl, { max: 1 });
const db = drizzle(sql);

async function createOrdersTables() {
  try {
    console.log('🔍 Verificando se as tabelas já existem...');

    // Verificar se a tabela orders já existe
    const ordersExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'orders'
      );
    `;

    if (ordersExists[0].exists) {
      console.log('⚠️ Tabela "orders" já existe. Pulando criação...');
    } else {
      console.log('📋 Criando tabela "orders"...');
      
      await sql`
        CREATE TABLE orders (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          order_number TEXT UNIQUE NOT NULL,
          customer_id VARCHAR REFERENCES customers(id),
          customer_name TEXT,
          customer_phone TEXT,
          customer_email TEXT,
          total_amount DECIMAL(12,2) NOT NULL,
          discount_amount DECIMAL(10,2) DEFAULT 0,
          final_amount DECIMAL(12,2) NOT NULL,
          status TEXT DEFAULT 'pending',
          payment_type TEXT NOT NULL,
          payment_status TEXT DEFAULT 'pending',
          credit_account_id VARCHAR REFERENCES credit_accounts(id),
          notes TEXT,
          due_date TIMESTAMP,
          paid_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `;

      console.log('📋 Criando índices para tabela "orders"...');
      await sql`CREATE INDEX orders_number_idx ON orders(order_number);`;
      await sql`CREATE INDEX orders_customer_idx ON orders(customer_id);`;
      await sql`CREATE INDEX orders_status_idx ON orders(status);`;
      await sql`CREATE INDEX orders_payment_type_idx ON orders(payment_type);`;
      await sql`CREATE INDEX orders_payment_status_idx ON orders(payment_status);`;
      await sql`CREATE INDEX orders_due_date_idx ON orders(due_date);`;
      await sql`CREATE INDEX orders_created_at_idx ON orders(created_at);`;

      console.log('✅ Tabela "orders" criada com sucesso!');
    }

    // Verificar se a tabela order_items já existe
    const orderItemsExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'order_items'
      );
    `;

    if (orderItemsExists[0].exists) {
      console.log('⚠️ Tabela "order_items" já existe. Pulando criação...');
    } else {
      console.log('📦 Criando tabela "order_items"...');
      
      await sql`
        CREATE TABLE order_items (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id VARCHAR REFERENCES orders(id) NOT NULL,
          product_id VARCHAR REFERENCES products(id) NOT NULL,
          product_name TEXT NOT NULL,
          product_price DECIMAL(10,2) NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price DECIMAL(10,2) NOT NULL,
          total_price DECIMAL(10,2) NOT NULL,
          discount_amount DECIMAL(10,2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `;

      console.log('📦 Criando índices para tabela "order_items"...');
      await sql`CREATE INDEX order_items_order_idx ON order_items(order_id);`;
      await sql`CREATE INDEX order_items_product_idx ON order_items(product_id);`;

      console.log('✅ Tabela "order_items" criada com sucesso!');
    }

    console.log('🎉 Migração do Sistema de Pedidos concluída com sucesso!');
    console.log('');
    console.log('📊 Resumo:');
    console.log('✅ Tabela "orders" - Pedidos principais');
    console.log('✅ Tabela "order_items" - Produtos dos pedidos');
    console.log('✅ Índices criados para otimização');
    console.log('✅ Compatibilidade total mantida');
    console.log('');
    console.log('🔗 Próximos passos:');
    console.log('1. Implementar APIs de pedidos');
    console.log('2. Criar interface de gestão');
    console.log('3. Integrar com sistema de crediário');

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

// Executar migração
async function main() {
  try {
    await createOrdersTables();
  } catch (error) {
    console.error('❌ Falha na migração:', error);
    process.exit(1);
  } finally {
    await sql.end();
    console.log('🔌 Conexão com banco encerrada.');
  }
}

// Executar se chamado diretamente
main();

export { createOrdersTables };