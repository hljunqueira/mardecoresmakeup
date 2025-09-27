import 'dotenv/config';
import { storage } from './apps/api/storage';

// Dashboard consolidado - Métricas integradas de crediário e reservas
export async function getDashboardMetrics() {
  try {
    // Buscar dados básicos
    const products = await storage.getAllProducts();
    const reservations = await storage.getAllReservations();
    const customers = await storage.getAllCustomers();
    const creditAccounts = await storage.getAllCreditAccounts();
    const transactions = await storage.getAllTransactions();
    
    // Métricas de produtos
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.active !== false).length;
    const lowStockProducts = products.filter(p => (p.stock || 0) <= (p.minStock || 5)).length;
    const featuredProducts = products.filter(p => p.featured).length;
    
    // Métricas de reservas segmentadas
    const totalReservations = reservations.length;
    const activeReservations = reservations.filter(r => r.status === 'active').length;
    const soldReservations = reservations.filter(r => r.status === 'sold').length;
    const simpleReservations = reservations.filter(r => r.type === 'simple' || !r.type).length;
    const creditReservations = reservations.filter(r => r.type === 'credit_account').length;
    
    const totalReservedValue = reservations
      .filter(r => r.status === 'active')
      .reduce((sum, r) => sum + (r.quantity * parseFloat(r.unitPrice.toString())), 0);
    
    // Métricas de crediário
    const totalCustomers = customers.length;
    const totalCreditAccounts = creditAccounts.length;
    const activeCreditAccounts = creditAccounts.filter(ca => ca.status === 'active').length;
    
    const totalCreditLimit = creditAccounts.reduce((sum, account) => {
      return sum + parseFloat(account.totalAmount?.toString() || "0");
    }, 0);
    
    const usedCredit = creditAccounts.reduce((sum, account) => {
      return sum + parseFloat(account.paidAmount?.toString() || "0");
    }, 0);
    
    const availableCredit = totalCreditLimit - usedCredit;
    const averageTicket = totalCustomers > 0 ? totalCreditLimit / totalCustomers : 0;
    const conversionRate = totalCustomers > 0 ? (activeCreditAccounts / totalCustomers) * 100 : 0;
    
    // Métricas financeiras
    const totalRevenue = transactions
      .filter(t => t.type === "income" && t.status === "completed")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === "expense" && t.status === "completed")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const balance = totalRevenue - totalExpenses;
    
    // Análise de performance por período
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const recentCreditAccounts = creditAccounts.filter(ca => 
      new Date(ca.createdAt || Date.now()) >= last30Days
    ).length;
    
    const recentReservations = reservations.filter(r => 
      new Date(r.createdAt || Date.now()) >= last30Days
    ).length;
    
    return {
      // Métricas gerais
      totalProducts,
      activeProducts,
      lowStockProducts,
      featuredProducts,
      
      // Métricas de reservas
      totalReservations,
      activeReservations,
      soldReservations,
      simpleReservations,
      creditReservations,
      totalReservedValue,
      
      // Métricas de crediário
      totalCustomers,
      totalCreditAccounts,
      activeCreditAccounts,
      totalCreditLimit,
      usedCredit,
      availableCredit,
      averageTicket,
      conversionRate,
      
      // Métricas financeiras
      totalRevenue,
      totalExpenses,
      balance,
      
      // Performance recente
      recent: {
        creditAccounts: recentCreditAccounts,
        reservations: recentReservations,
        period: '30 dias'
      },
      
      // Análises
      insights: {
        creditUtilization: totalCreditLimit > 0 ? (usedCredit / totalCreditLimit) * 100 : 0,
        creditAvailability: totalCreditLimit > 0 ? (availableCredit / totalCreditLimit) * 100 : 0,
        customerEngagement: conversionRate,
        systemHealth: {
          totalAccounts: totalCreditAccounts,
          activeAccounts: activeCreditAccounts,
          migrationComplete: true
        }
      },
      
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Erro ao buscar métricas do dashboard:', error);
    throw error;
  }
}