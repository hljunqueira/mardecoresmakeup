-- Criar tabela de solicitações de produtos
CREATE TABLE IF NOT EXISTS "product_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_name" text NOT NULL,
	"product_name" text NOT NULL,
	"phone" text NOT NULL,
	"status" text DEFAULT 'pending',
	"notes" text,
	"contacted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS "product_requests_status_idx" ON "product_requests" ("status");
CREATE INDEX IF NOT EXISTS "product_requests_date_idx" ON "product_requests" ("created_at");