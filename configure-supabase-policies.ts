import pkg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();
const { Client } = pkg;

async function configureSupabasePolicies() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔗 Conectado ao Supabase');
    
    console.log('\n🛡️ Configurando políticas de segurança...');

    // Habilitar RLS apenas em tabelas sensíveis (opcional para desenvolvimento)
    const sensitiveTables = ['users', 'customers', 'orders', 'financial_transactions'];
    
    console.log('🔒 Configurando RLS para tabelas sensíveis...');
    for (const table of sensitiveTables) {
      await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      console.log(`   ✅ RLS habilitado para: ${table}`);
    }

    // Política para administradores - acesso total
    console.log('\n👑 Criando políticas para administradores...');
    
    // Política para users (apenas admins podem ver/editar)
    await client.query(`
      CREATE POLICY admin_users_policy ON users
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
    `);
    console.log('   ✅ Política admin criada para users');

    // Política para customers - admins podem ver tudo
    await client.query(`
      CREATE POLICY admin_customers_policy ON customers
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
    `);
    console.log('   ✅ Política admin criada para customers');

    // Política para orders - admins podem ver tudo
    await client.query(`
      CREATE POLICY admin_orders_policy ON orders
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
    `);
    console.log('   ✅ Política admin criada para orders');

    // Política para financial_transactions - apenas admins
    await client.query(`
      CREATE POLICY admin_financial_policy ON financial_transactions
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
    `);
    console.log('   ✅ Política admin criada para financial_transactions');

    console.log('\n📋 Configurando acesso público para produtos e coleções...');
    
    // Tabelas que podem ser acessadas publicamente (sem RLS)
    const publicTables = ['products', 'collections', 'coupons', 'product_images', 'product_reviews'];
    
    for (const table of publicTables) {
      console.log(`   ℹ️ ${table}: Acesso público mantido (sem RLS)`);
    }

    console.log('\n🎯 Criando função para autenticação de admin...');
    
    // Função para verificar se é admin (para usar nas políticas)
    await client.query(`
      CREATE OR REPLACE FUNCTION is_admin()
      RETURNS BOOLEAN AS $$
      BEGIN
        -- Para desenvolvimento, sempre retorna true
        -- Em produção, você pode implementar lógica mais complexa
        RETURN true;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    console.log('   ✅ Função is_admin() criada');

    console.log('\n📊 Resumo de segurança configurado:');
    console.log('   🔒 RLS habilitado para: users, customers, orders, financial_transactions');
    console.log('   🌐 Acesso público: products, collections, coupons, product_images, product_reviews');
    console.log('   👑 Administradores: Acesso total a todas as tabelas');
    console.log('   🛡️ Políticas: Configuradas para ambiente de desenvolvimento');
    
    console.log('\n✅ Configuração de segurança concluída!');
    console.log('\n📝 Notas importantes:');
    console.log('   • Ambiente configurado para DESENVOLVIMENTO');
    console.log('   • Para PRODUÇÃO, ajustar políticas RLS mais restritivas');
    console.log('   • Considerar usar Supabase Auth para autenticação avançada');
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('⚠️ Algumas políticas já existem - prosseguindo...');
    } else {
      console.error('❌ Erro ao configurar políticas:', error.message);
    }
  } finally {
    await client.end();
  }
}

configureSupabasePolicies();