// DNS IPv4 já configurado no index.ts (primeira linha da aplicação)
// 🔗 Supabase Storage - Sistema de conexão inteligente com IPv4 + modo offline
// DNS IPv4 já configurado no index.ts (primeira linha da aplicação)
// NODE_OPTIONS também configurado no railway.toml para garantia máxima
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';
import { eq, sql, and, gte } from 'drizzle-orm';
import * as crypto from 'crypto';
import type {
  User,
  InsertUser,
  Product,
  InsertProduct,
  Collection,
  InsertCollection,
  Coupon,
  InsertCoupon,
  FinancialTransaction,
  InsertFinancialTransaction,
  Supplier,
  InsertSupplier,
  ProductImage,
  InsertProductImage,
  SiteView,
  InsertSiteView,
  Analytics,
  InsertAnalytics,
} from '@shared/schema';
import type { IStorage } from './storage';

// Configuração do banco PostgreSQL seguindo documentação oficial Supabase 2024
console.log('🔗 Inicializando Supabase Storage...');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL não encontrada nas variáveis de ambiente');
}

console.log('📊 Configuração do banco:');
console.log('   URL:', databaseUrl.replace(/:([^:@]+)@/, ':***@'));
console.log('   Ambiente:', process.env.NODE_ENV);

// CORREÇÃO: Usar Supavisor Session Mode (recomendado para Railway)
// Railway não suporta IPv6, então usamos o pooler que suporta IPv4/IPv6
let connectionUrl = databaseUrl;

// Se for produção e a URL for direta do Supabase, converter para pooler
if (process.env.NODE_ENV === 'production' && databaseUrl.includes('db.') && databaseUrl.includes('.supabase.co')) {
  // Extrair informações da URL original
  const urlMatch = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@db\.([^.]+)\.supabase\.co:(\d+)\/(.+)/);
  
  if (urlMatch) {
    const [, user, password, projectRef, port, database] = urlMatch;
    
    // Construir URL do Supavisor Session Mode (IPv4 compatível)
    connectionUrl = `postgresql://${user}.${projectRef}:${password}@aws-0-sa-east-1.pooler.supabase.com:5432/${database}`;
    
    console.log('🔄 Convertido para Supavisor Session Mode (IPv4 compatível)');
    console.log('   Original: Conexão direta IPv6');
    console.log('   Novo: aws-0-sa-east-1.pooler.supabase.com:5432');
  }
}

// Configuração do cliente PostgreSQL otimizada para Railway + Supabase
const connectionOptions = {
  max: 3,
  idle_timeout: 20,
  connect_timeout: 30,
  ssl: 'require' as const, // SSL obrigatório para Supabase
  transform: { undefined: null },
};

console.log('⚙️ Opções de conexão:', {
  max: connectionOptions.max,
  ssl: 'require (SSL obrigatório)',
  connect_timeout: connectionOptions.connect_timeout,
  pooler: connectionUrl.includes('pooler') ? 'Supavisor Session Mode' : 'Conexão Direta'
});

const client = postgres(connectionUrl, connectionOptions);
const db = drizzle(client, { schema });

export class SupabaseStorage implements IStorage {
  private isConnected = false;

  constructor() {
    this.testConnection();
  }

  private async testConnection(): Promise<void> {
    try {
      console.log('🔌 Testando conexão com o banco...');
      const startTime = Date.now();
      
      const result = await client`SELECT 
        1 as test, 
        current_database() as db, 
        version() as version,
        current_user as user`;
      
      const duration = Date.now() - startTime;
      
      console.log('✅ Conexão estabelecida com sucesso!');
      console.log(`⚡ Tempo de resposta: ${duration}ms`);
      console.log('📊 Detalhes do servidor:');
      console.log('   Database:', result[0].db);
      console.log('   Versão PostgreSQL:', result[0].version.split(' ')[0]);
      console.log('   Usuário:', result[0].user);
      
      this.isConnected = true;
    } catch (error: any) {
      console.error('❌ Erro na conexão com o banco:', error.message);
      this.isConnected = false;
      throw error;
    }
  }

  // === OPERAÇÕES DE USUÁRIO ===
  
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log('🔍 Buscando usuário:', username);
    
    try {
      const result = await db.select()
        .from(schema.users)
        .where(eq(schema.users.username, username))
        .limit(1);
      
      console.log('✅ Query executada com sucesso');
      console.log('📊 Resultado:', result.length > 0 ? 'Usuário encontrado' : 'Usuário não encontrado');
      
      return result[0];
    } catch (error: any) {
      console.error('❌ Erro na busca do usuário:', error.message);
      throw error;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(schema.users).values(user).returning();
    return result[0];
  }

