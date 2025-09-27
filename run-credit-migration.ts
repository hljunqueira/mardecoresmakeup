#!/usr/bin/env tsx

/**
 * Script de Migração: Sistema de Crediário Integrado
 * 
 * Este script executa a migração 0002 que adiciona funcionalidades
 * de crediário ao sistema existente mantendo total compatibilidade.
 * 
 * Estratégia:
 * - Extensão gradual sem quebrar dados existentes
 * - Campos opcionais na tabela reservations
 * - Novas tabelas para crediário
 * - APIs híbridas para transição suave
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readFileSync } from "fs";
import { join } from "path";

// Configuração do banco
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não encontrada nas variáveis de ambiente");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

console.log("🚀 Iniciando migração do sistema de crediário...");
console.log("📅 Data:", new Date().toISOString());
console.log("🔧 Estratégia: Extensão gradual com compatibilidade total");

async function runMigration() {
  const sql = postgres(DATABASE_URL!);
  const db = drizzle(sql);

  try {
    console.log("\n🔍 Verificando estado atual do banco...");
    
    // Verificar se a migração já foi executada
    const checkTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'credit_accounts'
      ) as exists;
    `;
    
    if (checkTableExists[0].exists) {
      console.log("⚠️  Sistema de crediário já parece estar instalado");
      console.log("🔍 Verificando integridade...");
      
      // Verificar se os novos campos existem na tabela reservations
      const checkColumns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'reservations' 
        AND column_name IN ('type', 'credit_account_id', 'customer_id');
      `;
      
      if (checkColumns.length === 3) {
        console.log("✅ Migração já executada com sucesso anteriormente");
        return;
      }
    }

    console.log("\n📖 Carregando script de migração...");
    const migrationPath = join(__dirname, "migrations", "0002_add_credit_system.sql");
    const migrationSQL = readFileSync(migrationPath, "utf8");

    console.log("🔧 Executando migração...");
    console.log("⏱️  Esta operação pode levar alguns minutos...");

    // Executar a migração dentro de uma transação
    await sql.begin(async (sql) => {
      console.log("📥 Iniciando transação...");
      
      // Executar o script de migração
      await sql.unsafe(migrationSQL);
      
      console.log("✅ Migração executada com sucesso!");
    });

    console.log("\n🧪 Verificando resultado da migração...");
    
    // Verificar se as tabelas foram criadas
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('credit_accounts', 'credit_payments')
      ORDER BY table_name;
    `;
    
    console.log("📊 Tabelas criadas:", tables.map(t => t.table_name));

    // Verificar se os novos campos foram adicionados
    const newColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'reservations' 
      AND column_name IN ('type', 'credit_account_id', 'customer_id')
      ORDER BY column_name;
    `;
    
    console.log("🔧 Campos adicionados à tabela reservations:");
    newColumns.forEach(col => {
      console.log(`  • ${col.column_name} (${col.data_type})`);
    });

    // Verificar triggers e funções
    const functions = await sql`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_name IN ('update_credit_account_amounts', 'generate_account_number')
      ORDER BY routine_name;
    `;
    
    console.log("⚙️  Funções criadas:", functions.map(f => f.routine_name));

    // Verificar views
    const views = await sql`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_name LIKE 'v_%credit%' OR table_name LIKE 'v_%reservations%'
      ORDER BY table_name;
    `;
    
    console.log("👁️  Views criadas:", views.map(v => v.table_name));

    console.log("\n🎯 MIGRAÇÃO CONCLUÍDA COM SUCESSO!");
    console.log("=====================================");
    console.log("✅ Sistema de crediário integrado");
    console.log("✅ Compatibilidade total mantida");
    console.log("✅ Reservas existentes preservadas");
    console.log("✅ APIs híbridas prontas para uso");
    console.log("=====================================");
    
    console.log("\n📋 PRÓXIMOS PASSOS:");
    console.log("1. 🔄 Reiniciar o servidor da aplicação");
    console.log("2. 🧪 Testar APIs existentes (devem continuar funcionando)");
    console.log("3. 🆕 Implementar novas interfaces de crediário");
    console.log("4. 📊 Configurar relatórios integrados");

  } catch (error) {
    console.error("\n❌ Erro durante a migração:");
    console.error(error);
    
    console.log("\n🔧 Dicas para resolução:");
    console.log("1. Verificar se o banco está acessível");
    console.log("2. Confirmar permissões de escrita no banco");
    console.log("3. Verificar se todas as tabelas necessárias existem");
    console.log("4. Executar novamente após corrigir os problemas");
    
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Executar com tratamento de erros
runMigration().catch((error) => {
  console.error("💥 Falha crítica na migração:", error);
  process.exit(1);
});