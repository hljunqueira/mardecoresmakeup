import 'dotenv/config';
import postgres from 'postgres';

async function createTables() {
  console.log('🚀 Criando tabelas no Supabase...\n');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não configurada');
    process.exit(1);
  }
  
  const sql = postgres(process.env.DATABASE_URL);
  
  try {
    console.log('📋 Executando SQL para criar tabelas...\n');
    
    // Criar tabela users (melhorada)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        username text NOT NULL UNIQUE,
        password text NOT NULL,
        role text DEFAULT 'admin',
        created_at timestamp DEFAULT now(),
        last_login_at timestamp
      )
    `;
    console.log('✅ Tabela users criada');
    
    // Criar tabela products (melhorada)
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        description text,
        price numeric(10, 2) NOT NULL,
        original_price numeric(10, 2),
        stock integer DEFAULT 0,
        min_stock integer DEFAULT 5,
        images text[],
        category text,
        brand text,
        sku text UNIQUE,
        tags text[],
        featured boolean DEFAULT false,
        active boolean DEFAULT true,
        rating numeric(2, 1) DEFAULT '0',
        review_count integer DEFAULT 0,
        weight numeric(8, 2),
        dimensions text,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS products_category_idx ON products(category)`;
    await sql`CREATE INDEX IF NOT EXISTS products_featured_idx ON products(featured)`;
    await sql`CREATE INDEX IF NOT EXISTS products_active_idx ON products(active)`;
    console.log('✅ Tabela products criada com índices');
    
    // Criar tabela collections (melhorada)
    await sql`
      CREATE TABLE IF NOT EXISTS collections (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        description text,
        image text,
        products text[],
        featured boolean DEFAULT false,
        active boolean DEFAULT true,
        sort_order integer DEFAULT 0,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `;
    console.log('✅ Tabela collections criada');
    
    // Criar tabela coupons (melhorada)
    await sql`
      CREATE TABLE IF NOT EXISTS coupons (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        code text NOT NULL UNIQUE,
        type text NOT NULL,
        value numeric(10, 2) NOT NULL,
        active boolean DEFAULT true,
        expires_at timestamp,
        usage_limit integer,
        used_count integer DEFAULT 0,
        minimum_amount numeric(10, 2),
        max_discount numeric(10, 2),
        applicable_categories text[],
        created_at timestamp DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS coupons_active_idx ON coupons(active)`;
    await sql`CREATE INDEX IF NOT EXISTS coupons_expires_idx ON coupons(expires_at)`;
    console.log('✅ Tabela coupons criada com índices');
    
    // Criar tabela financial_transactions (melhorada)
    await sql`
      CREATE TABLE IF NOT EXISTS financial_transactions (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        type text NOT NULL,
        category text NOT NULL,
        subcategory text,
        description text NOT NULL,
        amount numeric(10, 2) NOT NULL,
        date timestamp DEFAULT now(),
        status text DEFAULT 'pending',
        payment_method text,
        reference text,
        supplier_id varchar,
        due_date timestamp,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS transactions_type_idx ON financial_transactions(type)`;
    await sql`CREATE INDEX IF NOT EXISTS transactions_status_idx ON financial_transactions(status)`;
    await sql`CREATE INDEX IF NOT EXISTS transactions_date_idx ON financial_transactions(date)`;
    await sql`CREATE INDEX IF NOT EXISTS transactions_category_idx ON financial_transactions(category)`;
    console.log('✅ Tabela financial_transactions criada com índices');
    
    // Criar tabela suppliers (melhorada)
    await sql`
      CREATE TABLE IF NOT EXISTS suppliers (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        email text,
        phone text,
        whatsapp text,
        cnpj text,
        address text,
        city text,
        state text,
        zip_code text,
        website text,
        contact_person text,
        notes text,
        active boolean DEFAULT true,
        payment_terms text,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `;
    console.log('✅ Tabela suppliers criada');
    
    // Criar tabela stock_history (nova)
    await sql`
      CREATE TABLE IF NOT EXISTS stock_history (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id varchar NOT NULL,
        type text NOT NULL,
        quantity integer NOT NULL,
        previous_stock integer NOT NULL,
        new_stock integer NOT NULL,
        reason text,
        reference text,
        user_id varchar,
        created_at timestamp DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS stock_history_product_idx ON stock_history(product_id)`;
    await sql`CREATE INDEX IF NOT EXISTS stock_history_date_idx ON stock_history(created_at)`;
    console.log('✅ Tabela stock_history criada com índices');
    
    // Criar tabela analytics (nova)
    await sql`
      CREATE TABLE IF NOT EXISTS analytics (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        date timestamp NOT NULL,
        metric text NOT NULL,
        value integer NOT NULL,
        metadata text,
        created_at timestamp DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS analytics_date_metric_idx ON analytics(date, metric)`;
    console.log('✅ Tabela analytics criada com índices');
    
    // Verificar tabelas criadas
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    console.log('\n📊 Tabelas criadas no banco:');
    tables.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });
    
    await sql.end();
    
    console.log('\n🎉 Todas as tabelas foram criadas com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. npm run db:seed     # Criar usuário admin');
    console.log('2. npm run dev:supabase # Iniciar com Supabase');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
    await sql.end();
    process.exit(1);
  }
}

createTables();