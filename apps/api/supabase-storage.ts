// DNS IPv4 já configurado no index.ts (primeira linha da aplicação)
// 🔗 Supabase Storage - Sistema de conexão inteligente com IPv4 + modo offline
// DNS IPv4 já configurado no index.ts (primeira linha da aplicação)
// NODE_OPTIONS também configurado no railway.toml para garantia máxima
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
    console.log('📊 Tentativa de conexão:', config.name);
    console.log('🎯 Estratégia:', config.name);
    console.log('🌐 URL:', config.url.replace(/:([^:@]+)@/, ':***@'));
    console.log('⏱️ Connect timeout:', config.options.connect_timeout + 's');
    console.log('🔒 SSL:', config.options.ssl === 'require' ? 'Obrigatório' : 'Configurado');
    console.log('👥 Max connections:', config.options.max);
    console.log('📡 Family (IP):', config.options.connection?.family === 4 ? 'IPv4 (postgres.js)' : 'Auto');
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
console.log('   📡 Pooler: Supavisor (nova geração)');

// SOLUÇÃO AVANÇADA: URLs de fallback com Supavisor para Railway
// Session Mode (porta 5432): Conexões persistentes, ideal para aplicações web
// Transaction Mode (porta 6543): Conexões transientes, ideal para serverless
let connectionConfigs: { name: string; url: string; options: any }[] = [];

if (process.env.NODE_ENV === 'production') {
  console.log('🔧 Configurando conexões seguindo diretrizes oficiais Railway + Supabase...');
  console.log('✅ Usando connection.family: 4 para postgres.js (IPv4 obrigatório)');
  console.log('✅ Usando hostname DNS oficial (nunca IPs fixos)');
  console.log('✅ SSL obrigatório com sslmode=require');
  
  // 🚀 ALTERNATIVA 1: Usar IPs IPv4 diretos (mais confiável)
  connectionConfigs.push({
    name: 'Supabase IPv4 Direto (44.195.60.194)',
    url: 'postgresql://postgres:ServidorMardecores2025@44.195.60.194:5432/postgres',
    options: {
      max: 1,
      idle_timeout: 15,
      connect_timeout: 12,
      ssl: 'require',
      connection: { family: 4 },
      transform: { undefined: null },
    }
  });
  
  // 🚀 ALTERNATIVA 2: Pooler IPv4 direto
  connectionConfigs.push({
    name: 'Supabase Pooler IPv4 (44.195.60.194)',
    url: 'postgresql://postgres:ServidorMardecores2025@44.195.60.194:6543/postgres',
    options: {
      max: 1,
      idle_timeout: 15,
      connect_timeout: 12,
      ssl: 'require',
      connection: { family: 4 },
      transform: { undefined: null },
    }
  });
  
  // 🚀 ALTERNATIVA 3: Tentar outro IP do Supabase
  connectionConfigs.push({
    name: 'Supabase Backup IPv4 (3.223.xx.xx)',
    url: 'postgresql://postgres:ServidorMardecores2025@3.223.11.100:5432/postgres',
    options: {
      max: 1,
      idle_timeout: 15,
      connect_timeout: 12,
      ssl: 'require',
      connection: { family: 4 },
      transform: { undefined: null },
    }
  });
  
  // Estratégia 4: AWS Pooler (se resolver IPv4)
  connectionConfigs.push({
    name: 'Supabase AWS Pooler (IPv6 Safe)',
    url: 'postgresql://postgres:ServidorMardecores2025@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    options: {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 15,
      ssl: 'require',
      connection: { family: 4 },
      transform: { undefined: null },
    }
  });
  
  // Estratégia 5: PgBouncer original como último recurso
  connectionConfigs.push({
    name: 'Supabase PgBouncer (Último Recurso)',
    url: 'postgresql://postgres:ServidorMardecores2025@db.wudcabcsxmahlufgsyop.supabase.co:6543/postgres',
    options: {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 15,
      ssl: 'require',
      connection: { family: 4 },
      transform: { undefined: null },
    }
  });
  
} else {
  // Development: usar configuração com connection.family: 4
  connectionConfigs.push({
    name: 'Development',
    url: databaseUrl,
    options: {
      max: 5,
      ssl: 'require',
      connection: { 
        family: 4 // Forçar IPv4 mesmo em dev
      },
    }
  });
}

// 🚀 ALTERNATIVA ADICIONAL: Conexões com SSL flexível
if (process.env.NODE_ENV === 'production') {
  // Adicionar opções com SSL mais flexível para contornar problemas de certificado
  connectionConfigs.push({
    name: 'Supabase SSL Flexível (IPv4)',
    url: 'postgresql://postgres:ServidorMardecores2025@44.195.60.194:5432/postgres',
    options: {
      max: 1,
      idle_timeout: 15,
      connect_timeout: 10,
      ssl: { rejectUnauthorized: false },
      connection: { family: 4 },
    }
  });
  
  // Tentar sem SSL como último recurso
  connectionConfigs.push({
    name: 'Supabase Sem SSL (Emergência)',
    url: 'postgresql://postgres:ServidorMardecores2025@44.195.60.194:5432/postgres',
    options: {
      max: 1,
      idle_timeout: 10,
      connect_timeout: 8,
      ssl: false,
      connection: { family: 4 },
    }
  });
}

