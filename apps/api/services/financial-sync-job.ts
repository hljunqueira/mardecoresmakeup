import { financialWebhook } from "./financial-webhook";
import { storage } from "../storage";

export interface SyncJobResult {
  success: boolean;
  jobId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  results: {
    syncedOrders: number;
    syncedCreditAccounts: number;
    detectedInconsistencies: number;
    fixedInconsistencies: number;
    errors: string[];
  };
  message: string;
}

export interface DataInconsistency {
  type: 'missing_transaction' | 'duplicate_transaction' | 'amount_mismatch' | 'status_mismatch';
  entityType: 'order' | 'credit_account';
  entityId: string;
  description: string;
  expectedValue: any;
  actualValue: any;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Serviço de Job de Sincronização Financeira
 * Executa sincronizações periódicas e detecta inconsistências nos dados
 */
export class FinancialSyncJobService {
  private isRunning = false;
  private lastJobResult: SyncJobResult | null = null;
  private jobInterval: NodeJS.Timeout | null = null;
  
  /**
   * Inicia o job de sincronização periódica
   */
  start(intervalMinutes: number = 30) {
    if (this.isRunning) {
      console.log('⚠️ Job de sincronização já está em execução');
      return;
    }
    
    console.log(`🔄 Iniciando job de sincronização (intervalo: ${intervalMinutes} minutos)`);
    
    // Executar imediatamente
    this.runSyncJob();
    
    // Agendar execuções periódicas
    this.jobInterval = setInterval(() => {
      this.runSyncJob();
    }, intervalMinutes * 60 * 1000);
    
    this.isRunning = true;
  }
  
