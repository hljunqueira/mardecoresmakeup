import 'dotenv/config';

async function testSupabaseConnection() {
  console.log('🔍 Testando conexão com Supabase...\n');
  
  // Verifica se as variáveis de ambiente estão configuradas
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Variáveis de ambiente não configuradas:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n📝 Configure essas variáveis no arquivo .env');
    process.exit(1);
  }
  
  console.log('✅ Todas as variáveis de ambiente estão configuradas\n');
  
  try {
    // Testa o cliente Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    
    // Testa uma query simples
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = tabela não existe ainda
      console.error('❌ Erro ao conectar com Supabase:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Conexão com Supabase estabelecida com sucesso!');
    
    // Testa a conexão com PostgreSQL via Drizzle
    const postgres = await import('postgres');
    const sql = postgres.default(process.env.DATABASE_URL!);
    
    try {
      const result = await sql`SELECT version()`;
      console.log('✅ Conexão com PostgreSQL estabelecida com sucesso!');
      console.log('📊 Versão do PostgreSQL:', result[0].version.split(' ')[0]);
      
      await sql.end();
    } catch (dbError) {
      console.error('❌ Erro ao conectar com PostgreSQL:', dbError);
      process.exit(1);
    }
    
    console.log('\n🎉 Todas as conexões estão funcionando corretamente!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Execute: npm run db:push    # Para criar as tabelas');
    console.log('2. Execute: npm run db:seed    # Para inserir dados iniciais');
    console.log('3. Execute: npm run dev:supabase # Para iniciar com Supabase');
    
  } catch (error) {
    console.error('❌ Erro ao testar conexões:', error);
    process.exit(1);
  }
}

testSupabaseConnection();