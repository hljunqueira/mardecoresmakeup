import 'dotenv/config';
import postgres from 'postgres';

async function consolidateReservations() {
  console.log('🔄 FASE 3: CONSOLIDAÇÃO DAS RESERVAS EXISTENTES\n');
  console.log('Agrupando reservas por cliente e criando contas de crediário organizadas');
  console.log('=' .repeat(70));
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não configurada');
    process.exit(1);
  }
  
  const sql = postgres(process.env.DATABASE_URL);
  
  try {
    console.log('📊 1. ANÁLISE DAS RESERVAS EXISTENTES\n');
    
    // Analisar reservas ativas por cliente
    const reservationAnalysis = await sql`
      SELECT 
        customer_name,
        COUNT(*) as total_reservations,
        SUM(quantity * unit_price::numeric) as total_value,
        MIN(created_at) as first_reservation,
        MAX(created_at) as last_reservation,
        ARRAY_AGG(DISTINCT status) as statuses,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_reservations
      FROM reservations
      GROUP BY customer_name
      HAVING COUNT(CASE WHEN status = 'active' THEN 1 END) > 0
      ORDER BY total_value DESC, total_reservations DESC
    `;
    
    console.log(`👥 Clientes com reservas ativas encontrados: ${reservationAnalysis.length}`);
    console.log('\n📋 Resumo por cliente:');
    
    let totalValueToConsolidate = 0;
    let totalReservationsToConsolidate = 0;
    
    reservationAnalysis.forEach((client, index) => {
      const value = parseFloat(client.total_value);
      totalValueToConsolidate += value;
      totalReservationsToConsolidate += parseInt(client.active_reservations);
      
      console.log(`   ${index + 1}. ${client.customer_name}`);
      console.log(`      Reservas ativas: ${client.active_reservations}/${client.total_reservations}`);
      console.log(`      Valor total: R$ ${value.toFixed(2)}`);
      console.log(`      Período: ${client.first_reservation.toLocaleDateString('pt-BR')} - ${client.last_reservation.toLocaleDateString('pt-BR')}`);
      console.log(`      Status: ${client.statuses.join(', ')}`);
      console.log('');
    });
    
    console.log(`💰 Valor total a consolidar: R$ ${totalValueToConsolidate.toFixed(2)}`);
    console.log(`📦 Total de reservas ativas: ${totalReservationsToConsolidate}`);
    
    console.log('\n🔄 2. CRIANDO CONTAS DE CREDIÁRIO POR CLIENTE\n');
    
    let consolidatedAccounts = 0;
    let consolidatedReservations = 0;
    
    for (const clientData of reservationAnalysis) {
      const customerName = clientData.customer_name;
      const totalValue = parseFloat(clientData.total_value);
      
      console.log(`👤 Processando cliente: ${customerName}`);
      
      // Verificar se já existe um cliente cadastrado com nome similar
      const existingCustomer = await sql`
        SELECT id, name FROM customers 
        WHERE LOWER(name) = LOWER(${customerName})
        LIMIT 1
      `;
      
      let customerId;
      
      if (existingCustomer.length > 0) {
        customerId = existingCustomer[0].id;
        console.log(`   ✅ Cliente encontrado no cadastro: ${existingCustomer[0].name}`);
      } else {
        // Criar novo cliente
        const newCustomer = await sql`
          INSERT INTO customers (name, email, created_at, updated_at)
          VALUES (
            ${customerName}, 
            ${customerName.toLowerCase().replace(/\s+/g, '') + '@cliente.local'},
            NOW(),
            NOW()
          )
          RETURNING id, name
        `;
        
        customerId = newCustomer[0].id;
        console.log(`   ➕ Novo cliente criado: ${newCustomer[0].name}`);
      }
      
      // Verificar se já existe conta de crediário para este cliente
      const existingAccount = await sql`
        SELECT id, account_number FROM credit_accounts 
        WHERE customer_id = ${customerId} AND status = 'active'
        LIMIT 1
      `;
      
      let accountId;
      let accountNumber;
      
      if (existingAccount.length > 0) {
        accountId = existingAccount[0].id;
        accountNumber = existingAccount[0].account_number;
        console.log(`   🔄 Usando conta existente: ${accountNumber}`);
        
        // Atualizar valores da conta existente
        await sql`
          UPDATE credit_accounts 
          SET 
            total_amount = total_amount + ${totalValue},
            remaining_amount = remaining_amount + ${totalValue},
            updated_at = NOW()
          WHERE id = ${accountId}
        `;
        
      } else {
        // Gerar número da conta baseado na memória (CR001, CR002, etc.)
        const accountCount = await sql`SELECT COUNT(*) as count FROM credit_accounts`;
        accountNumber = `CR${String(parseInt(accountCount[0].count) + 1).padStart(3, '0')}`;
        
        // Criar nova conta de crediário
        const newAccount = await sql`
          INSERT INTO credit_accounts (
            customer_id,
            account_number,
            status,
            total_amount,
            paid_amount,
            remaining_amount,
            installments,
            payment_frequency,
            next_payment_date,
            notes,
            created_at
          ) VALUES (
            ${customerId},
            ${accountNumber},
            'active',
            ${totalValue},
            0,
            ${totalValue},
            1,
            'monthly',
            ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}, -- 30 dias
            'Conta criada automaticamente na consolidação de reservas',
            NOW()
          )
          RETURNING id, account_number
        `;
        
        accountId = newAccount[0].id;
        accountNumber = newAccount[0].account_number;
        console.log(`   ✨ Nova conta criada: ${accountNumber}`);
      }
      
      // Vincular reservas ativas à conta de crediário
      const linkedReservations = await sql`
        UPDATE reservations 
        SET 
          type = 'credit_account',
          credit_account_id = ${accountId},
          customer_id = ${customerId}
        WHERE customer_name = ${customerName} 
          AND status = 'active'
          AND type IS NULL
        RETURNING id
      `;
      
      consolidatedReservations += linkedReservations.length;
      console.log(`   🔗 ${linkedReservations.length} reservas vinculadas à conta ${accountNumber}`);
      console.log(`   💰 Valor da conta: R$ ${totalValue.toFixed(2)}`);
      console.log('');
      
      consolidatedAccounts++;
    }
    
    console.log('📈 3. VERIFICAÇÃO E ESTATÍSTICAS FINAIS\n');
    
    // Verificar resultados
    const finalStats = await sql`
      SELECT 
        COUNT(DISTINCT ca.id) as total_accounts,
        COUNT(r.id) as linked_reservations,
        SUM(ca.total_amount::numeric) as total_credit_value,
        COUNT(CASE WHEN r.type = 'credit_account' THEN 1 END) as credit_reservations
      FROM credit_accounts ca
      LEFT JOIN reservations r ON ca.id = r.credit_account_id
      WHERE ca.status = 'active'
    `;
    
    const orphanReservations = await sql`
      SELECT COUNT(*) as count 
      FROM reservations 
      WHERE status = 'active' 
        AND (type IS NULL OR type = 'simple')
    `;
    
    console.log('✅ CONSOLIDAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('');
    console.log('📊 Estatísticas finais:');
    console.log(`   Contas de crediário ativas: ${finalStats[0].total_accounts}`);
    console.log(`   Reservas vinculadas: ${finalStats[0].linked_reservations}`);
    console.log(`   Valor total em crediário: R$ ${parseFloat(finalStats[0].total_credit_value || 0).toFixed(2)}`);
    console.log(`   Reservas órfãs restantes: ${orphanReservations[0].count}`);
    console.log('');
    console.log('🎯 Resultado do processo:');
    console.log(`   ✅ ${consolidatedAccounts} contas consolidadas`);
    console.log(`   ✅ ${consolidatedReservations} reservas organizadas`);
    console.log(`   ✅ Sistema de numeração implementado (CR001, CR002...)`);
    
    // Listar contas criadas
    const createdAccounts = await sql`
      SELECT 
        ca.account_number,
        c.name as customer_name,
        ca.total_amount,
        COUNT(r.id) as reservations_count
      FROM credit_accounts ca
      JOIN customers c ON ca.customer_id = c.id
      LEFT JOIN reservations r ON ca.id = r.credit_account_id
      WHERE ca.status = 'active'
      GROUP BY ca.id, ca.account_number, c.name, ca.total_amount
      ORDER BY ca.account_number
    `;
    
    console.log('\n🏷️ Contas de crediário criadas:');
    createdAccounts.forEach((account, index) => {
      console.log(`   ${index + 1}. ${account.account_number} - ${account.customer_name}`);
      console.log(`      Valor: R$ ${parseFloat(account.total_amount).toFixed(2)}`);
      console.log(`      Reservas: ${account.reservations_count}`);
    });
    
    await sql.end();
    
    console.log('\n' + '=' .repeat(70));
    console.log('🎉 FASE 3 CONCLUÍDA!');
    console.log('📄 Sistema de crediário totalmente organizado e estruturado!');
    
  } catch (error) {
    console.error('❌ Erro durante consolidação:', error);
    await sql.end();
    process.exit(1);
  }
}

consolidateReservations();