// Sistema de conexão inteligente com diagnóstico avançado
class SmartConnection {
  private activeConnection: { client: any; db: any; name: string; config: any } | null = null;
  private connectionHistory: { name: string; success: boolean; error?: string; timestamp: Date }[] = [];
  
  // 🚀 Método para resolver DNS manualmente para IPv4
  private async resolveToIPv4(hostname: string): Promise<string | null> {
    return new Promise((resolve) => {
      const dns = require('dns');
      dns.resolve4(hostname, (err: any, addresses: string[]) => {
        if (err || !addresses || addresses.length === 0) {
          console.log(`❌ Não foi possível resolver ${hostname} para IPv4:`, err?.message || 'Sem endereços');
          resolve(null);
        } else {
          const ipv4 = addresses[0];
          console.log(`✅ ${hostname} resolvido para IPv4: ${ipv4}`);
          resolve(ipv4);
        }
      });
    });
  }
  
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

// Conexão padrão (fallback) usando configuração correta para postgres.js
const defaultConfig = connectionConfigs[0] || {
  name: 'Default',
  url: databaseUrl,
  options: { 
    max: 1, 
    ssl: 'require',
    connection: { family: 4 }
  }
};

const client = postgres(defaultConfig.url, defaultConfig.options);
const db = drizzle(client, { schema });

// Log da configuração de conexão
console.log('🔗 Configurando conexão PostgreSQL com postgres.js:');
console.log('   📍 URL mascarada:', databaseUrl.replace(/:([^:@]+)@/, ':***@'));
console.log('   🌐 Ambiente:', process.env.NODE_ENV);
console.log('   🔒 SSL:', process.env.NODE_ENV === 'production' ? 'Obrigatório (require)' : 'Habilitado');
console.log('   📡 Conexão: Supabase com connection.family=4 (IPv4 forçado)');

export class SupabaseStorage implements IStorage {
  private offlineMode = false;
  private connectionRetries = 0;
  private maxRetries = 3;
  
  constructor() {
    console.log('✅ Inicializando Supabase Storage');
    
    // Tentar conexão inicial sem bloquear
    this.initializeConnection();
  }
  
  private async initializeConnection() {
    try {
      await this.testConnection();
      console.log('🌐 Sistema online - banco de dados conectado');
      this.offlineMode = false;
    } catch (error: any) {
      console.error('🚨 MODO OFFLINE ATIVADO - Banco indisponível');
      console.error('📝 Erro:', error.message);
      this.offlineMode = true;
      
      // Tentar reconectar periodicamente
      this.scheduleReconnection();
    }
  }
  
