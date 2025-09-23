// 🗄️ Fallback SQLite Local para quando Supabase não conectar
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@shared/schema';
import type { User, Product, Coupon, FinancialTransaction } from '@shared/schema';

export class LocalDatabaseFallback {
  private db: any;
  private isInitialized = false;

  constructor() {
    try {
      // Criar banco SQLite em memória
      const sqlite = new Database(':memory:');
      this.db = drizzle(sqlite, { schema });
      console.log('✅ SQLite local inicializado como fallback');
    } catch (error) {
      console.error('❌ Erro ao inicializar SQLite local:', error);
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Criar tabelas essenciais
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'admin',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login_at DATETIME
        )
      `);

      await this.db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          price TEXT NOT NULL,
          stock INTEGER DEFAULT 0,
          active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Inserir usuário admin padrão
      const crypto = await import('crypto');
      const adminPassword = crypto.createHash('sha256').update('Mardecores@09212615').digest('hex');
      
      await this.db.run(`
        INSERT OR IGNORE INTO users (id, username, password, role) 
        VALUES ('admin-1', 'mardecoresmakeup@gmail.com', '${adminPassword}', 'admin')
      `);

      this.isInitialized = true;
      console.log('✅ Banco SQLite local configurado com dados iniciais');
    } catch (error) {
      console.error('❌ Erro ao configurar SQLite:', error);
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.initialize();
    
    try {
      const result = await this.db.get(`
        SELECT * FROM users WHERE username = ?
      `, [username]);
      
      return result ? {
        id: result.id,
        username: result.username,
        password: result.password,
        role: result.role,
        createdAt: new Date(result.created_at),
        lastLoginAt: result.last_login_at ? new Date(result.last_login_at) : null
      } : undefined;
    } catch (error) {
      console.error('❌ Erro SQLite getUserByUsername:', error);
      return undefined;
    }
  }

  async getAllProducts(): Promise<Product[]> {
    await this.initialize();
    
    try {
      const results = await this.db.all('SELECT * FROM products ORDER BY created_at DESC');
      return results.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        price: row.price,
        originalPrice: null,
        stock: row.stock,
        minStock: 5,
        images: [],
        category: 'local',
        brand: 'Mar de Cores',
        sku: null,
        tags: [],
        featured: false,
        active: Boolean(row.active),
        rating: '0',
        reviewCount: 0,
        weight: null,
        dimensions: null,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.created_at)
      }));
    } catch (error) {
      console.error('❌ Erro SQLite getAllProducts:', error);
      return [];
    }
  }
}