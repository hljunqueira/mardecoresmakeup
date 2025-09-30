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
  Reservation,
  InsertReservation,
  ProductRequest,
  InsertProductRequest,
  Customer,
  InsertCustomer,
  CustomerAddress,
  InsertCustomerAddress,
  CreditAccount,
  InsertCreditAccount,
  CreditPayment,
  InsertCreditPayment,
  CreditAccountItem,
  InsertCreditAccountItem,
  Order,
  InsertOrder,
  OrderItem,
  InsertOrderItem,
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

const rawDatabaseUrl = process.env.DATABASE_URL;
if (!rawDatabaseUrl) {
  throw new Error('DATABASE_URL não encontrada nas variáveis de ambiente');
}

// DEBUG CRITICAL: Verificar exatamente o que está sendo recebido
console.log('🔍 === DEBUG CRITICAL URL ===');
console.log('   Raw DATABASE_URL:', JSON.stringify(rawDatabaseUrl));
console.log('   Length:', rawDatabaseUrl.length);
console.log('   Starts with postgresql:', rawDatabaseUrl.startsWith('postgresql:'));
console.log('   Contains DATABASE_URL=:', rawDatabaseUrl.includes('DATABASE_URL='));

// Limpar URL se contiver prefixo incorreto
let databaseUrl = rawDatabaseUrl;
if (rawDatabaseUrl.includes('DATABASE_URL=')) {
  console.log('⚠️ PROBLEMA DETECTADO: URL contém prefixo DATABASE_URL=');
  console.log('🔧 Removendo prefixo...');
  databaseUrl = rawDatabaseUrl.replace('DATABASE_URL=', '');
  console.log('✅ URL limpa:', databaseUrl.replace(/:([^:@]+)@/, ':***@'));
}
console.log('='.repeat(40));

console.log('📊 Configuração do banco:');
console.log('   URL:', databaseUrl.replace(/:([^:@]+)@/, ':***@'));
console.log('   Ambiente:', process.env.NODE_ENV);

// 🎯 TESTE DIAGNÓSTICO: Conexão inteligente Supabase
// Detecta automaticamente formato da URL e usa configuração apropriada
let connectionUrl = databaseUrl;
let connectionMode = 'UNKNOWN';

// Detectar tipo de conexão e configurar apropriadamente
if (databaseUrl.includes('pooler.supabase.com')) {
  connectionMode = 'POOLER_MODE';
  console.log('⚠️ URL do Supavisor Pooler detectada');
  console.log('🔍 MODO: Session Mode IPv4-compativel');
  
  // Verificar se o formato do usuario está correto no pooler
  if (databaseUrl.includes('postgres.wudcabcsxmahlufgsyop:')) {
    console.log('✅ Formato correto: postgres.PROJECT_REF:senha');
  } else if (databaseUrl.includes('postgres:')) {
    console.log('⚠️ Formato alternativo: postgres:senha (sem project ref)');
  } else {
    console.log('❌ Formato incorreto detectado na URL do pooler');
  }
} else if (databaseUrl.includes('db.wudcabcsxmahlufgsyop.supabase.co')) {
  connectionMode = 'DIRECT_MODE';
  console.log('📡 URL de conexão direta detectada');
  console.log('🔍 MODO: Conexão direta IPv6 (pode falhar no Railway)');
  console.log('💡 DICA: Se falhar, o problema é IPv6 vs IPv4');
} else {
  connectionMode = 'UNKNOWN_FORMAT';
  console.log('❌ Formato de URL não reconhecido');
}

// Forçar variáveis de ambiente para debug
process.env.DEBUG_CONNECTION_TYPE = connectionMode;
process.env.DEBUG_TEST_STATUS = 'TESTING_CREDENTIALS';