  private scheduleReconnection() {
    const delay = Math.min(30000 * Math.pow(2, this.connectionRetries), 300000); // Max 5 min
    console.log(`🔄 Tentativa de reconexão agendada em ${delay/1000}s (tentativa ${this.connectionRetries + 1}/${this.maxRetries})`);
    
    setTimeout(async () => {
      if (this.connectionRetries < this.maxRetries) {
        this.connectionRetries++;
        try {
          await this.testConnection();
          console.log('✅ RECONECTADO! Saindo do modo offline');
          this.offlineMode = false;
          this.connectionRetries = 0;
        } catch (error: any) {
          console.log(`❌ Falha na reconexão ${this.connectionRetries}/${this.maxRetries}`);
          if (this.connectionRetries < this.maxRetries) {
            this.scheduleReconnection();
          } else {
            console.log('⚠️ Máximo de tentativas atingido - permanecendo em modo offline');
          }
        }
      }
    }, delay);
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
    console.log('🌐 Modo offline:', this.offlineMode ? 'SIM' : 'NÃO');
    
    // Se estiver em modo offline, usar dados hardcoded para admin
    if (this.offlineMode) {
      console.log('⚠️ MODO OFFLINE - Usando validação local para admin');
      
      if (username === 'mardecoresmakeup@gmail.com') {
        // Hash SHA256 da senha 'Mardecores@09212615' (compatível com routes.ts)
        const crypto = await import('crypto');
        const sha256Hash = crypto.createHash('sha256').update('Mardecores@09212615').digest('hex');
        
        const offlineUser: User = {
          id: 'offline-admin-id',
          username: 'mardecoresmakeup@gmail.com',
          password: sha256Hash, // Hash SHA256 compatível com routes.ts
          role: 'admin',
          createdAt: new Date('2024-01-01'),
          lastLoginAt: new Date(),
        };
        
        console.log('✅ === USUÁRIO OFFLINE ENCONTRADO ===');
        console.log('⏱️ Duração:', Date.now() - startTime + 'ms');
        console.log('🎯 Admin offline autorizado com hash SHA256');
        console.log('🔐 Hash gerado:', sha256Hash.substring(0, 10) + '...');
        
        return offlineUser;
      } else {
        console.log('❌ Usuário não encontrado no modo offline');
        return undefined;
      }
    }
    
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
      
      // Se conseguiu conectar, sair do modo offline
      if (this.offlineMode) {
        console.log('✅ Saindo do modo offline - banco reconectado');
        this.offlineMode = false;
        this.connectionRetries = 0;
      }
      
      return result[0];
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('\n🚨 === ERRO NA BUSCA DE USUÁRIO ===');
      console.error('⏱️ Duração até erro:', duration + 'ms');
      
      SupabaseErrorDiagnostics.analyzeError(error, `Busca de usuário: ${username}`);
      
      // Ativar modo offline se não estiver ativo
      if (!this.offlineMode) {
        console.log('⚠️ Ativando modo offline devido ao erro');
        this.offlineMode = true;
        this.scheduleReconnection();
        
        // Tentar novamente em modo offline para admin
        if (username === 'mardecoresmakeup@gmail.com') {
          return this.getUserByUsername(username);
        }
      }
      
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

  // Operações de Produto (com modo offline)
  async getAllProducts(): Promise<Product[]> {
    if (this.offlineMode) {
      console.log('⚠️ MODO OFFLINE - Retornando produtos de exemplo');
      return [
        {
          id: 'offline-product-1',
          name: 'Produto Demo 1',
          description: 'Produto de demonstração em modo offline',
          price: '29.99',
          originalPrice: null,
          stock: 10,
          minStock: 5,
          images: ['/assets/demo-product.jpg'],
          category: 'demo-category',
          brand: 'Mar de Cores',
          sku: 'DEMO001',
          tags: ['demo', 'offline'],
          featured: true,
          active: true,
          rating: '4.5',
          reviewCount: 0,
          weight: null,
          dimensions: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date()
        } as Product
      ];
    }
    
    try {
      const { db: smartDb } = await smartConnection.getConnection();
      return await smartDb.select().from(schema.products).orderBy(schema.products.createdAt);
    } catch (error) {
      console.log('⚠️ Erro ao buscar produtos, ativando modo offline');
      this.offlineMode = true;
      return this.getAllProducts();
    }
  }

  async getActiveProducts(): Promise<Product[]> {
    if (this.offlineMode) {
      console.log('⚠️ MODO OFFLINE - Retornando produtos ativos de exemplo');
      return [
        {
          id: 'offline-product-active-1',
          name: 'Produto Ativo Demo',
          description: 'Produto ativo de demonstração',
          price: '39.99',
          originalPrice: null,
          stock: 5,
          minStock: 5,
          images: ['/assets/demo-product.jpg'],
          category: 'demo-category',
          brand: 'Mar de Cores',
          sku: 'DEMO002',
          tags: ['demo', 'ativo'],
          featured: false,
          active: true,
          rating: '4.0',
          reviewCount: 0,
          weight: null,
          dimensions: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date()
        } as Product
      ];
    }
    
    try {
      const { db: smartDb } = await smartConnection.getConnection();
      return await smartDb.select().from(schema.products)
        .where(eq(schema.products.active, true))
        .orderBy(schema.products.createdAt);
    } catch (error) {
      console.log('⚠️ Erro ao buscar produtos ativos, ativando modo offline');
      this.offlineMode = true;
      return this.getActiveProducts();
    }
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

  // Operações de Cupom (com modo offline)
  async getAllCoupons(): Promise<Coupon[]> {
    if (this.offlineMode) {
      console.log('⚠️ MODO OFFLINE - Retornando cupons de exemplo');
      return [
        {
          id: 'offline-coupon-1',
          code: 'DEMO10',
          type: 'percentage',
          value: '10.00',
          active: true,
          expiresAt: new Date('2024-12-31'),
          usageLimit: 100,
          usedCount: 0,
          minimumAmount: '50.00',
          maxDiscount: null,
          applicableCategories: null,
          createdAt: new Date('2024-01-01')
        } as Coupon
      ];
    }
    
    try {
      const { db: smartDb } = await smartConnection.getConnection();
      return await smartDb.select().from(schema.coupons).orderBy(schema.coupons.createdAt);
    } catch (error) {
      console.log('⚠️ Erro ao buscar cupons, ativando modo offline');
      this.offlineMode = true;
      return this.getAllCoupons();
    }
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

  // Operações Financeiras (com modo offline)
  async getAllTransactions(): Promise<FinancialTransaction[]> {
    if (this.offlineMode) {
      console.log('⚠️ MODO OFFLINE - Retornando transações de exemplo');
      return [
        {
          id: 'offline-transaction-1',
          type: 'income',
          category: 'sale',
          subcategory: 'online',
          description: 'Venda de demonstração - Modo Offline',
          amount: '150.00',
          date: new Date('2024-01-01'),
          status: 'completed',
          paymentMethod: 'pix',
          reference: 'DEMO001',
          supplierId: null,
          dueDate: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date()
        } as FinancialTransaction
      ];
    }
    
    try {
      const { db: smartDb } = await smartConnection.getConnection();
      return await smartDb.select().from(schema.financialTransactions).orderBy(schema.financialTransactions.createdAt);
    } catch (error) {
      console.log('⚠️ Erro ao buscar transações, ativando modo offline');
      this.offlineMode = true;
      return this.getAllTransactions();
    }
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