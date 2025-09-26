import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

async function runProductRequestsMigration() {
  console.log('🔄 Executando migração para criar tabela product_requests...');
  
  try {
    // Criar cliente Supabase
    const supabaseUrl = 'https://wudcabcsxmahlufgsyop.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZGNhYmNzeG1haGx1ZmdzeW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcwNjMzMzYsImV4cCI6MjA0MjYzOTMzNn0.sPHC2wnR6WxjM8AYrFqA-VHSn0lKgKWyqPJLZOBXMdg';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Executar SQL para criar tabela
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Criar tabela de solicitações de produtos
        CREATE TABLE IF NOT EXISTS "product_requests" (
          "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          "customer_name" text NOT NULL,
          "product_name" text NOT NULL,
          "phone" text NOT NULL,
          "status" text DEFAULT 'pending',
          "notes" text,
          "contacted_at" timestamp,
          "created_at" timestamp DEFAULT now()
        );

        -- Criar índices para performance
        CREATE INDEX IF NOT EXISTS "product_requests_status_idx" ON "product_requests" ("status");
        CREATE INDEX IF NOT EXISTS "product_requests_date_idx" ON "product_requests" ("created_at");
      `
    });

    if (error) {
      console.error('❌ Erro ao executar migração:', error);
      
      // Tentar método alternativo usando SQL direto
      console.log('🔄 Tentando método alternativo...');
      
      const { data: result, error: sqlError } = await supabase
        .from('_supabase_sql')
        .insert({
          query: `
            CREATE TABLE IF NOT EXISTS "product_requests" (
              "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
              "customer_name" text NOT NULL,
              "product_name" text NOT NULL,
              "phone" text NOT NULL,
              "status" text DEFAULT 'pending',
              "notes" text,
              "contacted_at" timestamp,
              "created_at" timestamp DEFAULT now()
            );
            
            CREATE INDEX IF NOT EXISTS "product_requests_status_idx" ON "product_requests" ("status");
            CREATE INDEX IF NOT EXISTS "product_requests_date_idx" ON "product_requests" ("created_at");
          `
        });

      if (sqlError) {
        console.error('❌ Erro no método alternativo:', sqlError);
        console.log('💡 Por favor, execute manualmente no Supabase SQL Editor:');
        console.log(`
CREATE TABLE IF NOT EXISTS "product_requests" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_name" text NOT NULL,
  "product_name" text NOT NULL,
  "phone" text NOT NULL,
  "status" text DEFAULT 'pending',
  "notes" text,
  "contacted_at" timestamp,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "product_requests_status_idx" ON "product_requests" ("status");
CREATE INDEX IF NOT EXISTS "product_requests_date_idx" ON "product_requests" ("created_at");
        `);
      } else {
        console.log('✅ Migração executada com sucesso pelo método alternativo!');
      }
    } else {
      console.log('✅ Migração executada com sucesso!', data);
    }

    // Verificar se a tabela foi criada
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'product_requests');

    if (tableError) {
      console.error('❌ Erro ao verificar tabela:', tableError);
    } else if (tables && tables.length > 0) {
      console.log('✅ Tabela product_requests criada e verificada com sucesso!');
    } else {
      console.log('⚠️ Tabela pode não ter sido criada. Verifique manualmente.');
    }

  } catch (error) {
    console.error('❌ Erro na migração:', error);
  }
}

// Executar migração
runProductRequestsMigration().then(() => {
  console.log('🎯 Processo de migração finalizado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erro fatal na migração:', error);
  process.exit(1);
});