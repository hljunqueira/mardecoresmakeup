import { sql } from 'drizzle-orm';
import { pgTable, text, varchar, decimal, integer, boolean, timestamp, index, jsonb } from 'drizzle-orm/pg-core';
import pkg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();
const { Client } = pkg;

// Configuração da conexão
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function createTables() {
  try {
    await client.connect();
    console.log('🔗 Conectado ao banco de dados Supabase');

    // Criar tabelas na ordem correta (considerando dependências)
    console.log('📦 Criando tabelas...');

    // 1. Tabela de usuários/administradores
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        username text NOT NULL UNIQUE,
        password text NOT NULL,
        role text DEFAULT 'admin',
        created_at timestamp DEFAULT NOW(),
        last_login_at timestamp
      );
    `);
    console.log('✅ Tabela users criada');

    // 2. Tabela de clientes
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        email text UNIQUE NOT NULL,
        phone text,
        date_of_birth text,
        cpf text UNIQUE,
        total_orders integer DEFAULT 0,
        total_spent decimal(12,2) DEFAULT 0,
        last_order_at timestamp,
        created_at timestamp DEFAULT NOW() NOT NULL,
        updated_at timestamp DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS customers_email_idx ON customers(email);
      CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone);
      CREATE INDEX IF NOT EXISTS customers_cpf_idx ON customers(cpf);
    `);
    console.log('✅ Tabela customers criada');

    // 3. Endereços dos clientes
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_addresses (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id varchar NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        label text NOT NULL,
        street text NOT NULL,
        number text NOT NULL,
        complement text,
        neighborhood text NOT NULL,
        city text NOT NULL,
        state text NOT NULL,
        zip_code text NOT NULL,
        is_default boolean DEFAULT false,
        created_at timestamp DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS customer_addresses_customer_idx ON customer_addresses(customer_id);
      CREATE INDEX IF NOT EXISTS customer_addresses_zip_idx ON customer_addresses(zip_code);
    `);
    console.log('✅ Tabela customer_addresses criada');

    // 4. Tabela de produtos
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        description text,
        price decimal(10,2) NOT NULL,
        original_price decimal(10,2),
        stock integer DEFAULT 0,
        min_stock integer DEFAULT 5,
        images text[],
        category text,
        brand text,
        sku text UNIQUE,
        tags text[],
        featured boolean DEFAULT false,
        active boolean DEFAULT true,
        rating decimal(2,1) DEFAULT 0,
        review_count integer DEFAULT 0,
        weight decimal(8,2),
        dimensions text,
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS products_category_idx ON products(category);
      CREATE INDEX IF NOT EXISTS products_featured_idx ON products(featured);
      CREATE INDEX IF NOT EXISTS products_active_idx ON products(active);
    `);
    console.log('✅ Tabela products criada');

    // 5. Múltiplas imagens por produto
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id varchar NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        url text NOT NULL,
        alt_text text,
        is_primary boolean DEFAULT false,
        sort_order integer DEFAULT 0,
        created_at timestamp DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS product_images_product_idx ON product_images(product_id);
      CREATE INDEX IF NOT EXISTS product_images_primary_idx ON product_images(is_primary);
    `);
    console.log('✅ Tabela product_images criada');

    // 6. Tabela de cupons
    await client.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        code text NOT NULL UNIQUE,
        type text NOT NULL,
        value decimal(10,2) NOT NULL,
        active boolean DEFAULT true,
        expires_at timestamp,
        usage_limit integer,
        used_count integer DEFAULT 0,
        minimum_amount decimal(10,2),
        max_discount decimal(10,2),
        applicable_categories text[],
        created_at timestamp DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS coupons_active_idx ON coupons(active);
      CREATE INDEX IF NOT EXISTS coupons_expires_idx ON coupons(expires_at);
    `);
    console.log('✅ Tabela coupons criada');

    // 7. Pedidos
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id varchar NOT NULL REFERENCES customers(id),
        order_number text UNIQUE NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        payment_method text,
        payment_status text DEFAULT 'pending',
        subtotal decimal(12,2) NOT NULL,
        discount_amount decimal(12,2) DEFAULT 0,
        shipping_cost decimal(12,2) DEFAULT 0,
        total decimal(12,2) NOT NULL,
        coupon_id varchar REFERENCES coupons(id),
        shipping_address_id varchar REFERENCES customer_addresses(id),
        notes text,
        delivery_date timestamp,
        created_at timestamp DEFAULT NOW() NOT NULL,
        updated_at timestamp DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders(customer_id);
      CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
      CREATE INDEX IF NOT EXISTS orders_number_idx ON orders(order_number);
      CREATE INDEX IF NOT EXISTS orders_date_idx ON orders(created_at);
    `);
    console.log('✅ Tabela orders criada');

    // 8. Itens dos pedidos
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id varchar NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id varchar NOT NULL REFERENCES products(id),
        quantity integer NOT NULL,
        unit_price decimal(10,2) NOT NULL,
        total_price decimal(12,2) NOT NULL,
        product_snapshot jsonb
      );
      CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS order_items_product_idx ON order_items(product_id);
    `);
    console.log('✅ Tabela order_items criada');

    // 9. Avaliações dos produtos
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_reviews (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id varchar NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        customer_id varchar NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        order_id varchar REFERENCES orders(id),
        rating integer NOT NULL,
        title text,
        comment text,
        is_verified_purchase boolean DEFAULT false,
        is_approved boolean DEFAULT true,
        created_at timestamp DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS reviews_product_idx ON product_reviews(product_id);
      CREATE INDEX IF NOT EXISTS reviews_customer_idx ON product_reviews(customer_id);
      CREATE INDEX IF NOT EXISTS reviews_rating_idx ON product_reviews(rating);
      CREATE INDEX IF NOT EXISTS reviews_approved_idx ON product_reviews(is_approved);
    `);
    console.log('✅ Tabela product_reviews criada');

    // 10. Uso de cupons
    await client.query(`
      CREATE TABLE IF NOT EXISTS coupon_usage (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        coupon_id varchar NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
        customer_id varchar REFERENCES customers(id),
        order_id varchar REFERENCES orders(id),
        discount_amount decimal(10,2) NOT NULL,
        used_at timestamp DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS coupon_usage_coupon_idx ON coupon_usage(coupon_id);
      CREATE INDEX IF NOT EXISTS coupon_usage_customer_idx ON coupon_usage(customer_id);
      CREATE INDEX IF NOT EXISTS coupon_usage_date_idx ON coupon_usage(used_at);
    `);
    console.log('✅ Tabela coupon_usage criada');

    // 11. Carrinho de compras
    await client.query(`
      CREATE TABLE IF NOT EXISTS shopping_cart (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id varchar REFERENCES customers(id) ON DELETE CASCADE,
        session_id text,
        product_id varchar NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity integer NOT NULL DEFAULT 1,
        created_at timestamp DEFAULT NOW() NOT NULL,
        updated_at timestamp DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS cart_customer_idx ON shopping_cart(customer_id);
      CREATE INDEX IF NOT EXISTS cart_session_idx ON shopping_cart(session_id);
      CREATE INDEX IF NOT EXISTS cart_product_idx ON shopping_cart(product_id);
    `);
    console.log('✅ Tabela shopping_cart criada');

    // 12. Tabela de coleções
    await client.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        description text,
        image text,
        products text[],
        featured boolean DEFAULT false,
        active boolean DEFAULT true,
        sort_order integer DEFAULT 0,
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      );
    `);
    console.log('✅ Tabela collections criada');

    // 13. Tabela de fornecedores
    await client.query(`
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
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      );
    `);
    console.log('✅ Tabela suppliers criada');

    // 14. Transações financeiras
    await client.query(`
      CREATE TABLE IF NOT EXISTS financial_transactions (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        type text NOT NULL,
        category text NOT NULL,
        subcategory text,
        description text NOT NULL,
        amount decimal(10,2) NOT NULL,
        date timestamp DEFAULT NOW(),
        status text DEFAULT 'pending',
        payment_method text,
        reference text,
        supplier_id varchar,
        due_date timestamp,
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS transactions_type_idx ON financial_transactions(type);
      CREATE INDEX IF NOT EXISTS transactions_status_idx ON financial_transactions(status);
      CREATE INDEX IF NOT EXISTS transactions_date_idx ON financial_transactions(date);
      CREATE INDEX IF NOT EXISTS transactions_category_idx ON financial_transactions(category);
    `);
    console.log('✅ Tabela financial_transactions criada');

    // 15. Histórico de estoque
    await client.query(`
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
        created_at timestamp DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS stock_history_product_idx ON stock_history(product_id);
      CREATE INDEX IF NOT EXISTS stock_history_date_idx ON stock_history(created_at);
    `);
    console.log('✅ Tabela stock_history criada');

    // 16. Analytics/Métricas
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        date timestamp NOT NULL,
        metric text NOT NULL,
        value integer NOT NULL,
        metadata text,
        created_at timestamp DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS analytics_date_metric_idx ON analytics(date, metric);
    `);
    console.log('✅ Tabela analytics criada');

    console.log('🎉 Todas as tabelas foram criadas com sucesso!');
    console.log('\n📊 Resumo das tabelas criadas:');
    console.log('   • users (administradores)');
    console.log('   • customers (clientes)');
    console.log('   • customer_addresses (endereços)');
    console.log('   • products (produtos)');
    console.log('   • product_images (imagens múltiplas)');
    console.log('   • product_reviews (avaliações)');
    console.log('   • coupons (cupons de desconto)');
    console.log('   • orders (pedidos)');
    console.log('   • order_items (itens dos pedidos)');
    console.log('   • coupon_usage (uso de cupons)');
    console.log('   • shopping_cart (carrinho de compras)');
    console.log('   • collections (coleções/promoções)');
    console.log('   • suppliers (fornecedores)');
    console.log('   • financial_transactions (financeiro)');
    console.log('   • stock_history (histórico de estoque)');
    console.log('   • analytics (métricas/analytics)');
    console.log('\n🚀 Banco de dados COMPLETO pronto para produção!');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Executar diretamente
createTables();