  /**
   * Para o job de sincronização
   */
  stop() {
    if (this.jobInterval) {
      clearInterval(this.jobInterval);
      this.jobInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️ Job de sincronização parado');
  }
  
  /**
   * Executa uma sincronização completa
   */
  async runSyncJob(): Promise<SyncJobResult> {
    const jobId = `sync_${Date.now()}`;
    const startTime = new Date();
    
    console.log(`🔄 Executando job de sincronização: ${jobId}`);
    
    try {
      // 1. Detectar inconsistências
      const inconsistencies = await this.detectInconsistencies();
      console.log(`🔍 Inconsistências detectadas: ${inconsistencies.length}`);
      
      // 2. Executar sincronização histórica
      const historicalSync = await financialWebhook.syncHistoricalData();
      console.log(`📊 Sincronização histórica: ${historicalSync.message}`);
      
      // 3. Corrigir inconsistências críticas
      const fixedInconsistencies = await this.fixCriticalInconsistencies(inconsistencies);
      console.log(`🔧 Inconsistências corrigidas: ${fixedInconsistencies}`);
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      const result: SyncJobResult = {
        success: true,
        jobId,
        startTime,
        endTime,
        duration,
        results: {
          syncedOrders: historicalSync.syncedOrders,
          syncedCreditAccounts: historicalSync.syncedCreditAccounts,
          detectedInconsistencies: inconsistencies.length,
          fixedInconsistencies,
          errors: historicalSync.errors
        },
        message: `Job concluído: ${historicalSync.syncedOrders} pedidos, ${historicalSync.syncedCreditAccounts} crediário, ${fixedInconsistencies} correções`
      };
      
      this.lastJobResult = result;
      console.log(`✅ Job ${jobId} concluído em ${duration}ms`);
      
      return result;
      
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      const result: SyncJobResult = {
        success: false,
        jobId,
        startTime,
        endTime,
        duration,
        results: {
          syncedOrders: 0,
          syncedCreditAccounts: 0,
          detectedInconsistencies: 0,
          fixedInconsistencies: 0,
          errors: [error instanceof Error ? error.message : 'Erro desconhecido']
        },
        message: `Falha no job: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
      
      this.lastJobResult = result;
      console.error(`❌ Job ${jobId} falhou:`, error);
      
      return result;
    }
  }
  
  /**
   * Detecta inconsistências nos dados financeiros
   */
  async detectInconsistencies(): Promise<DataInconsistency[]> {
    const inconsistencies: DataInconsistency[] = [];
    
    try {
      const [orders, transactions, creditAccounts] = await Promise.all([
        storage.getAllOrders(),
        storage.getAllTransactions(),
        storage.getAllCreditAccounts()
      ]);
      
      // 1. Verificar pedidos confirmados sem transações
      for (const order of orders) {
        if (order.status !== 'confirmed' && order.status !== 'completed') continue;
        
        const hasTransaction = transactions.some(t => 
          t.metadata && 
          typeof t.metadata === 'object' && 
          (t.metadata as any).orderId === order.id
        );
        
        if (!hasTransaction) {
          inconsistencies.push({
            type: 'missing_transaction',
            entityType: 'order',
            entityId: order.id,
            description: `Pedido confirmado sem transação financeira correspondente`,
            expectedValue: { hasTransaction: true, amount: order.total },
            actualValue: { hasTransaction: false },
            severity: 'high'
          });
        }
      }
      
      // 2. Verificar transações duplicadas para o mesmo pedido
      const orderTransactionMap = new Map<string, string[]>();
      transactions.forEach(t => {
        if (t.metadata && typeof t.metadata === 'object') {
          const orderId = (t.metadata as any).orderId;
          if (orderId) {
            if (!orderTransactionMap.has(orderId)) {
              orderTransactionMap.set(orderId, []);
            }
            orderTransactionMap.get(orderId)!.push(t.id);
          }
        }
      });
      
      orderTransactionMap.forEach((transactionIds, orderId) => {
        if (transactionIds.length > 1) {
          inconsistencies.push({
            type: 'duplicate_transaction',
            entityType: 'order',
            entityId: orderId,
            description: `Múltiplas transações para o mesmo pedido`,
            expectedValue: { transactionCount: 1 },
            actualValue: { transactionCount: transactionIds.length, transactionIds },
            severity: 'medium'
          });
        }
      });
      
      // 3. Verificar valores divergentes entre pedidos e transações
      for (const order of orders) {
        const orderTransaction = transactions.find(t => 
          t.metadata && 
          typeof t.metadata === 'object' && 
          (t.metadata as any).orderId === order.id
        );
        
        if (orderTransaction) {
          const orderAmount = parseFloat(order.total.toString());
          const transactionAmount = parseFloat(orderTransaction.amount);
          
          if (Math.abs(orderAmount - transactionAmount) > 0.01) {
            inconsistencies.push({
              type: 'amount_mismatch',
              entityType: 'order',
              entityId: order.id,
              description: `Divergência de valor entre pedido e transação`,
              expectedValue: { amount: orderAmount },
              actualValue: { amount: transactionAmount },
              severity: 'high'
            });
          }
        }
      }
      
      // 4. Verificar contas de crediário com valores inconsistentes
      for (const creditAccount of creditAccounts) {
        const totalAmount = parseFloat(creditAccount.totalAmount?.toString() || '0');
        const paidAmount = parseFloat(creditAccount.paidAmount?.toString() || '0');
        const remainingAmount = parseFloat(creditAccount.remainingAmount?.toString() || '0');
        
        const expectedRemaining = Math.max(0, totalAmount - paidAmount);
        
        if (Math.abs(remainingAmount - expectedRemaining) > 0.01) {
          inconsistencies.push({
            type: 'amount_mismatch',
            entityType: 'credit_account',
            entityId: creditAccount.id,
            description: `Valor restante do crediário inconsistente`,
            expectedValue: { remainingAmount: expectedRemaining },
            actualValue: { remainingAmount },
            severity: 'medium'
          });
        }
        
        // Verificar se status está correto
        const expectedStatus = expectedRemaining <= 0 ? 'paid' : 'active';
        if (creditAccount.status !== expectedStatus && creditAccount.status !== 'closed') {
          inconsistencies.push({
            type: 'status_mismatch',
            entityType: 'credit_account',
            entityId: creditAccount.id,
            description: `Status da conta de crediário inconsistente`,
            expectedValue: { status: expectedStatus },
            actualValue: { status: creditAccount.status },
            severity: 'low'
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Erro ao detectar inconsistências:', error);
    }
    
    return inconsistencies;
  }
  
  /**
   * Corrige inconsistências críticas automaticamente
   */
  async fixCriticalInconsistencies(inconsistencies: DataInconsistency[]): Promise<number> {
    let fixedCount = 0;
    
    for (const inconsistency of inconsistencies) {
      try {
        switch (inconsistency.type) {
          case 'missing_transaction':
            if (inconsistency.entityType === 'order') {
              console.log(`🔧 Corrigindo transação faltante para pedido: ${inconsistency.entityId}`);
              const result = await financialWebhook.processOrderConfirmation(inconsistency.entityId);
              if (result.success) {
                fixedCount++;
                console.log(`✅ Transação criada: ${result.transactionId}`);
              }
            }
            break;
            
          case 'amount_mismatch':
            if (inconsistency.entityType === 'credit_account') {
              console.log(`🔧 Corrigindo valores de crediário: ${inconsistency.entityId}`);
              const expectedRemaining = inconsistency.expectedValue.remainingAmount;
              await storage.updateCreditAccount(inconsistency.entityId, {
                remainingAmount: expectedRemaining.toString()
              });
              fixedCount++;
              console.log(`✅ Valor restante corrigido para: ${expectedRemaining}`);
            }
            break;
            
          case 'status_mismatch':
            if (inconsistency.entityType === 'credit_account') {
              console.log(`🔧 Corrigindo status de crediário: ${inconsistency.entityId}`);
              const expectedStatus = inconsistency.expectedValue.status;
              await storage.updateCreditAccount(inconsistency.entityId, {
                status: expectedStatus
              });
              fixedCount++;
              console.log(`✅ Status corrigido para: ${expectedStatus}`);
            }
            break;
        }
      } catch (error) {
        console.error(`❌ Erro ao corrigir inconsistência ${inconsistency.entityId}:`, error);
      }
    }
    
    return fixedCount;
  }
  
  /**
   * Retorna o status atual do job
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastJobResult: this.lastJobResult,
      uptime: this.isRunning ? Date.now() - (this.lastJobResult?.startTime.getTime() || Date.now()) : 0
    };
  }
  
  /**
   * Retorna estatísticas detalhadas do sistema
   */
  async getDetailedStats() {
    try {
      const [orders, transactions, creditAccounts] = await Promise.all([
        storage.getAllOrders(),
        storage.getAllTransactions(),
        storage.getAllCreditAccounts()
      ]);
      
      const syncedTransactions = transactions.filter(t => 
        t.metadata && 
        typeof t.metadata === 'object' && 
        ['order_webhook', 'credit_webhook'].includes((t.metadata as any).source)
      );
      
      const inconsistencies = await this.detectInconsistencies();
      
      return {
        dataIntegrity: {
          totalOrders: orders.length,
          confirmedOrders: orders.filter(o => o.status === 'confirmed' || o.status === 'completed').length,
          totalTransactions: transactions.length,
          webhookTransactions: syncedTransactions.length,
          totalCreditAccounts: creditAccounts.length,
          activeCreditAccounts: creditAccounts.filter(ca => ca.status === 'active').length
        },
        syncStatus: {
          inconsistenciesDetected: inconsistencies.length,
          criticalInconsistencies: inconsistencies.filter(i => i.severity === 'high').length,
          lastSyncResult: this.lastJobResult
        },
        performance: {
          averageSyncTime: this.lastJobResult?.duration || 0,
          jobsExecuted: this.lastJobResult ? 1 : 0,
          successRate: this.lastJobResult?.success ? 100 : 0
        }
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      return null;
    }
  }
}

// Instância singleton do serviço
export const financialSyncJob = new FinancialSyncJobService();