console.log('🧪 TESTE CRÍTICO:', connectionMode);

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
        console.error('💡 === DIAGNÓSTICO DE ERRO SUPABASE ===');
        
        if (connectionMode === 'POOLER_MODE') {
          console.error('🔴 ERRO NO POOLER: Tenant or user not found');
          console.error('🔍 Possíveis causas:');
          console.error('   1. Formato incorreto do usuário (deve ser postgres.PROJECT_REF ou postgres)');
          console.error('   2. Região do pooler incorreta');
          console.error('   3. Credenciais inválidas');
          console.error('💡 SOLUÇÃO: Tentar conexão direta para isolar o problema');
        } else if (connectionMode === 'DIRECT_MODE') {
          console.error('🔴 ERRO NA CONEXÃO DIRETA: Tenant or user not found');
          console.error('🔍 Isso indica problema nas credenciais básicas:');
          console.error('   1. Senha incorreta: ServidorMardecores2025');
          console.error('   2. Usuário incorreto: postgres');
          console.error('   3. Project ID incorreto: wudcabcsxmahlufgsyop');
          console.error('💡 SOLUÇÃO: Verificar credenciais no dashboard Supabase');
        }
        
        console.error('='.repeat(50));
        
        // Se estiver em produção, tentar outras regiões (apenas para pooler)
        if (process.env.NODE_ENV === 'production' && connectionMode === 'POOLER_MODE') {
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



  // Reservation operations
  async getAllReservations(): Promise<Reservation[]> {
    return await db.select().from(schema.reservations).orderBy(schema.reservations.createdAt);
  }

  async getReservation(id: string): Promise<Reservation | undefined> {
    const result = await db.select().from(schema.reservations)
      .where(eq(schema.reservations.id, id));
    return result[0];
  }

  async createReservation(reservation: InsertReservation): Promise<Reservation> {
    const result = await db.insert(schema.reservations).values({
      ...reservation,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateReservation(id: string, reservation: Partial<Reservation>): Promise<Reservation | undefined> {
    const result = await db.update(schema.reservations)
      .set(reservation)
      .where(eq(schema.reservations.id, id))
      .returning();
    return result[0];
  }

  async deleteReservation(id: string): Promise<boolean> {
    console.log('🔍 STORAGE: Tentando deletar reserva com ID:', id);
    const result = await db.delete(schema.reservations)
      .where(eq(schema.reservations.id, id))
      .returning();
    console.log('🔍 STORAGE: Resultado da query delete:', result);
    console.log('🔍 STORAGE: length:', result.length);
    const success = result.length > 0;
    console.log('🔍 STORAGE: Retornando success:', success);
    return success;
  }

  // Product Request operations
  async createProductRequest(productRequest: InsertProductRequest): Promise<ProductRequest> {
    const result = await db.insert(schema.productRequests).values({
      ...productRequest,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async getProductRequests(): Promise<ProductRequest[]> {
    return await db.select().from(schema.productRequests)
      .orderBy(sql`${schema.productRequests.createdAt} DESC`);
  }

  async getProductRequest(id: string): Promise<ProductRequest | undefined> {
    const result = await db.select().from(schema.productRequests)
      .where(eq(schema.productRequests.id, id));
    return result[0];
  }

  async updateProductRequest(id: string, productRequest: Partial<ProductRequest>): Promise<ProductRequest | undefined> {
    const updateData: any = { ...productRequest };
    
    // Se o status for 'contacted', marcar contactedAt
    if (productRequest.status === 'contacted') {
      updateData.contactedAt = new Date();
    }
    
    const result = await db.update(schema.productRequests)
      .set(updateData)
      .where(eq(schema.productRequests.id, id))
      .returning();
    return result[0];
  }

  async deleteProductRequest(id: string): Promise<boolean> {
    const result = await db.delete(schema.productRequests)
      .where(eq(schema.productRequests.id, id))
      .returning();
    return result.length > 0;
  }

  // ================================================================
  // NOVOS MÉTODOS DE BUSCA INTELIGENTE PARA CREDIÁRIO
  // Seguindo especificações da memória: marcas brasileiras preferidas
  // ================================================================

  async searchAvailableProducts(filters: {
    query: string;
    category: string | null;
    brand: string | null;
    minStock: number;
    maxPrice: number | null;
    featured: boolean | null;
  }): Promise<Product[]> {
    try {
      // "A busca de produtos deve retornar apenas itens ativos (active=true) 
      // com estoque disponível (stock > 0)"
      
      let query = db.select().from(schema.products)
        .where(
          and(
            eq(schema.products.active, true),
            gte(schema.products.stock, filters.minStock)
          )
        );

      // Aplicar filtros adicionais
      const conditions = [
        eq(schema.products.active, true),
        gte(schema.products.stock, filters.minStock)
      ];

      // Filtro de texto (nome, descrição, marca)
      if (filters.query) {
        const searchCondition = sql`(
          LOWER(${schema.products.name}) LIKE LOWER(${'%' + filters.query + '%'}) OR 
          LOWER(${schema.products.description}) LIKE LOWER(${'%' + filters.query + '%'}) OR 
          LOWER(${schema.products.brand}) LIKE LOWER(${'%' + filters.query + '%'})
        )`;
        conditions.push(searchCondition);
      }

      // Filtro de categoria
      if (filters.category) {
        conditions.push(eq(schema.products.category, filters.category));
      }

      // Filtro de marca
      if (filters.brand) {
        conditions.push(eq(schema.products.brand, filters.brand));
      }

      // Filtro de preço máximo
      if (filters.maxPrice) {
        conditions.push(sql`CAST(${schema.products.price} AS DECIMAL) <= ${filters.maxPrice}`);
      }

      // Filtro de destaque
      if (filters.featured !== null) {
        conditions.push(eq(schema.products.featured, filters.featured));
      }

      const result = await db.select().from(schema.products)
        .where(and(...conditions))
        .orderBy(
          schema.products.featured, // Destacados primeiro
          schema.products.name
        )
        .limit(50);

      return result;
    } catch (error) {
      console.error('❌ Erro na busca inteligente de produtos:', error);
      throw error;
    }
  }

  async advancedProductSearch(params: {
    query: string;
    categories: string[];
    brands: string[];
    priceMin: number | null;
    priceMax: number | null;
    activeOnly: boolean;
    stockOnly: boolean;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    limit: number;
  }): Promise<Product[]> {
    try {
      const conditions = [];

      // Filtro de ativo
      if (params.activeOnly) {
        conditions.push(eq(schema.products.active, true));
      }

      // Filtro de estoque
      if (params.stockOnly) {
        conditions.push(sql`${schema.products.stock} > 0`);
      }

      // Busca por texto
      if (params.query) {
        const searchCondition = sql`(
          LOWER(${schema.products.name}) LIKE LOWER(${'%' + params.query + '%'}) OR 
          LOWER(${schema.products.description}) LIKE LOWER(${'%' + params.query + '%'}) OR 
          LOWER(${schema.products.brand}) LIKE LOWER(${'%' + params.query + '%'}) OR
          LOWER(${schema.products.category}) LIKE LOWER(${'%' + params.query + '%'})
        )`;
        conditions.push(searchCondition);
      }

      // Filtro de categorias
      if (params.categories.length > 0) {
        const categoryCondition = sql`${schema.products.category} IN (${sql.join(params.categories.map(c => sql`${c}`), sql`, `)})`;
        conditions.push(categoryCondition);
      }

      // Filtro de marcas
      if (params.brands.length > 0) {
        const brandCondition = sql`${schema.products.brand} IN (${sql.join(params.brands.map(b => sql`${b}`), sql`, `)})`;
        conditions.push(brandCondition);
      }

      // Filtro de preço mínimo
      if (params.priceMin) {
        conditions.push(sql`CAST(${schema.products.price} AS DECIMAL) >= ${params.priceMin}`);
      }

      // Filtro de preço máximo
      if (params.priceMax) {
        conditions.push(sql`CAST(${schema.products.price} AS DECIMAL) <= ${params.priceMax}`);
      }

      // Ordenação dinâmica
      let orderBy;
      switch (params.sortBy) {
        case 'price':
          orderBy = params.sortOrder === 'desc' ? 
            sql`CAST(${schema.products.price} AS DECIMAL) DESC` : 
            sql`CAST(${schema.products.price} AS DECIMAL) ASC`;
          break;
        case 'stock':
          orderBy = params.sortOrder === 'desc' ? 
            sql`${schema.products.stock} DESC` : 
            sql`${schema.products.stock} ASC`;
          break;
        case 'created':
          orderBy = params.sortOrder === 'desc' ? 
            sql`${schema.products.createdAt} DESC` : 
            sql`${schema.products.createdAt} ASC`;
          break;
        case 'name':
        default:
          orderBy = params.sortOrder === 'desc' ? 
            sql`${schema.products.name} DESC` : 
            sql`${schema.products.name} ASC`;
          break;
      }

      const result = await db.select().from(schema.products)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(orderBy)
        .limit(params.limit);

      return result;
    } catch (error) {
      console.error('❌ Erro na busca avançada de produtos:', error);
      throw error;
    }
  }

  // ================================================================
  // OPERAÇÕES DE CLIENTES PARA CREDIÁRIO
  // ================================================================

  async getAllCustomers(): Promise<Customer[]> {
    try {
      return await db.select().from(schema.customers)
        .orderBy(schema.customers.createdAt);
    } catch (error) {
      console.error('❌ Erro ao buscar clientes:', error);
      throw error;
    }
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    try {
      const result = await db.select().from(schema.customers)
        .where(eq(schema.customers.id, id))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao buscar cliente:', error);
      throw error;
    }
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    try {
      const result = await db.select().from(schema.customers)
        .where(eq(schema.customers.email, email))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao buscar cliente por email:', error);
      throw error;
    }
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    try {
      const searchCondition = sql`(
        LOWER(${schema.customers.name}) LIKE LOWER(${'%' + query + '%'}) OR 
        LOWER(${schema.customers.email}) LIKE LOWER(${'%' + query + '%'}) OR
        ${schema.customers.phone} LIKE ${'%' + query + '%'} OR
        ${schema.customers.cpf} LIKE ${'%' + query + '%'}
      )`;
      
      return await db.select().from(schema.customers)
        .where(searchCondition)
        .orderBy(schema.customers.name)
        .limit(20);
    } catch (error) {
      console.error('❌ Erro na busca de clientes:', error);
      throw error;
    }
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    try {
      const result = await db.insert(schema.customers).values({
        ...customer,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao criar cliente:', error);
      throw error;
    }
  }

  async updateCustomer(id: string, customer: Partial<Customer>): Promise<Customer | undefined> {
    try {
      const result = await db.update(schema.customers)
        .set({ ...customer, updatedAt: new Date() })
        .where(eq(schema.customers.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao atualizar cliente:', error);
      throw error;
    }
  }

  async deleteCustomer(id: string): Promise<boolean> {
    try {
      const result = await db.delete(schema.customers)
        .where(eq(schema.customers.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('❌ Erro ao deletar cliente:', error);
      throw error;
    }
  }

  // Customer Address operations
  async getCustomerAddresses(customerId: string): Promise<CustomerAddress[]> {
    try {
      return await db.select().from(schema.customerAddresses)
        .where(eq(schema.customerAddresses.customerId, customerId))
        .orderBy(schema.customerAddresses.isDefault, schema.customerAddresses.createdAt);
    } catch (error) {
      console.error('❌ Erro ao buscar endereços do cliente:', error);
      throw error;
    }
  }

  async createCustomerAddress(address: InsertCustomerAddress): Promise<CustomerAddress> {
    try {
      const result = await db.insert(schema.customerAddresses).values({
        ...address,
        createdAt: new Date(),
      }).returning();
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao criar endereço:', error);
      throw error;
    }
  }

  async updateCustomerAddress(id: string, address: Partial<CustomerAddress>): Promise<CustomerAddress | undefined> {
    try {
      const result = await db.update(schema.customerAddresses)
        .set(address)
        .where(eq(schema.customerAddresses.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao atualizar endereço:', error);
      throw error;
    }
  }

  async deleteCustomerAddress(id: string): Promise<boolean> {
    try {
      const result = await db.delete(schema.customerAddresses)
        .where(eq(schema.customerAddresses.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('❌ Erro ao deletar endereço:', error);
      throw error;
    }
  }

  // ================================================================
  // OPERAÇÕES DE CONTAS DE CREDIÁRIO
  // ================================================================

  async getAllCreditAccounts(): Promise<CreditAccount[]> {
    try {
      return await db.select().from(schema.creditAccounts)
        .orderBy(schema.creditAccounts.createdAt);
    } catch (error) {
      console.error('❌ Erro ao buscar contas de crediário:', error);
      throw error;
    }
  }

  async getCreditAccount(id: string): Promise<CreditAccount | undefined> {
    try {
      const result = await db.select().from(schema.creditAccounts)
        .where(eq(schema.creditAccounts.id, id))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao buscar conta de crediário:', error);
      throw error;
    }
  }

  async getCreditAccountsByCustomer(customerId: string): Promise<CreditAccount[]> {
    try {
      return await db.select().from(schema.creditAccounts)
        .where(eq(schema.creditAccounts.customerId, customerId))
        .orderBy(schema.creditAccounts.createdAt);
    } catch (error) {
      console.error('❌ Erro ao buscar contas do cliente:', error);
      throw error;
    }
  }

  async createCreditAccount(account: InsertCreditAccount): Promise<CreditAccount> {
    try {
      const result = await db.insert(schema.creditAccounts).values({
        ...account,
        createdAt: new Date(),
      }).returning();
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao criar conta de crediário:', error);
      throw error;
    }
  }

  async updateCreditAccount(id: string, account: Partial<CreditAccount>): Promise<CreditAccount | undefined> {
    try {
      const result = await db.update(schema.creditAccounts)
        .set(account)
        .where(eq(schema.creditAccounts.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao atualizar conta de crediário:', error);
      throw error;
    }
  }

  async deleteCreditAccount(id: string): Promise<boolean> {
    try {
      const result = await db.delete(schema.creditAccounts)
        .where(eq(schema.creditAccounts.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('❌ Erro ao deletar conta de crediário:', error);
      throw error;
    }
  }

  // Credit Payment operations
  async getCreditPayments(creditAccountId: string): Promise<CreditPayment[]> {
    try {
      return await db.select().from(schema.creditPayments)
        .where(eq(schema.creditPayments.creditAccountId, creditAccountId))
        .orderBy(schema.creditPayments.createdAt);
    } catch (error) {
      console.error('❌ Erro ao buscar pagamentos:', error);
      throw error;
    }
  }

  async createCreditPayment(payment: InsertCreditPayment): Promise<CreditPayment> {
    try {
      const result = await db.insert(schema.creditPayments).values({
        ...payment,
        createdAt: new Date(),
      }).returning();
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao criar pagamento:', error);
      throw error;
    }
  }

  async updateCreditPayment(id: string, payment: Partial<CreditPayment>): Promise<CreditPayment | undefined> {
    try {
      const result = await db.update(schema.creditPayments)
        .set(payment)
        .where(eq(schema.creditPayments.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao atualizar pagamento:', error);
      throw error;
    }
  }

  async deleteCreditPayment(id: string): Promise<boolean> {
    try {
      const result = await db.delete(schema.creditPayments)
        .where(eq(schema.creditPayments.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('❌ Erro ao deletar pagamento:', error);
      throw error;
    }
  }

  // Métodos adicionais da interface IStorage que estavam faltando
  async getCreditPaymentsByAccount(accountId: string): Promise<CreditPayment[]> {
    return this.getCreditPayments(accountId);
  }

  async getCreditPayment(id: string): Promise<CreditPayment | undefined> {
    try {
      const result = await db.select().from(schema.creditPayments)
        .where(eq(schema.creditPayments.id, id))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao buscar pagamento:', error);
      throw error;
    }
  }

  async getCreditPaymentsReport(filters: {
    startDate?: Date;
    endDate?: Date;
    customerId?: string;
    accountId?: string;
  }): Promise<CreditPayment[]> {
    try {
      // Implementação simples por enquanto
      return await this.getCreditPayments(filters.accountId || '');
    } catch (error) {
      console.error('❌ Erro ao gerar relatório de pagamentos:', error);
      throw error;
    }
  }

  // Credit Account Item operations
  async getCreditAccountItems(creditAccountId: string): Promise<CreditAccountItem[]> {
    try {
      return await db.select().from(schema.creditAccountItems)
        .where(eq(schema.creditAccountItems.creditAccountId, creditAccountId))
        .orderBy(schema.creditAccountItems.createdAt);
    } catch (error) {
      console.error('❌ Erro ao buscar itens da conta:', error);
      throw error;
    }
  }

  async createCreditAccountItem(item: InsertCreditAccountItem): Promise<CreditAccountItem> {
    try {
      const result = await db.insert(schema.creditAccountItems).values({
        ...item,
        createdAt: new Date(),
      }).returning();
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao criar item da conta:', error);
      throw error;
    }
  }

  async updateCreditAccountItem(id: string, item: Partial<CreditAccountItem>): Promise<CreditAccountItem | undefined> {
    try {
      const result = await db.update(schema.creditAccountItems)
        .set(item)
        .where(eq(schema.creditAccountItems.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao atualizar item da conta:', error);
      throw error;
    }
  }

  async deleteCreditAccountItem(id: string): Promise<boolean> {
    try {
      const result = await db.delete(schema.creditAccountItems)
        .where(eq(schema.creditAccountItems.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('❌ Erro ao deletar item da conta:', error);
      throw error;
    }
  }

  // ================================================================
  // OPERAÇÕES DE PEDIDOS - NOVO SISTEMA
  // ================================================================

  async getAllOrders(): Promise<Order[]> {
    try {
      console.log('🛒 STORAGE: Buscando todos os pedidos');
      return await db.select().from(schema.orders)
        .orderBy(sql`${schema.orders.createdAt} DESC`);
    } catch (error) {
      console.error('❌ Erro ao buscar pedidos:', error);
      throw error;
    }
  }

  async getOrder(id: string): Promise<Order | undefined> {
    try {
      console.log('🛒 STORAGE: Buscando pedido:', id);
      const result = await db.select().from(schema.orders)
        .where(eq(schema.orders.id, id))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao buscar pedido:', error);
      throw error;
    }
  }

  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    try {
      console.log('🛒 STORAGE: Buscando pedidos do cliente:', customerId);
      return await db.select().from(schema.orders)
        .where(eq(schema.orders.customerId, customerId))
        .orderBy(sql`${schema.orders.createdAt} DESC`);
    } catch (error) {
      console.error('❌ Erro ao buscar pedidos do cliente:', error);
      throw error;
    }
  }

  async createOrder(orderData: InsertOrder): Promise<Order> {
    try {
      console.log('🛒 STORAGE: Criando novo pedido:', orderData);
      
      // Gerar número do pedido se não fornecido
      const orderNumber = orderData.orderNumber || await this.generateOrderNumber();
      
      const result = await db.insert(schema.orders).values({
        ...orderData,
        orderNumber,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      console.log('✅ STORAGE: Pedido criado com sucesso:', result[0].orderNumber);
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao criar pedido:', error);
      throw error;
    }
  }

  async updateOrder(id: string, orderData: Partial<Order>): Promise<Order | undefined> {
    try {
      console.log('🛒 STORAGE: Atualizando pedido:', id);
      const result = await db.update(schema.orders)
        .set({
          ...orderData,
          updatedAt: new Date(),
        })
        .where(eq(schema.orders.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao atualizar pedido:', error);
      throw error;
    }
  }

  async deleteOrder(id: string): Promise<boolean> {
    try {
      console.log('🛒 STORAGE: Deletando pedido:', id);
      
      // Primeiro deletar itens do pedido
      await db.delete(schema.orderItems)
        .where(eq(schema.orderItems.orderId, id));
      
      // Depois deletar o pedido
      const result = await db.delete(schema.orders)
        .where(eq(schema.orders.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error('❌ Erro ao deletar pedido:', error);
      throw error;
    }
  }

  async getOrdersReport(filters: {
    startDate?: Date;
    endDate?: Date;
    customerId?: string;
    status?: string;
    paymentType?: string;
  }): Promise<Order[]> {
    try {
      // Usar uma abordagem mais simples para evitar problemas de tipo do Drizzle
      let queryConditions = '';
      const queryParams: any[] = [];
      
      if (filters.customerId) {
        queryConditions += ' WHERE customer_id = $1';
        queryParams.push(filters.customerId);
      }
      
      if (filters.status) {
        queryConditions += queryConditions ? ' AND' : ' WHERE';
        queryConditions += ` status = $${queryParams.length + 1}`;
        queryParams.push(filters.status);
      }
      
      if (filters.paymentType) {
        queryConditions += queryConditions ? ' AND' : ' WHERE';
        queryConditions += ` payment_method = $${queryParams.length + 1}`;
        queryParams.push(filters.paymentType);
      }
      
      if (filters.startDate) {
        queryConditions += queryConditions ? ' AND' : ' WHERE';
        queryConditions += ` created_at >= $${queryParams.length + 1}`;
        queryParams.push(filters.startDate);
      }
      
      if (filters.endDate) {
        queryConditions += queryConditions ? ' AND' : ' WHERE';
        queryConditions += ` created_at <= $${queryParams.length + 1}`;
        queryParams.push(filters.endDate);
      }
      
      const result = await client`
        SELECT * FROM orders 
        ${queryConditions ? sql.raw(queryConditions) : sql``}
        ORDER BY created_at DESC
      `;
      
      return result as Order[];
    } catch (error) {
      console.error('❌ Erro ao gerar relatório de pedidos:', error);
      throw error;
    }
  }

  // Order Items operations
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    try {
      return await db.select().from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, orderId));
    } catch (error) {
      console.error('❌ Erro ao buscar itens do pedido:', error);
      throw error;
    }
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    try {
      const result = await db.insert(schema.orderItems).values(item).returning();
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao criar item do pedido:', error);
      throw error;
    }
  }

  async createOrderWithItems(orderData: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    try {
      console.log('🛒 STORAGE: Criando pedido com itens:', { orderData, items: items.length });
      
      // Criar o pedido
      const order = await this.createOrder(orderData);
      
      // Criar os itens do pedido
      if (items.length > 0) {
        const itemsWithOrderId = items.map(item => ({
          ...item,
          orderId: order.id,
        }));
        
        await db.insert(schema.orderItems).values(itemsWithOrderId);
        console.log('✅ STORAGE: Itens do pedido criados:', items.length);
      }
      
      return order;
    } catch (error) {
      console.error('❌ Erro ao criar pedido com itens:', error);
      throw error;
    }
  }

  // Order utilities
  async generateOrderNumber(): Promise<string> {
    try {
      // Buscar o último pedido para gerar próximo número
      const lastOrder = await db.select({ orderNumber: schema.orders.orderNumber })
        .from(schema.orders)
        .where(sql`${schema.orders.orderNumber} LIKE 'PED%'`)
        .orderBy(sql`${schema.orders.createdAt} DESC`)
        .limit(1);
      
      let nextNumber = 1;
      
      if (lastOrder.length > 0 && lastOrder[0].orderNumber) {
        const currentNumber = parseInt(lastOrder[0].orderNumber.replace('PED', ''));
        if (!isNaN(currentNumber)) {
          nextNumber = currentNumber + 1;
        }
      }
      
      const paddedNumber = nextNumber.toString().padStart(3, '0');
      return `PED${paddedNumber}`;
    } catch (error) {
      console.error('❌ Erro ao gerar número do pedido:', error);
      // Fallback: usar timestamp
      return `PED${Date.now().toString().slice(-6)}`;
    }
  }

  async calculateOrderTotal(orderId: string): Promise<number> {
    try {
      const items = await this.getOrderItems(orderId);
      return items.reduce((total, item) => {
        return total + parseFloat(item.totalPrice.toString());
      }, 0);
    } catch (error) {
      console.error('❌ Erro ao calcular total do pedido:', error);
      return 0;
    }
  }

  // Métodos adicionais de OrderItem que estavam faltando
  async updateOrderItem(id: string, item: Partial<OrderItem>): Promise<OrderItem | undefined> {
    try {
      const result = await db.update(schema.orderItems)
        .set(item)
        .where(eq(schema.orderItems.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao atualizar item do pedido:', error);
      throw error;
    }
  }

  async deleteOrderItem(id: string): Promise<boolean> {
    try {
      const result = await db.delete(schema.orderItems)
        .where(eq(schema.orderItems.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('❌ Erro ao deletar item do pedido:', error);
      throw error;
    }
  }

  // ================================================================
  // OPERAÇÕES DE AVALIAÇÕES DE PRODUTOS
  // ================================================================

  async getAllProductReviews(): Promise<any[]> {
    try {
      return await db.select({
        id: schema.productReviews.id,
        productId: schema.productReviews.productId,
        customerId: schema.productReviews.customerId,
        orderId: schema.productReviews.orderId,
        rating: schema.productReviews.rating,
        title: schema.productReviews.title,
        comment: schema.productReviews.comment,
        isVerifiedPurchase: schema.productReviews.isVerifiedPurchase,
        isApproved: schema.productReviews.isApproved,
        createdAt: schema.productReviews.createdAt,
        // Join com customer para pegar nome
        customerName: schema.customers.name,
        customerEmail: schema.customers.email,
        // Join com product para pegar nome do produto
        productName: schema.products.name,
      })
      .from(schema.productReviews)
      .leftJoin(schema.customers, eq(schema.productReviews.customerId, schema.customers.id))
      .leftJoin(schema.products, eq(schema.productReviews.productId, schema.products.id))
      .orderBy(sql`${schema.productReviews.createdAt} DESC`);
    } catch (error) {
      console.error('❌ Erro ao buscar todas as avaliações:', error);
      throw error;
    }
  }

  async getProductReviews(productId: string): Promise<any[]> {
    try {
      return await db.select({
        id: schema.productReviews.id,
        productId: schema.productReviews.productId,
        customerId: schema.productReviews.customerId,
        orderId: schema.productReviews.orderId,
        rating: schema.productReviews.rating,
        title: schema.productReviews.title,
        comment: schema.productReviews.comment,
        isVerifiedPurchase: schema.productReviews.isVerifiedPurchase,
        isApproved: schema.productReviews.isApproved,
        createdAt: schema.productReviews.createdAt,
        // Join com customer para pegar nome
        customerName: schema.customers.name,
        customerEmail: schema.customers.email,
      })
      .from(schema.productReviews)
      .leftJoin(schema.customers, eq(schema.productReviews.customerId, schema.customers.id))
      .where(and(
        eq(schema.productReviews.productId, productId),
        eq(schema.productReviews.isApproved, true)
      ))
      .orderBy(sql`${schema.productReviews.createdAt} DESC`);
    } catch (error) {
      console.error('❌ Erro ao buscar avaliações do produto:', error);
      throw error;
    }
  }

  async createProductReview(review: any): Promise<any> {
    try {
      const result = await db.insert(schema.productReviews).values({
        ...review,
        createdAt: new Date(),
      }).returning();
      
      // Após criar a review, atualizar os campos rating e reviewCount do produto
      await this.updateProductRatingAndCount(review.productId);
      
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao criar avaliação:', error);
      throw error;
    }
  }

  async updateProductReview(id: string, review: any): Promise<any> {
    try {
      const result = await db.update(schema.productReviews)
        .set(review)
        .where(eq(schema.productReviews.id, id))
        .returning();
      
      // Se existe resultado, atualizar rating do produto
      if (result.length > 0) {
        await this.updateProductRatingAndCount(result[0].productId);
      }
      
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao atualizar avaliação:', error);
      throw error;
    }
  }

  async deleteProductReview(id: string): Promise<boolean> {
    try {
      // Primeiro buscar o productId antes de deletar
      const reviewToDelete = await db.select({ productId: schema.productReviews.productId })
        .from(schema.productReviews)
        .where(eq(schema.productReviews.id, id))
        .limit(1);
      
      const result = await db.delete(schema.productReviews)
        .where(eq(schema.productReviews.id, id))
        .returning();
      
      // Se deletou com sucesso, atualizar rating do produto
      if (result.length > 0 && reviewToDelete.length > 0) {
        await this.updateProductRatingAndCount(reviewToDelete[0].productId);
      }
      
      return result.length > 0;
    } catch (error) {
      console.error('❌ Erro ao deletar avaliação:', error);
      throw error;
    }
  }

  async getProductReview(id: string): Promise<any> {
    try {
      const result = await db.select({
        id: schema.productReviews.id,
        productId: schema.productReviews.productId,
        customerId: schema.productReviews.customerId,
        orderId: schema.productReviews.orderId,
        rating: schema.productReviews.rating,
        title: schema.productReviews.title,
        comment: schema.productReviews.comment,
        isVerifiedPurchase: schema.productReviews.isVerifiedPurchase,
        isApproved: schema.productReviews.isApproved,
        createdAt: schema.productReviews.createdAt,
        // Join com customer para pegar nome
        customerName: schema.customers.name,
        customerEmail: schema.customers.email,
        // Join com product para pegar nome do produto
        productName: schema.products.name,
      })
      .from(schema.productReviews)
      .leftJoin(schema.customers, eq(schema.productReviews.customerId, schema.customers.id))
      .leftJoin(schema.products, eq(schema.productReviews.productId, schema.products.id))
      .where(eq(schema.productReviews.id, id))
      .limit(1);
      
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao buscar avaliação:', error);
      throw error;
    }
  }

  // Método auxiliar para atualizar rating e reviewCount do produto automaticamente
  private async updateProductRatingAndCount(productId: string): Promise<void> {
    try {
      // Buscar todas as avaliações aprovadas do produto
      const reviews = await db.select({
        rating: schema.productReviews.rating
      })
      .from(schema.productReviews)
      .where(and(
        eq(schema.productReviews.productId, productId),
        eq(schema.productReviews.isApproved, true)
      ));
      
      let averageRating = 0;
      const reviewCount = reviews.length;
      
      if (reviewCount > 0) {
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        averageRating = Math.round((totalRating / reviewCount) * 10) / 10; // Arredondar para 1 casa decimal
      }
      
      // Atualizar o produto com os novos valores
      await db.update(schema.products)
        .set({
          rating: averageRating.toString(),
          reviewCount: reviewCount,
          updatedAt: new Date()
        })
        .where(eq(schema.products.id, productId));
      
      console.log(`✅ Rating atualizado para produto ${productId}: ${averageRating} (${reviewCount} avaliações)`);
    } catch (error) {
      console.error('❌ Erro ao atualizar rating do produto:', error);
      throw error;
    }
  }
}