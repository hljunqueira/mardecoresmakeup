import { SupabaseStorage } from './supabase-storage';
import type { InsertUser } from '@shared/schema';

export async function seedDatabase() {
  console.log('🌱 Iniciando seed do banco de dados...');
  
  const storage = new SupabaseStorage();
  
  try {
    // Verifica se já existe um usuário admin
    const existingAdmin = await storage.getUserByUsername('admin@mardecores.com');
    
    if (!existingAdmin) {
      // Cria usuário administrador padrão
      const adminUser: InsertUser = {
        username: 'admin@mardecores.com',
        password: 'admin123', // Em produção, use hash da senha
      };
      
      await storage.createUser(adminUser);
      console.log('✅ Usuário administrador criado com sucesso');
      console.log('📧 Email: admin@mardecores.com');
      console.log('🔑 Senha: admin123');
    } else {
      console.log('ℹ️  Usuário administrador já existe');
    }
    
    // Aqui você pode adicionar mais dados de seed se necessário
    // Por exemplo: produtos de exemplo, categorias padrão, etc.
    
    console.log('✅ Seed do banco de dados concluído');
    
  } catch (error) {
    console.error('❌ Erro ao fazer seed do banco de dados:', error);
    throw error;
  }
}

// Executa o seed se este arquivo foi chamado diretamente
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}