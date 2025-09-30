import postgres from 'postgres';
import 'dotenv/config';

async function createCreditAccountItemsTable() {
  console.log('🔄 Criando tabela credit_account_items...');
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL não encontrada');
    process.exit(1);
  }
  
  const sql = postgres(databaseUrl, {
    max: 3,
    ssl: 'require' as const,
    connect_timeout: 30,
  });
  
  try {
    // Verificar se a tabela já existe
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'credit_account_items'
      );
    `;
    
    if (tableExists[0].exists) {
      console.log('✅ Tabela credit_account_items já existe!');
      return;
    }
    
    // Criar a tabela de itens da conta de crediário
    await sql`
      CREATE TABLE credit_account_items (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        credit_account_id varchar NOT NULL,
        product_id varchar NOT NULL,
        product_name text NOT NULL,
        quantity integer NOT NULL,
        unit_price numeric(10, 2) NOT NULL,
        total_price numeric(10, 2) NOT NULL,
        created_at timestamp DEFAULT now()
      );
    `;

    // Adicionar foreign keys
    await sql`
      ALTER TABLE credit_account_items 
      ADD CONSTRAINT credit_account_items_credit_account_id_fk 
      FOREIGN KEY (credit_account_id) REFERENCES credit_accounts(id) ON DELETE cascade;
    `;

    await sql`
      ALTER TABLE credit_account_items 
      ADD CONSTRAINT credit_account_items_product_id_fk 
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE no action;
    `;

    // Criar índices
    await sql`
      CREATE INDEX credit_account_items_account_idx ON credit_account_items (credit_account_id);
    `;

    await sql`
      CREATE INDEX credit_account_items_product_idx ON credit_account_items (product_id);
    `;

    console.log('✅ Tabela credit_account_items criada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Executar a migração
createCreditAccountItemsTable()
  .then(() => {
    console.log('🎉 Migração concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha na migração:', error);
    process.exit(1);
  });