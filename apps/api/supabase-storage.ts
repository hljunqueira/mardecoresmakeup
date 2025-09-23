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

// TESTE EXTREMO: Se esta mensagem não aparecer, Railway não está usando novo build
process.env.FORCE_DEPLOY_TIMESTAMP = new Date().toISOString();
process.stdout.write('\n=== DEPLOY FORCADO EM ' + process.env.FORCE_DEPLOY_TIMESTAMP + ' ===\n');
process.stdout.write('VERSAO_BUILD: 2025-01-22-CRITICAL\n');
process.stdout.write('STATUS: TESTANDO_CREDENCIAIS_SUPABASE\n\n');

// Função de debug que sempre funciona (não é removida pelo ESBuild)
const debugLog = (message: string) => {
  // Usar process.stdout.write para garantir que a mensagem apareça
  process.stdout.write(`[DEBUG] ${message}\n`);
};

// Configuração do banco PostgreSQL seguindo documentação oficial Supabase 2024
debugLog('🔗 Inicializando Supabase Storage...');
console.log('🔗 Inicializando Supabase Storage...');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL não encontrada nas variáveis de ambiente');
}

console.log('📊 Configuração do banco:');
console.log('   URL:', databaseUrl.replace(/:([^:@]+)@/, ':***@'));
console.log('   Ambiente:', process.env.NODE_ENV);

// 🚨 MODO DEBUG: Conexão direta para diagnosticar
// Não usar pooler para identificar se o problema é autenticação ou formato
let connectionUrl = databaseUrl;

// Forçar uma variável de ambiente visível no Railway
process.env.DEBUG_CONNECTION_TYPE = databaseUrl.includes('pooler') ? 'POOLER_MODE' : 'DIRECT_MODE';
process.env.DEBUG_TEST_STATUS = 'TESTING_CREDENTIALS';

// Configuração simplificada: sempre usar URL original (sem conversão pooler)
if (databaseUrl.includes('pooler')) {
  console.log('⚠️ URL do pooler detectada - mantendo para teste');
  console.log('🔍 DIAGNÓSTICO: Testando se problema é pooler ou credenciais');
} else {
  console.log('📡 URL direta detectada - perfeito para teste de credenciais');
  console.log('🔍 DIAGNÓSTICO: Se falhar aqui, problema é nas credenciais básicas');
}

console.log('🧪 TESTE CRÍTICO:', connectionUrl.includes('pooler') ? 'POOLER' : 'DIRETO');

// IMPORTANTE: Log que sempre deve aparecer (sem emoji)
debugLog('=== CACHE LIMPO BUILD 4 ===');
debugLog('CONNECTION_MODE: ' + (process.env.DEBUG_CONNECTION_TYPE || 'UNKNOWN'));
debugLog('TEST_STATUS: ' + (process.env.DEBUG_TEST_STATUS || 'UNKNOWN'));
console.log('=== CACHE LIMPO BUILD 4 ===');
console.log('CONNECTION_MODE:', process.env.DEBUG_CONNECTION_TYPE);
console.log('TEST_STATUS:', process.env.DEBUG_TEST_STATUS);

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

console.log('🔗 URL final de conexão:', connectionUrl.replace(/:([^:@\/]+)@/, ':***@'));

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
      console.error('🔍 Detalhes do erro:');
      console.error('   Código:', error.code || 'N/A');
      console.error('   Severity:', error.severity || 'N/A');
      console.error('   URL usada:', connectionUrl.replace(/:([^:@\/]+)@/, ':***@'));
      
      if (error.message.includes('Tenant or user not found')) {
        // Extrair projectRef para debug
        const debugUrlMatch = databaseUrl?.match(/postgresql:\/\/([^:]+):([^@]+)@db\.([^.]+)\.supabase\.co:(\d+)\/(.+)/);
        const debugProjectRef = debugUrlMatch ? debugUrlMatch[3] : 'não extraído';
        
        console.error('💡 DICA: Erro comum do Supavisor Pooler');
        console.error('   - Verifique se o formato do usuário está correto: postgres.PROJECT_REF');
        console.error('   - Confirme se a região do pooler está correta (us-east-1 para Railway)');
        console.error('   - Project Ref extraído:', debugProjectRef);
        console.error('   - Tente usar conexão direta temporáriamente');
        
        // Se estiver em produção, tentar outras regiões
        if (process.env.NODE_ENV === 'production') {
          await this.tryAlternativeRegions();
          return;
        }
      }
      
      this.isConnected = false;
      throw error;
    }
  }
  
  private async tryAlternativeRegions(): Promise<void> {
    const regions = ['us-east-1', 'sa-east-1', 'eu-west-1', 'us-east-2', 'ap-southeast-1'];
    
    // Tentar extrair da URL original OU da URL já convertida do pooler
    let urlMatch = process.env.DATABASE_URL?.match(/postgresql:\/\/([^:]+):([^@]+)@db\.([^.]+)\.supabase\.co:(\d+)\/(.+)/);
    
    // Se não conseguiu extrair da URL direta, tentar da URL do pooler
    if (!urlMatch) {
      urlMatch = connectionUrl.match(/postgresql:\/\/postgres\.([^:]+):([^@]+)@aws-0-[^.]+\.pooler\.supabase\.com:(\d+)\/(.+)/);
      if (!urlMatch) {
        console.error('❌ Não foi possível extrair informações da URL de conexão');
        console.error('   DATABASE_URL:', process.env.DATABASE_URL?.replace(/:([^:@\/]+)@/, ':***@'));
        console.error('   Connection URL:', connectionUrl.replace(/:([^:@\/]+)@/, ':***@'));
        throw new Error('Não foi possível extrair informações da DATABASE_URL');
      }
    }
    
    const [, projectRefOrUser, password, , database] = urlMatch;
    // Se extraiu da URL direta, user será 'postgres' e projectRef estará na posição 3
    // Se extraiu da URL do pooler, projectRef já estará na posição 1
    const projectRef = projectRefOrUser === 'postgres' ? urlMatch[3] : projectRefOrUser;
    
    console.log('🌎 Tentando regiões alternativas...');
    console.log('   Project Ref:', projectRef);
    
    for (const region of regions) {
      try {
        console.log(`🔄 Tentando região alternativa: ${region}`);
        const testUrl = `postgresql://postgres.${projectRef}:${password}@aws-0-${region}.pooler.supabase.com:5432/postgres`;
        const testClient = postgres(testUrl, connectionOptions);
        
        const result = await testClient`SELECT 1 as test`;
        
        console.log(`✅ Sucesso com região: ${region}`);
        console.log(`💡 Use esta URL no Railway: ${testUrl.replace(/:([^:@\/]+)@/, ':***@')}`);
        
        // Fechar cliente de teste
        await testClient.end();
        return;
        
      } catch (error: any) {
        console.log(`❌ Região ${region} falhou:`, error.message);
        continue;
      }
    }
    
    console.error('❌ Todas as regiões alternativas falharam');
    throw new Error('Não foi possível conectar com nenhuma região do Supavisor');
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
