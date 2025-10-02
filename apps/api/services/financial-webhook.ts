import { storage } from "../storage";

export interface WebhookEvent {
  type: 'order_confirmed' | 'order_cancelled' | 'credit_payment' | 'transaction_created';
  entity: 'order' | 'credit_account' | 'transaction';
  entityId: string;
  data: any;
  triggeredAt: Date;
}

export interface FinancialSyncResult {
  success: boolean;
  transactionId?: string;
  message: string;
  syncedData?: {
    type: 'income' | 'expense';
    amount: number;
    source: string;
    description: string;
  };
}

/**
 * Serviço de Webhook para Sincronização Financeira Automática
 * Responsável por sincronizar automaticamente dados entre pedidos, crediário e transações financeiras
 */
export class FinancialWebhookService {
  
  /**
   * Processa webhook de confirmação de pedido
   * Cria automaticamente uma transação financeira correspondente
   */
  async processOrderConfirmation(orderId: string): Promise<FinancialSyncResult> {
    try {
      console.log('🔄 Processando webhook de confirmação de pedido:', orderId);
      
      // Buscar dados do pedido
      const order = await storage.getOrder(orderId);
      if (!order) {
        return {
          success: false,
          message: `Pedido ${orderId} não encontrado`
        };
      }
      
      // Verificar se o pedido já foi processado financeiramente
      const existingTransactions = await storage.getAllTransactions();
      const orderTransaction = existingTransactions.find(t => 
        t.metadata && 
        typeof t.metadata === 'object' && 
        (t.metadata as any).orderId === orderId
      );
      
      if (orderTransaction) {
        console.log('⚠️ Transação já existe para este pedido:', orderTransaction.id);
        return {
          success: true,
          transactionId: orderTransaction.id,
          message: 'Transação já existe para este pedido'
        };
      }
      
      // Criar transação financeira baseada no pedido
      const transactionData = {
        type: 'income' as const,
        category: order.paymentMethod === 'credit' ? 'Crediário' : 'Vendas',
        description: `Pedido #${order.id.substring(0, 8)} - ${order.paymentMethod === 'credit' ? 'Crediário' : 'À Vista'}`,
        amount: order.total.toString(),
        status: order.paymentMethod === 'credit' ? 'pending' : 'completed',
        date: new Date(),
        metadata: {
          orderId: order.id,
          customerId: order.customerId,
          paymentMethod: order.paymentMethod,
          orderTotal: order.total,
          syncedAt: new Date().toISOString(),
          source: 'order_webhook'
        }
      };
      
      const transaction = await storage.createTransaction(transactionData);
      
      console.log('✅ Transação financeira criada via webhook:', transaction.id);
      
      return {
        success: true,
        transactionId: transaction.id,
        message: `Transação financeira criada automaticamente para pedido ${orderId}`,
        syncedData: {
          type: 'income',
          amount: parseFloat(order.total.toString()),
          source: 'order',
          description: transactionData.description
        }
      };
      
    } catch (error) {
      console.error('❌ Erro no webhook de confirmação de pedido:', error);
      return {
        success: false,
        message: `Erro ao processar webhook: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }
  
  /**
   * Processa webhook de cancelamento de pedido
   * Remove ou marca como cancelada a transação financeira correspondente
   */
  async processOrderCancellation(orderId: string): Promise<FinancialSyncResult> {
    try {
      console.log('🔄 Processando webhook de cancelamento de pedido:', orderId);
      
      // Buscar transação relacionada ao pedido
      const transactions = await storage.getAllTransactions();
      const orderTransaction = transactions.find(t => 
        t.metadata && 
        typeof t.metadata === 'object' && 
        (t.metadata as any).orderId === orderId
      );
      
      if (!orderTransaction) {
        return {
          success: true,
          message: 'Nenhuma transação encontrada para cancelar'
        };
      }
      
      // Atualizar status da transação para cancelada
      const updatedTransaction = await storage.updateTransaction(orderTransaction.id, {
        status: 'cancelled',
        metadata: {
          ...(orderTransaction.metadata as any),
          cancelledAt: new Date().toISOString(),
          cancellationReason: 'order_cancelled'
        }
      });
      
      if (!updatedTransaction) {
        return {
          success: false,
          message: 'Falha ao atualizar transação'
        };
      }
      
      console.log('✅ Transação cancelada via webhook:', updatedTransaction.id);
      
      return {
        success: true,
        transactionId: updatedTransaction.id,
        message: `Transação financeira cancelada para pedido ${orderId}`,
        syncedData: {
          type: 'income',
          amount: parseFloat(orderTransaction.amount),
          source: 'order',
          description: `Cancelamento: ${orderTransaction.description}`
        }
      };
      
    } catch (error) {
      console.error('❌ Erro no webhook de cancelamento de pedido:', error);
      return {
        success: false,
        message: `Erro ao processar cancelamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }
  
  /**
   * Processa webhook de pagamento de crediário
   * Atualiza transações relacionadas ao crediário
   */
  async processCreditPayment(creditAccountId: string, paymentAmount: number): Promise<FinancialSyncResult> {
    try {
      console.log('🔄 Processando webhook de pagamento de crediário:', creditAccountId, paymentAmount);
      
      // Buscar conta de crediário
      const creditAccount = await storage.getCreditAccount(creditAccountId);
      if (!creditAccount) {
        return {
          success: false,
          message: `Conta de crediário ${creditAccountId} não encontrada`
        };
      }
      
      // Criar transação de recebimento de crediário
      const transactionData = {
        type: 'income' as const,
        category: 'Crediário',
        description: `Pagamento crediário - Conta ${creditAccount.accountNumber}`,
        amount: paymentAmount.toString(),
        status: 'completed' as const,
        date: new Date(),
        metadata: {
          creditAccountId,
          customerId: creditAccount.customerId,
          accountNumber: creditAccount.accountNumber,
          paymentAmount,
          syncedAt: new Date().toISOString(),
          source: 'credit_webhook'
        }
      };
      
      const transaction = await storage.createTransaction(transactionData);
      
      console.log('✅ Transação de pagamento de crediário criada via webhook:', transaction.id);
      
      return {
        success: true,
        transactionId: transaction.id,
        message: `Transação de pagamento de crediário criada: ${paymentAmount}`,
        syncedData: {
          type: 'income',
          amount: paymentAmount,
          source: 'credit',
          description: transactionData.description
        }
      };
      
    } catch (error) {
      console.error('❌ Erro no webhook de pagamento de crediário:', error);
      return {
        success: false,
        message: `Erro ao processar pagamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }
  
  /**
   * Sincroniza dados históricos
   * Identifica pedidos/crediário sem transações correspondentes e cria-as
   */
  async syncHistoricalData(): Promise<{
    success: boolean;
    syncedOrders: number;
    syncedCreditAccounts: number;
    errors: string[];
    message: string;
  }> {
    try {
      console.log('🔄 Iniciando sincronização de dados históricos...');
      
      const [orders, transactions, creditAccounts] = await Promise.all([
        storage.getAllOrders(),
        storage.getAllTransactions(),
        storage.getAllCreditAccounts()
      ]);
      
      const errors: string[] = [];
      let syncedOrders = 0;
      let syncedCreditAccounts = 0;
      
      // Verificar pedidos sem transações
      for (const order of orders) {
        if (order.status !== 'confirmed' && order.status !== 'completed') continue;
        
        const hasTransaction = transactions.some(t => 
          t.metadata && 
          typeof t.metadata === 'object' && 
          (t.metadata as any).orderId === order.id
        );
        
        if (!hasTransaction) {
          console.log('📊 Sincronizando pedido histórico:', order.id);
          const result = await this.processOrderConfirmation(order.id);
          if (result.success) {
            syncedOrders++;
          } else {
            errors.push(`Pedido ${order.id}: ${result.message}`);
          }
        }
      }
      
      // Verificar contas de crediário ativas sem transações suficientes
      for (const creditAccount of creditAccounts) {
        if (creditAccount.status !== 'active') continue;
        
        const paidAmount = parseFloat(creditAccount.paidAmount?.toString() || '0');
        if (paidAmount <= 0) continue;
        
        const creditTransactions = transactions.filter(t => 
          t.metadata && 
          typeof t.metadata === 'object' && 
          (t.metadata as any).creditAccountId === creditAccount.id
        );
        
        const totalTransacted = creditTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        if (totalTransacted < paidAmount) {
          const missingAmount = paidAmount - totalTransacted;
          console.log('📊 Sincronizando pagamento de crediário histórico:', creditAccount.id, missingAmount);
          
          const result = await this.processCreditPayment(creditAccount.id, missingAmount);
          if (result.success) {
            syncedCreditAccounts++;
          } else {
            errors.push(`Crediário ${creditAccount.id}: ${result.message}`);
          }
        }
      }
      
      const message = `Sincronização concluída: ${syncedOrders} pedidos, ${syncedCreditAccounts} contas de crediário`;
      console.log('✅', message);
      
      return {
        success: true,
        syncedOrders,
        syncedCreditAccounts,
        errors,
        message
      };
      
    } catch (error) {
      console.error('❌ Erro na sincronização histórica:', error);
      return {
        success: false,
        syncedOrders: 0,
        syncedCreditAccounts: 0,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido'],
        message: 'Falha na sincronização histórica'
      };
    }
  }
  
  /**
   * Dispara evento de webhook
   */
  async triggerWebhook(event: WebhookEvent): Promise<FinancialSyncResult> {
    console.log('🔔 Disparando webhook:', event.type, event.entityId);
    
    switch (event.type) {
      case 'order_confirmed':
        return await this.processOrderConfirmation(event.entityId);
      case 'order_cancelled':
        return await this.processOrderCancellation(event.entityId);
      case 'credit_payment':
        return await this.processCreditPayment(event.entityId, event.data.amount);
      default:
        return {
          success: false,
          message: `Tipo de webhook não suportado: ${event.type}`
        };
    }
  }
}

// Instância singleton do serviço
export const financialWebhook = new FinancialWebhookService();