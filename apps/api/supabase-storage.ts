import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';
import { eq } from 'drizzle-orm';
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

// Configuração do Drizzle com PostgreSQL - com fallback
let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL não encontrada!');
  console.log('📝 Configure a DATABASE_URL do PostgreSQL do Supabase no arquivo .env');
  throw new Error('DATABASE_URL não encontrada. Configure a conexão com o banco PostgreSQL do Supabase');
}

// Log das variáveis de ambiente disponíveis (mascarado)
console.log('🔍 Variáveis de ambiente detectadas:');
console.log('   DATABASE_URL:', databaseUrl.replace(/:([^:@]+)@/, ':***@'));
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   PORT:', process.env.PORT);

// Forçar IPv4 modificando a URL para usar conexão direta
if (process.env.NODE_ENV === 'production') {
  // Adicionar parâmetros específicos para forçar IPv4 no Railway
  if (databaseUrl.includes('db.wudcabcsxmahlufgsyop.supabase.co')) {
    console.log('🔄 Configurando URL para ambiente Railway...');
    // Adicionar parâmetros para melhor compatibilidade
    const urlParts = new URL(databaseUrl);
    urlParts.searchParams.set('sslmode', 'require');
    urlParts.searchParams.set('connect_timeout', '30');
    urlParts.searchParams.set('application_name', 'mardecores_railway');
    databaseUrl = urlParts.toString();
    console.log('📡 URL configurada:', databaseUrl.replace(/:([^:@]+)@/, ':***@'));
  }
}

// Configurações específicas para Railway/produção
const connectionOptions = {
  max: 3, // Reduzido para evitar limite de conexões
  idle_timeout: 20,
  connect_timeout: 60, // Aumentado significativamente
  socket_timeout: 30,
  // Configurações de rede específicas para Railway
  host_type: 'tcp',
  // SSL obrigatório para produção
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false, // Para resolver problemas de certificado no Railway
  } : false,
  // Configurações para Railway
  prepare: false,
  transform: {
    undefined: null,
  },
  // Forçar resolução DNS para IPv4
  family: 4,
  dns: {
    family: 4,
    hints: 0x04, // AI_ADDRCONFIG
  },
};

const client = postgres(databaseUrl, connectionOptions);
const db = drizzle(client, { schema });

// Log da configuração de conexão
console.log('🔗 Configurando conexão PostgreSQL:');
console.log('   📍 URL mascarada:', databaseUrl.replace(/:([^:@]+)@/, ':***@'));
console.log('   🌐 Ambiente:', process.env.NODE_ENV);
console.log('   🔒 SSL:', connectionOptions.ssl);
console.log('   📡 Protocolo: IPv4 forçado via pooler');

export class SupabaseStorage implements IStorage {
  
  constructor() {
    console.log('✅ Inicializando Supabase Storage');
    // Testar conexão na inicialização
    this.testConnection().catch(error => {
      console.error('❌ Erro na conexão inicial:', error.message);
      console.log('📝 Tentando reconectar em 5 segundos...');
      setTimeout(() => this.testConnection(), 5000);
    });
  }
  
  private async testConnection(): Promise<void> {
    try {
      console.log('🔌 Testando conexão PostgreSQL...');
      const result = await client`SELECT 1 as test, version() as version`;
      console.log('✅ Conexão PostgreSQL estabelecida com sucesso!');
      console.log('📊 Versão PostgreSQL:', result[0].version.split(' ')[0]);
    } catch (error: any) {
      console.error('❌ Falha na conexão PostgreSQL:', error);
      
      // Se for erro de IPv6, tentar fallback
      if (error.message?.includes('ENETUNREACH') && error.message?.includes('2600:')) {
        console.log('🔄 Detectado problema IPv6, tentando fallback...');
        // Aqui poderiamos implementar um fallback, mas por agora vamos apenas logar
        console.log('📝 Verifique as configurações de rede do Railway');
      }
      
      throw error;
    }
  }
  
  // Operações de Usuário
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(schema.users).values(user).returning();
    return result[0];
  }

  // Operações de Produto
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

  // Operações de Coleção
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

  // Operações de Cupom
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

  // Operações Financeiras
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

  // Operações de Fornecedor
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

  // Operações de Imagens de Produto
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
      // Primeiro, remove a marcação de principal de todas as imagens do produto
      await db.update(schema.productImages)
        .set({ isPrimary: false })
        .where(eq(schema.productImages.productId, productId));
      
      // Define a nova imagem como principal
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

  // Operações de Visualizações do Site (usando tabela analytics)
  async recordSiteView(view: InsertSiteView): Promise<SiteView> {
    // Usar tabela analytics para compatibilidade
    await this.recordAnalytic({
      date: new Date(),
      metric: 'page_view',
      value: 1,
      metadata: JSON.stringify({
        page: view.page,
        userAgent: view.userAgent,
        sessionId: view.sessionId,
        ipAddress: view.ipAddress,
        timestamp: new Date().toISOString(),
      }),
    });
    
    // Retornar um objeto simulado
    return {
      id: 'temp-id',
      page: view.page || '/',
      userAgent: view.userAgent,
      sessionId: view.sessionId,
      ipAddress: view.ipAddress,
      timestamp: new Date(),
      metadata: view.metadata,
    } as SiteView;
  }

  async getSiteViewsStats(): Promise<{
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  }> {
    try {
      // Buscar todas as visualizações da tabela analytics
      const pageViews = await db.select()
        .from(schema.analytics)
        .where(eq(schema.analytics.metric, 'page_view'));
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const stats = {
        total: pageViews.reduce((sum, view) => sum + view.value, 0),
        today: pageViews.filter(view => 
          view.date && new Date(view.date) >= today
        ).reduce((sum, view) => sum + view.value, 0),
        thisWeek: pageViews.filter(view => 
          view.date && new Date(view.date) >= thisWeek
        ).reduce((sum, view) => sum + view.value, 0),
        thisMonth: pageViews.filter(view => 
          view.date && new Date(view.date) >= thisMonth
        ).reduce((sum, view) => sum + view.value, 0),
      };

      return stats;
    } catch (error) {
      console.error('Erro ao buscar estatísticas de visualizações:', error);
      return { total: 0, today: 0, thisWeek: 0, thisMonth: 0 };
    }
  }

  // Operações de Analytics
  async recordAnalytic(analytic: InsertAnalytics): Promise<Analytics> {
    const result = await db.insert(schema.analytics).values({
      ...analytic,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  async getAnalytics(metric: string, period?: number): Promise<Analytics[]> {
    try {
      let query = db.select().from(schema.analytics)
        .where(eq(schema.analytics.metric, metric))
        .orderBy(schema.analytics.date);

      if (period) {
        const periodDate = new Date();
        periodDate.setDate(periodDate.getDate() - period);
        // Note: Esta linha precisa ser ajustada quando tiver acesso ao operador gte
        // query = query.where(gte(schema.analytics.date, periodDate));
      }

      return await query;
    } catch (error) {
      console.error('Erro ao buscar analytics:', error);
      return [];
    }
  }
}