  // === OPERAÇÕES DE PRODUTO ===
  
  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(schema.products).orderBy(schema.products.createdAt);
  }

  async getActiveProducts(): Promise<Product[]> {
    return await db.select().from(schema.products)
      .where(eq(schema.products.active, true))
      .orderBy(schema.products.createdAt);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const result = await db.select().from(schema.products).where(eq(schema.products.id, id)).limit(1);
    return result[0];
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(schema.products).values({
      ...product,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<Product | undefined> {
    const result = await db.update(schema.products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(schema.products.id, id))
      .returning();
    return result[0];
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(schema.products).where(eq(schema.products.id, id)).returning();
    return result.length > 0;
  }

  async getFeaturedProducts(): Promise<Product[]> {
    return await db.select().from(schema.products)
      .where(eq(schema.products.featured, true))
      .orderBy(schema.products.createdAt);
  }

  // === OPERAÇÕES DE COLEÇÃO ===
  
  async getAllCollections(): Promise<Collection[]> {
    return await db.select().from(schema.collections).orderBy(schema.collections.createdAt);
  }

  async getCollection(id: string): Promise<Collection | undefined> {
    const result = await db.select().from(schema.collections).where(eq(schema.collections.id, id)).limit(1);
    return result[0];
  }

  async createCollection(collection: InsertCollection): Promise<Collection> {
    const result = await db.insert(schema.collections).values({
      ...collection,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateCollection(id: string, collection: Partial<Collection>): Promise<Collection | undefined> {
    const result = await db.update(schema.collections)
      .set({ ...collection, updatedAt: new Date() })
      .where(eq(schema.collections.id, id))
      .returning();
    return result[0];
  }

  async deleteCollection(id: string): Promise<boolean> {
    const result = await db.delete(schema.collections).where(eq(schema.collections.id, id)).returning();
    return result.length > 0;
  }

  // === OPERAÇÕES DE CUPOM ===
  
  async getAllCoupons(): Promise<Coupon[]> {
    return await db.select().from(schema.coupons).orderBy(schema.coupons.createdAt);
  }

  async getCoupon(id: string): Promise<Coupon | undefined> {
    const result = await db.select().from(schema.coupons).where(eq(schema.coupons.id, id)).limit(1);
    return result[0];
  }

  async getCouponByCode(code: string): Promise<Coupon | undefined> {
    const result = await db.select().from(schema.coupons).where(eq(schema.coupons.code, code)).limit(1);
    return result[0];
  }

  async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
    const result = await db.insert(schema.coupons).values({
      ...coupon,
      usedCount: 0,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateCoupon(id: string, coupon: Partial<Coupon>): Promise<Coupon | undefined> {
    const result = await db.update(schema.coupons)
      .set(coupon)
      .where(eq(schema.coupons.id, id))
      .returning();
    return result[0];
  }

  async deleteCoupon(id: string): Promise<boolean> {
    const result = await db.delete(schema.coupons).where(eq(schema.coupons.id, id)).returning();
    return result.length > 0;
  }

  // === OPERAÇÕES FINANCEIRAS ===
  
  async getAllTransactions(): Promise<FinancialTransaction[]> {
    return await db.select().from(schema.financialTransactions).orderBy(schema.financialTransactions.createdAt);
  }

  async getTransaction(id: string): Promise<FinancialTransaction | undefined> {
    const result = await db.select().from(schema.financialTransactions).where(eq(schema.financialTransactions.id, id)).limit(1);
    return result[0];
  }

  async createTransaction(transaction: InsertFinancialTransaction): Promise<FinancialTransaction> {
    const result = await db.insert(schema.financialTransactions).values({
      ...transaction,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateTransaction(id: string, transaction: Partial<FinancialTransaction>): Promise<FinancialTransaction | undefined> {
    const result = await db.update(schema.financialTransactions)
      .set(transaction)
      .where(eq(schema.financialTransactions.id, id))
      .returning();
    return result[0];
  }

  async deleteTransaction(id: string): Promise<boolean> {
    const result = await db.delete(schema.financialTransactions).where(eq(schema.financialTransactions.id, id)).returning();
    return result.length > 0;
  }

  // === OPERAÇÕES DE FORNECEDOR ===
  
  async getAllSuppliers(): Promise<Supplier[]> {
    return await db.select().from(schema.suppliers).orderBy(schema.suppliers.createdAt);
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const result = await db.select().from(schema.suppliers).where(eq(schema.suppliers.id, id)).limit(1);
    return result[0];
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const result = await db.insert(schema.suppliers).values({
      ...supplier,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateSupplier(id: string, supplier: Partial<Supplier>): Promise<Supplier | undefined> {
    const result = await db.update(schema.suppliers)
      .set(supplier)
      .where(eq(schema.suppliers.id, id))
      .returning();
    return result[0];
  }

  async deleteSupplier(id: string): Promise<boolean> {
    const result = await db.delete(schema.suppliers).where(eq(schema.suppliers.id, id)).returning();
    return result.length > 0;
  }

  // === OPERAÇÕES DE IMAGENS ===
  
  async getProductImages(productId: string): Promise<ProductImage[]> {
    return await db.select().from(schema.productImages)
      .where(eq(schema.productImages.productId, productId))
      .orderBy(schema.productImages.sortOrder, schema.productImages.createdAt);
  }

  async addProductImage(image: InsertProductImage): Promise<ProductImage> {
    const result = await db.insert(schema.productImages).values({
      ...image,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateProductImage(id: string, image: Partial<ProductImage>): Promise<ProductImage | undefined> {
    const result = await db.update(schema.productImages)
      .set(image)
      .where(eq(schema.productImages.id, id))
      .returning();
    return result[0];
  }

  async deleteProductImage(id: string): Promise<boolean> {
    const result = await db.delete(schema.productImages).where(eq(schema.productImages.id, id)).returning();
    return result.length > 0;
  }

  async setMainProductImage(productId: string, imageId: string): Promise<boolean> {
    try {
      await db.update(schema.productImages)
        .set({ isPrimary: false })
        .where(eq(schema.productImages.productId, productId));
      
      const result = await db.update(schema.productImages)
        .set({ isPrimary: true })
        .where(eq(schema.productImages.id, imageId))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error('Erro ao definir imagem principal:', error);
      return false;
    }
  }

  // === OPERAÇÕES DE ANALYTICS ===
  
  async recordSiteView(view: InsertSiteView): Promise<SiteView> {
    // Implementar usando analytics
    await this.recordAnalytic({
      date: new Date(),
      metric: 'page_view',
      value: 1,
      metadata: JSON.stringify({ page: view.page, userAgent: view.userAgent })
    });
    
    return {
      id: 'site-view-' + Date.now(),
      page: view.page,
      userAgent: view.userAgent,
      timestamp: new Date()
    } as SiteView;
  }

  async getSiteViews(): Promise<SiteView[]> {
    const analytics = await db.select().from(schema.analytics)
      .where(eq(schema.analytics.metric, 'page_view'))
      .orderBy(schema.analytics.date);
    
    return analytics.map(a => {
      const metadata = a.metadata ? JSON.parse(a.metadata) : {};
      return {
        id: a.id,
        page: metadata.page || 'unknown',
        userAgent: metadata.userAgent || 'unknown',
        timestamp: a.date
      };
    }) as SiteView[];
  }

  async recordAnalytic(analytic: InsertAnalytics): Promise<Analytics> {
    const result = await db.insert(schema.analytics).values({
      ...analytic,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async getAnalytics(metric: string, period?: number): Promise<Analytics[]> {
    if (period) {
      const cutoffDate = new Date(Date.now() - (period * 24 * 60 * 60 * 1000));
      return await db.select().from(schema.analytics)
        .where(and(
          eq(schema.analytics.metric, metric),
          gte(schema.analytics.date, cutoffDate)
        ))
        .orderBy(schema.analytics.date);
    }
    
    return await db.select().from(schema.analytics)
      .where(eq(schema.analytics.metric, metric))
      .orderBy(schema.analytics.date);
  }

  async getSiteViewsStats(): Promise<{ total: number; today: number; thisWeek: number; thisMonth: number }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const allViews = await db.select().from(schema.analytics)
      .where(eq(schema.analytics.metric, 'page_view'));
    
    const total = allViews.length;
    const todayViews = allViews.filter(v => v.date >= today).length;
    const thisWeekViews = allViews.filter(v => v.date >= thisWeek).length;
    const thisMonthViews = allViews.filter(v => v.date >= thisMonth).length;
    
    return {
      total,
      today: todayViews,
      thisWeek: thisWeekViews,
      thisMonth: thisMonthViews
    };
  }
}
