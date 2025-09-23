import { createClient } from '@supabase/supabase-js';
// Arquivo: supabase-storage.ts - Sistema de conexão inteligente com diagnóstico
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';
import * as dns from 'dns';
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

// Forçar IPv4 no DNS resolver do Node.js para Railway
if (process.env.NODE_ENV === 'production') {
  // Configurar DNS para IPv4 em múltiplas camadas
  dns.setDefaultResultOrder('ipv4first');
  
  // Forçar IPv4 no process.env para garantir que seja aplicado
  process.env.UV_USE_IO_URING = '0'; // Desabilitar io_uring que pode causar problemas IPv6
  process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --dns-result-order=ipv4first';
  
  console.log('📡 DNS configurado para IPv4 first no Railway');
  console.log('🔧 Configurações avançadas de rede aplicadas');
}

// Sistema de monitoramento e diagnóstico de erros Supabase
class SupabaseErrorDiagnostics {
  static analyzeError(error: any, context: string): void {
    console.log(`\n🔍 === DIAGNÓSTICO DE ERRO SUPABASE === [${context}]`);
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📍 Contexto:', context);
    
    if (error) {
      console.log('❌ Tipo de erro:', error.constructor.name);
      console.log('📝 Mensagem:', error.message);
      console.log('🔢 Código:', error.code || 'N/A');
      console.log('🌐 Errno:', error.errno || 'N/A');
      console.log('🎯 Syscall:', error.syscall || 'N/A');
      
      // Análise específica de erros de rede
      if (error.address) {
        console.log('🏠 Endereço:', error.address);
        console.log('🚪 Porta:', error.port || 'N/A');
        
        // Detectar tipo de IP
        const isIPv6 = error.address.includes(':') && error.address.includes('::') || error.address.match(/^[0-9a-f:]+$/i);
        const isIPv4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(error.address);
        
        console.log('🔗 Tipo de IP:', isIPv6 ? 'IPv6 ❌' : isIPv4 ? 'IPv4 ✅' : 'Hostname');
      }
      
      // Análise específica de códigos de erro
      switch (error.code) {
        case 'ENETUNREACH':
          console.log('🚫 DIAGNÓSTICO: Rede inalcançável - problemas de roteamento IPv6');
          console.log('💡 SOLUÇÃO: Forçar IPv4 ou usar IP direto');
          break;
        case 'ECONNREFUSED':
          console.log('🚫 DIAGNÓSTICO: Conexão recusada - serviço pode estar indisponível');
          console.log('💡 SOLUÇÃO: Verificar status do Supabase e credenciais');
          break;
        case 'ETIMEDOUT':
        case 'CONNECT_TIMEOUT':
          console.log('🚫 DIAGNÓSTICO: Timeout de conexão - latência alta ou firewall');
          console.log('💡 SOLUÇÃO: Reduzir timeout ou usar pooler');
          break;
        case 'ENOTFOUND':
          console.log('🚫 DIAGNÓSTICO: DNS não resolveu - problema de resolução de nome');
          console.log('💡 SOLUÇÃO: Usar IP direto ou verificar DNS');
          break;
        case 'ECONNRESET':
          console.log('🚫 DIAGNÓSTICO: Conexão resetada - problema de rede intermitente');
          console.log('💡 SOLUÇÃO: Implementar retry com backoff');
          break;
        default:
          console.log('🔍 DIAGNÓSTICO: Erro não catalogado - análise manual necessária');
      }
      
      // Stack trace limitado
      if (error.stack) {
        const stackLines = error.stack.split('\n').slice(0, 5);
        console.log('📚 Stack trace (top 5):');
        stackLines.forEach((line: string, i: number) => console.log(`   ${i + 1}. ${line.trim()}`));
      }
    }
    
    console.log('🔍 === FIM DO DIAGNÓSTICO ===\n');
  }
  
