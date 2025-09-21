import pkg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();
const { Client } = pkg;

async function verifySupabasePolicies() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔗 Conectado ao Supabase');
    
    // Verificar políticas RLS (Row Level Security)
    console.log('\n📋 Verificando políticas RLS...');
    const rlsResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        rowsecurity
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    
    console.log('🔒 Status RLS das tabelas:');
    rlsResult.rows.forEach(row => {
      console.log(`   • ${row.tablename}: ${row.rowsecurity ? 'ATIVADO' : 'DESATIVADO'}`);
    });

    // Verificar políticas existentes
    console.log('\n🛡️ Políticas existentes:');
    const policiesResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);
    
    if (policiesResult.rows.length === 0) {
      console.log('   ℹ️ Nenhuma política RLS configurada');
    } else {
      policiesResult.rows.forEach(policy => {
        console.log(`   • ${policy.tablename}.${policy.policyname} (${policy.cmd}) - Roles: ${policy.roles}`);
      });
    }

    // Verificar usuários existentes
    console.log('\n👥 Usuários admin existentes:');
    const usersResult = await client.query(`
      SELECT id, username, role, created_at 
      FROM users 
      ORDER BY created_at DESC;
    `);
    
    if (usersResult.rows.length === 0) {
      console.log('   ℹ️ Nenhum usuário admin cadastrado');
    } else {
      usersResult.rows.forEach(user => {
        console.log(`   • ${user.username} (${user.role}) - Criado: ${new Date(user.created_at).toLocaleDateString('pt-BR')}`);
      });
    }

    console.log('\n✅ Verificação concluída!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

verifySupabasePolicies();