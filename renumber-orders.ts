/**
 * 🔢 SCRIPT DE RENUMERAÇÃO DE PEDIDOS
 * 
 * Este script renumera todos os pedidos existentes para usar
 * a sequência PED001, PED002, PED003, etc.
 * 
 * IMPORTANTE: Execute apenas uma vez!
 */

import postgres from 'postgres';

// Configuração da conexão
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:ServidorMardecores2025@db.wudcabcsxmahlufgsyop.supabase.co:5432/postgres";

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não configurada');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 3,
  connect_timeout: 30
});

async function renumberOrders() {
  try {
    console.log('🔢 Iniciando renumeração de pedidos...');
    
    // 1. Buscar todos os pedidos ordenados por data de criação
    console.log('📋 Buscando todos os pedidos...');
    const orders = await sql`
      SELECT id, order_number, created_at, customer_name
      FROM orders 
      ORDER BY created_at ASC
    `;
    
    console.log(`✅ Encontrados ${orders.length} pedidos para renumerar`);
    
    if (orders.length === 0) {
      console.log('ℹ️ Nenhum pedido encontrado');
      return;
    }
    
    // 2. Primeiro, limpar os números atuais (evitar conflitos de unique constraint)
    console.log('🔄 Limpando números atuais...');
    await sql`UPDATE orders SET order_number = CONCAT('TEMP_', id)`;
    
    // 3. Renumerar sequencialmente
    console.log('🔢 Aplicando nova numeração...');
    
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const newOrderNumber = `PED${(i + 1).toString().padStart(3, '0')}`;
      
      await sql`
        UPDATE orders 
        SET order_number = ${newOrderNumber}
        WHERE id = ${order.id}
      `;
      
      console.log(`✅ ${order.order_number} → ${newOrderNumber} (Cliente: ${order.customer_name || 'N/A'})`);
    }
    
    // 4. Verificar resultado
    console.log('\n🔍 Verificando resultado...');
    const updatedOrders = await sql`
      SELECT order_number, customer_name, created_at
      FROM orders 
      ORDER BY created_at ASC
    `;
    
    console.log('\n📊 RESULTADO FINAL:');
    updatedOrders.forEach((order, index) => {
      console.log(`${index + 1}. ${order.order_number} - ${order.customer_name || 'N/A'} - ${new Date(order.created_at).toLocaleString('pt-BR')}`);
    });
    
    console.log(`\n🎉 Renumeração concluída com sucesso!`);
    console.log(`📈 Total de pedidos renumerados: ${orders.length}`);
    console.log(`🔢 Numeração final: PED001 a PED${orders.length.toString().padStart(3, '0')}`);
    
  } catch (error) {
    console.error('❌ Erro durante renumeração:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Iniciando script de renumeração...');
    console.log('⚠️  ATENÇÃO: Este script irá renumerar TODOS os pedidos');
    console.log('⚠️  Execute apenas uma vez e em ambiente controlado\n');
    
    await renumberOrders();
    
  } catch (error) {
    console.error('❌ Falha na renumeração:', error);
    process.exit(1);
  } finally {
    await sql.end();
    console.log('🔌 Conexão encerrada');
  }
}

// Executar script
main();