  static logConnectionAttempt(config: any): void {
    console.log(`\n📊 === TENTATIVA DE CONEXÃO === [${config.name}]`);
    console.log('🎯 Estratégia:', config.name);
    console.log('🌐 URL:', config.url.replace(/:([^:@]+)@/, ':***@'));
    console.log('⏱️ Connect timeout:', config.options.connect_timeout + 's');
    console.log('🔒 SSL:', config.options.ssl ? 'Habilitado' : 'Desabilitado');
    console.log('👥 Max connections:', config.options.max);
    console.log('📡 Family (IP):', config.options.family === 4 ? 'IPv4' : config.options.family === 6 ? 'IPv6' : 'Auto');
    console.log('📊 === INICIANDO CONEXÃO ===\n');
  }
  
  static logConnectionSuccess(config: any, duration: number): void {
    console.log(`\n✅ === CONEXÃO BEM-SUCEDIDA === [${config.name}]`);
    console.log('⚡ Duração:', duration + 'ms');
    console.log('🎯 Estratégia vitoriosa:', config.name);
    console.log('✅ === CONEXÃO ESTABELECIDA ===\n');
  }
}

// Configuração do Drizzle com PostgreSQL - sistema de fallback múltiplo
// Usando Supavisor (novo pooler do Supabase) com modos session e transaction
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
console.log('   📡 Estratégia: Hostnames DNS oficiais (IPs podem mudar)');
console.log('   🔒 SSL: Obrigatório conforme diretrizes do Supabase');
console.log('   🎯 Prioridade: Pgbouncer Pooler (porta 6543) > Conexão Direta (porta 5432)');

// SOLUÇÃO AVANÇADA: URLs de fallback com Supavisor para Railway
// Session Mode (porta 5432): Conexões persistentes, ideal para aplicações web
// Transaction Mode (porta 6543): Conexões transientes, ideal para serverless
let connectionConfigs: { name: string; url: string; options: any }[] = [];

if (process.env.NODE_ENV === 'production') {
  console.log('🔧 Configurando estratégias seguindo as melhores práticas oficiais do Supabase...');
  console.log('⚠️ IMPORTANTE: Usando apenas hostnames DNS oficiais (IPs podem mudar sem aviso)');
  
  // Estratégia 1: Pgbouncer Pooler (recomendado pelo Supabase) - porta 6543
  connectionConfigs.push({
    name: 'Supabase Pgbouncer Pooler (Recomendado)',
    url: 'postgresql://postgres.wudcabcsxmahlufgsyop:ServidorMardecores2025@db.wudcabcsxmahlufgsyop.supabase.co:6543/postgres?sslmode=require',
    options: {
      max: 5, // Pooler suporta mais conexões
      idle_timeout: 30,
      connect_timeout: 20, // Timeout mais generoso para rede com latência
      socket_timeout: 30000,
      ssl: 'require', // SSL obrigatório conforme Supabase
      family: 4,
      hints: 0x04,
      keepAlive: true,
    }
  });
  
  // Estratégia 2: Conexão direta (fallback) - porta 5432
  connectionConfigs.push({
    name: 'Supabase Conexão Direta',
    url: 'postgresql://postgres:ServidorMardecores2025@db.wudcabcsxmahlufgsyop.supabase.co:5432/postgres?sslmode=require',
    options: {
      max: 1, // Conexão direta - menos escalável
      idle_timeout: 25,
      connect_timeout: 20,
      socket_timeout: 25000,
      ssl: 'require', // SSL obrigatório
      family: 4,
      hints: 0x04,
      keepAlive: true,
    }
  });
  
  // Estratégia 3: Supavisor Session Mode (nova geração de pooler)
  connectionConfigs.push({
    name: 'Supavisor Session Mode',
    url: 'postgresql://postgres.wudcabcsxmahlufgsyop:ServidorMardecores2025@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require',
    options: {
      max: 5,
      idle_timeout: 30,
      connect_timeout: 25,
      socket_timeout: 35000,
      ssl: 'require',
      family: 4,
      hints: 0x04,
      keepAlive: true,
    }
  });
  
  // Estratégia 4: Supavisor Transaction Mode
  connectionConfigs.push({
    name: 'Supavisor Transaction Mode',
    url: 'postgresql://postgres.wudcabcsxmahlufgsyop:ServidorMardecores2025@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require',
    options: {
      max: 1,
      idle_timeout: 15,
      connect_timeout: 20,
      socket_timeout: 20000,
      ssl: 'require',
      family: 4,
      hints: 0x04,
      keepAlive: false, // Transaction mode é mais efêmero
    }
  });
  
} else {
  // Development: usar configuração simples mas ainda com SSL
  connectionConfigs.push({
    name: 'Development',
    url: databaseUrl + '?sslmode=require',
    options: {
      max: 5,
      ssl: 'require' // SSL sempre necessário mesmo em dev
    }
  });
}

