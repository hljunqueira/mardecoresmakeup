import { storage } from "./apps/api/storage";

async function fixCreditAccounts() {
  try {
    console.log('🔧 Iniciando correção das contas de crediário...');
    
    // 1. Corrigir a conta existente com remainingAmount incorreto
    const existingAccount = await storage.getCreditAccount('3ddb9a6a-2155-4b1d-b772-221fc1586a18');
    if (existingAccount) {
      const totalAmount = parseFloat(existingAccount.totalAmount?.toString() || '0');
      const paidAmount = parseFloat(existingAccount.paidAmount?.toString() || '0');
      const correctRemainingAmount = totalAmount - paidAmount;
      
      console.log(`📊 Conta existente: Total=${totalAmount}, Pago=${paidAmount}, Deveria ser=${correctRemainingAmount}`);
      
      if (correctRemainingAmount !== parseFloat(existingAccount.remainingAmount?.toString() || '0')) {
        await storage.updateCreditAccount(existingAccount.id, {
          remainingAmount: correctRemainingAmount.toString()
        });
        console.log('✅ Conta corrigida:', existingAccount.id);
      }
    }
    
    // 2. Buscar pedidos de crediário pendentes sem conta
    const allOrders = await storage.getAllOrders();
    const creditOrders = allOrders.filter(order => 
      order.paymentMethod === 'credit' && 
      order.status === 'pending' && 
      order.customerId
    );
    
    console.log(`📋 Encontrados ${creditOrders.length} pedidos de crediário pendentes`);
    
    // 3. Verificar quais já têm contas
    const allAccounts = await storage.getAllCreditAccounts();
    const customersWithAccounts = new Set(allAccounts.map(acc => acc.customerId));
    
    console.log(`💳 ${allAccounts.length} contas existentes para ${customersWithAccounts.size} clientes`);
    
    // 4. Criar contas para pedidos sem conta
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const order of creditOrders) {
      const customerId = order.customerId!;
      
      // Verificar se cliente já tem conta ativa
      const customerAccounts = await storage.getCreditAccountsByCustomer(customerId);
      const activeAccount = customerAccounts.find(acc => acc.status === 'active');
      
      if (activeAccount) {
        // Atualizar conta existente
        const currentTotal = parseFloat(activeAccount.totalAmount?.toString() || '0');
        const currentRemaining = parseFloat(activeAccount.remainingAmount?.toString() || '0');
        const orderTotal = parseFloat(order.total?.toString() || '0');
        
        const newTotal = currentTotal + orderTotal;
        const newRemaining = currentRemaining + orderTotal;
        
        await storage.updateCreditAccount(activeAccount.id, {
          totalAmount: newTotal.toString(),
          remainingAmount: newRemaining.toString()
        });
        
        console.log(`📈 Conta atualizada para ${order.customerName}: +${orderTotal} (Total: ${newTotal})`);
        updatedCount++;
      } else {
        // Criar nova conta
        const orderTotal = parseFloat(order.total?.toString() || '0');
        
        const newAccount = await storage.createCreditAccount({
          customerId: customerId,
          accountNumber: `ACC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          totalAmount: orderTotal.toString(),
          paidAmount: '0',
          remainingAmount: orderTotal.toString(),
          installments: 1,
          installmentValue: orderTotal.toString(),
          paymentFrequency: 'monthly',
          nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
          status: 'active',
          notes: `Conta criada automaticamente para pedido ${order.orderNumber} (${order.customerName})`
        });
        
        console.log(`🆕 Nova conta criada para ${order.customerName}: ${orderTotal} (${newAccount.id})`);
        createdCount++;
      }
    }
    
    console.log('✅ Correção concluída!');
    console.log(`📊 Resumo:`);
    console.log(`   - Contas criadas: ${createdCount}`);
    console.log(`   - Contas atualizadas: ${updatedCount}`);
    
    // 5. Verificar resultado final
    const finalAccounts = await storage.getAllCreditAccounts();
    const totalPending = finalAccounts.reduce((sum, acc) => sum + parseFloat(acc.remainingAmount?.toString() || '0'), 0);
    
    console.log(`💰 Total a receber após correção: R$ ${totalPending.toFixed(2)}`);
    console.log(`📋 Total de contas: ${finalAccounts.length}`);
    
  } catch (error) {
    console.error('❌ Erro na correção:', error);
  }
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  fixCreditAccounts().then(() => {
    console.log('🏁 Script finalizado');
    process.exit(0);
  });
}