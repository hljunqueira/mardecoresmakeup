-- Aplicando migração manual das tabelas de crediário

-- Primeira verificar se as tabelas já existem
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('customers', 'credit_accounts', 'credit_payments');

-- Tabela de Clientes (se não existir)
CREATE TABLE IF NOT EXISTS "customers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text UNIQUE NOT NULL,
	"phone" text,
	"date_of_birth" text,
	"cpf" text UNIQUE,
	"total_orders" integer DEFAULT 0,
	"total_spent" numeric(12, 2) DEFAULT '0',
	"last_order_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Tabela de Contas de Crediário
CREATE TABLE IF NOT EXISTS "credit_accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"account_number" text NOT NULL,
	"status" text DEFAULT 'active',
	"total_amount" numeric(12, 2) DEFAULT '0',
	"paid_amount" numeric(12, 2) DEFAULT '0',
	"remaining_amount" numeric(12, 2) DEFAULT '0',
	"installments" integer DEFAULT 1,
	"installment_value" numeric(10, 2),
	"payment_frequency" text DEFAULT 'monthly',
	"next_payment_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"closed_at" timestamp,
	CONSTRAINT "credit_accounts_account_number_unique" UNIQUE("account_number")
);

-- Tabela de Pagamentos de Crediário
CREATE TABLE IF NOT EXISTS "credit_payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credit_account_id" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_method" text,
	"installment_number" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);

-- Adicionar colunas à tabela de reservas se não existirem
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reservations' AND column_name='type') THEN
        ALTER TABLE "reservations" ADD COLUMN "type" text DEFAULT 'simple';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reservations' AND column_name='credit_account_id') THEN
        ALTER TABLE "reservations" ADD COLUMN "credit_account_id" varchar;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reservations' AND column_name='customer_id') THEN
        ALTER TABLE "reservations" ADD COLUMN "customer_id" varchar;
    END IF;
END $$;

-- Foreign Keys (se não existirem)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='credit_accounts_customer_id_customers_id_fk') THEN
        ALTER TABLE "credit_accounts" ADD CONSTRAINT "credit_accounts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='credit_payments_credit_account_id_credit_accounts_id_fk') THEN
        ALTER TABLE "credit_payments" ADD CONSTRAINT "credit_payments_credit_account_id_credit_accounts_id_fk" FOREIGN KEY ("credit_account_id") REFERENCES "public"."credit_accounts"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;

-- Índices necessários
CREATE INDEX IF NOT EXISTS "customers_email_idx" ON "customers" USING btree ("email");
CREATE INDEX IF NOT EXISTS "customers_phone_idx" ON "customers" USING btree ("phone");
CREATE INDEX IF NOT EXISTS "customers_cpf_idx" ON "customers" USING btree ("cpf");

CREATE INDEX IF NOT EXISTS "credit_accounts_customer_idx" ON "credit_accounts" USING btree ("customer_id");
CREATE INDEX IF NOT EXISTS "credit_accounts_status_idx" ON "credit_accounts" USING btree ("status");
CREATE INDEX IF NOT EXISTS "credit_accounts_payment_date_idx" ON "credit_accounts" USING btree ("next_payment_date");
CREATE INDEX IF NOT EXISTS "credit_accounts_number_idx" ON "credit_accounts" USING btree ("account_number");

CREATE INDEX IF NOT EXISTS "credit_payments_account_idx" ON "credit_payments" USING btree ("credit_account_id");
CREATE INDEX IF NOT EXISTS "credit_payments_date_idx" ON "credit_payments" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "credit_payments_installment_idx" ON "credit_payments" USING btree ("installment_number");

CREATE INDEX IF NOT EXISTS "reservations_type_idx" ON "reservations" USING btree ("type");
CREATE INDEX IF NOT EXISTS "reservations_credit_account_idx" ON "reservations" USING btree ("credit_account_id");
CREATE INDEX IF NOT EXISTS "reservations_customer_idx" ON "reservations" USING btree ("customer_id");

-- Inserir um cliente de teste
INSERT INTO "customers" ("name", "email", "phone") 
VALUES ('Cliente Teste', 'teste@mardecores.com', '11999999999')
ON CONFLICT (email) DO NOTHING;

SELECT 'Migração aplicada com sucesso!' as resultado;