// Sistema de conexão inteligente com diagnóstico avançado
class SmartConnection {
  private activeConnection: { client: any; db: any; name: string; config: any } | null = null;
  private connectionHistory: { name: string; success: boolean; error?: string; timestamp: Date }[] = [];
  
  async getConnection(): Promise<{ client: any; db: any; name: string }> {
    // Se já temos uma conexão ativa, tentar usá-la
    if (this.activeConnection) {
      try {
        console.log(`🔄 Testando conexão ativa: ${this.activeConnection.name}`);
        const testStart = Date.now();
        await this.activeConnection.client`SELECT 1`;
        const testDuration = Date.now() - testStart;
        console.log(`✅ Conexão ativa OK (${testDuration}ms)`);
        return this.activeConnection;
      } catch (error: any) {
        console.log(`⚠️ Conexão ${this.activeConnection.name} falhou, invalidando...`);
        SupabaseErrorDiagnostics.analyzeError(error, `Teste de conexão ativa - ${this.activeConnection.name}`);
        this.activeConnection = null;
      }
    }
    
    // Mostrar histórico de tentativas anteriores
    if (this.connectionHistory.length > 0) {
      console.log('\n📈 Histórico de conexões anteriores:');
      this.connectionHistory.slice(-3).forEach((attempt, i) => {
        const status = attempt.success ? '✅' : '❌';
        const timeAgo = Math.round((Date.now() - attempt.timestamp.getTime()) / 1000);
        console.log(`   ${status} ${attempt.name} (${timeAgo}s atrás)`);
      });
      console.log('');
    }
    
    // Tentar cada configuração em sequência com diagnóstico avançado
    for (let configIndex = 0; configIndex < connectionConfigs.length; configIndex++) {
      const config = connectionConfigs[configIndex];
      const attemptStart = Date.now();
      
      try {
        SupabaseErrorDiagnostics.logConnectionAttempt(config);
        console.log(`🔢 Tentativa ${configIndex + 1}/${connectionConfigs.length}`);
        
        const client = postgres(config.url, config.options);
        const db = drizzle(client, { schema });
        
        // Teste de conectividade avançado com timeout personalizado
        console.log('🔍 Executando teste de conectividade avançado...');
        const testPromise = client`
          SELECT 
            1 as test, 
            current_database() as db, 
            version() as version,
            current_user as user,
            inet_server_addr() as server_ip,
            current_timestamp as server_time
        `;
        
        const timeoutDuration = config.options.connect_timeout * 1000 + 2000; // +2s buffer
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout em ${config.name} após ${timeoutDuration/1000} segundos`)), timeoutDuration)
        );
        
        const result = await Promise.race([testPromise, timeoutPromise]) as any;
        const duration = Date.now() - attemptStart;
        
        // Log de sucesso detalhado
        SupabaseErrorDiagnostics.logConnectionSuccess(config, duration);
        console.log('📊 Detalhes da conexão bem-sucedida:');
        console.log('   Database:', result[0]?.db || 'N/A');
        console.log('   Versão PostgreSQL:', result[0]?.version?.split(' ')[0] || 'N/A');
        console.log('   Usuário:', result[0]?.user || 'N/A');
        console.log('   IP do servidor:', result[0]?.server_ip || 'N/A');
        console.log('   Hora do servidor:', result[0]?.server_time || 'N/A');
        
        // Salvar conexão ativa e histórico
        this.activeConnection = { client, db, name: config.name, config };
        this.connectionHistory.push({
          name: config.name,
          success: true,
          timestamp: new Date()
        });
        
        console.log(`✅ SUCESSO: Conectado via ${config.name} em ${duration}ms`);
        return this.activeConnection;
        
      } catch (error: any) {
        const duration = Date.now() - attemptStart;
        
        // Diagnóstico detalhado do erro
        console.log(`❌ ${config.name} falhou após ${duration}ms`);
        SupabaseErrorDiagnostics.analyzeError(error, `Tentativa ${configIndex + 1}/${connectionConfigs.length} - ${config.name}`);
        
        // Salvar no histórico
        this.connectionHistory.push({
          name: config.name,
          success: false,
          error: error.message,
          timestamp: new Date()
        });
        
        // Se não é a última tentativa, aguardar um pouco antes da próxima
        if (configIndex < connectionConfigs.length - 1) {
          const delay = Math.min(1000 + (configIndex * 500), 3000); // Máx 3s
          console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        continue;
      }
    }
    
    // Se chegou aqui, todas as tentativas falharam
    console.log('\n🚨 === TODAS AS ESTRATÉGIAS FALHARAM ===');
    console.log('📊 Resumo das tentativas:');
    this.connectionHistory.slice(-connectionConfigs.length).forEach(attempt => {
      const status = attempt.success ? '✅' : '❌';
      console.log(`   ${status} ${attempt.name}: ${attempt.error || 'OK'}`);
    });
    
    console.log('\n💡 Recomendações:');
    console.log('   1. Verificar status do Supabase: https://status.supabase.com');
    console.log('   2. Testar conectividade local com mesmo banco');
    console.log('   3. Verificar firewall/proxy do Railway');
    console.log('   4. Considerar usar Supabase Edge Functions');
    
    throw new Error('❌ Todas as estratégias de conexão falharam - veja diagnósticos acima');
  }
  
  getConnectionStats() {
    const total = this.connectionHistory.length;
    const successful = this.connectionHistory.filter(h => h.success).length;
    const failed = total - successful;
    const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;
    
    return {
      total,
      successful,
      failed,
      successRate: successRate + '%',
      activeConnection: this.activeConnection?.name || 'Nenhuma'
    };
  }
}

const smartConnection = new SmartConnection();

// Conexão padrão (fallback)
const defaultConfig = connectionConfigs[0] || {
  name: 'Default',
  url: databaseUrl,
  options: { max: 1, ssl: false }
};

const client = postgres(defaultConfig.url, defaultConfig.options);
const db = drizzle(client, { schema });

// Log da configuração de conexão
console.log('🔗 Configurando conexão PostgreSQL:');
console.log('   📍 URL mascarada:', databaseUrl.replace(/:([^:@]+)@/, ':***@'));
console.log('   🌐 Ambiente:', process.env.NODE_ENV);
console.log('   🔒 SSL:', process.env.NODE_ENV === 'production' ? 'Habilitado (rejectUnauthorized: false)' : 'Desabilitado');
console.log('   📡 Conexão: Supabase Direto (sem pooler)');

export class SupabaseStorage implements IStorage {
  
  constructor() {
    console.log('✅ Inicializando Supabase Storage');
    // Testar conexão na inicialização com retry
    this.testConnection().catch(error => {
      console.error('❌ Erro na conexão inicial:', error.message);
      console.log('🔄 Tentando reconectar em 10 segundos...');
      // Não bloquear a inicialização - permitir que o servidor funcione como API
      setTimeout(() => {
        this.testConnection().catch(retryError => {
          console.error('❌ Falha na segunda tentativa:', retryError.message);
          console.log('⚠️ Servidor funcionando sem banco de dados - modo API apenas');
        });
      }, 10000);
    });
  }
  
  private async testConnection(): Promise<void> {
    try {
      console.log('🔌 Iniciando teste de conexão com diagnóstico avançado...');
      const { client: smartClient, name } = await smartConnection.getConnection();
      
      console.log('\n📊 === TESTE FINAL DE CONEXÃO ===');
      const result = await smartClient`SELECT 
        1 as test, 
        version() as version,
        current_database() as db,
        current_user as user,
        inet_server_addr() as server_ip`;
      
      console.log(`✅ Conexão PostgreSQL estabelecida com ${name}!`);
      console.log('📊 Informações do servidor:');
      console.log('   Versão:', result[0].version.split(' ')[0]);
      console.log('   Database:', result[0].db);
      console.log('   Usuário:', result[0].user);
      console.log('   IP do servidor:', result[0].server_ip || 'N/A');
      
      // Estatísticas de conexão
      const stats = smartConnection.getConnectionStats();
      console.log('\n📊 Estatísticas de conexão:');
      console.log('   Taxa de sucesso:', stats.successRate);
      console.log('   Total de tentativas:', stats.total);
      console.log('   Conexão ativa:', stats.activeConnection);
      
    } catch (error: any) {
      console.error('🚨 === FALHA CRÍTICA NA CONEXÃO ===');
      SupabaseErrorDiagnostics.analyzeError(error, 'Teste de conexão inicial');
      
      // Mostrar estatísticas mesmo em caso de erro
      const stats = smartConnection.getConnectionStats();
      console.log('\n📊 Estatísticas finais de conexão:');
      console.log('   Taxa de sucesso:', stats.successRate);
      console.log('   Total de tentativas:', stats.total);
      
      throw error;
    }
  }
  
  // Operações de Usuário
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const startTime = Date.now();
    console.log('\n🔍 === BUSCA DE USUÁRIO ===');
    console.log('📍 Username:', username);
    console.log('⏱️ Início:', new Date().toISOString());
    
    try {
      // Usar conexão inteligente com diagnóstico
      const { db: smartDb, name: connectionName } = await smartConnection.getConnection();
      console.log(`📊 Usando conexão: ${connectionName}`);
      
      console.log('🔎 Executando query getUserByUsername...');
      const queryStart = Date.now();
      
      const result = await smartDb.select()
        .from(schema.users)
        .where(eq(schema.users.username, username))
        .limit(1);
      
      const queryDuration = Date.now() - queryStart;
      const totalDuration = Date.now() - startTime;
      
      console.log('✅ === BUSCA CONCLUÍDA ===');
      console.log('🚀 Duração da query:', queryDuration + 'ms');
      console.log('⏱️ Duração total:', totalDuration + 'ms');
      console.log('🎯 Resultado:', {
        encontrado: result.length > 0,
        username: result[0]?.username || 'não encontrado',
        conexao: connectionName
      });
      
      return result[0];
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('\n🚨 === ERRO NA BUSCA DE USUÁRIO ===');
      console.error('⏱️ Duração até erro:', duration + 'ms');
      
      SupabaseErrorDiagnostics.analyzeError(error, `Busca de usuário: ${username}`);
      
      // Mostrar estatísticas de conexão para debug
      const stats = smartConnection.getConnectionStats();
      console.log('📊 Estatísticas de conexão no momento do erro:');
      console.log('   Taxa de sucesso:', stats.successRate);
      console.log('   Conexão ativa:', stats.activeConnection);
      
      throw error;
    }
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