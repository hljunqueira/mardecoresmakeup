CREATE TABLE "credit_accounts" (
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
--> statement-breakpoint
CREATE TABLE "credit_payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credit_account_id" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_method" text,
	"installment_number" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_name" text NOT NULL,
	"product_name" text NOT NULL,
	"phone" text NOT NULL,
	"status" text DEFAULT 'pending',
	"notes" text,
	"contacted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"customer_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"payment_date" timestamp NOT NULL,
	"status" text DEFAULT 'active',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"type" text DEFAULT 'simple',
	"credit_account_id" varchar,
	"customer_id" varchar
);
--> statement-breakpoint
ALTER TABLE "financial_transactions" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "credit_accounts" ADD CONSTRAINT "credit_accounts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_payments" ADD CONSTRAINT "credit_payments_credit_account_id_credit_accounts_id_fk" FOREIGN KEY ("credit_account_id") REFERENCES "public"."credit_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_accounts_customer_idx" ON "credit_accounts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "credit_accounts_status_idx" ON "credit_accounts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "credit_accounts_payment_date_idx" ON "credit_accounts" USING btree ("next_payment_date");--> statement-breakpoint
CREATE INDEX "credit_accounts_number_idx" ON "credit_accounts" USING btree ("account_number");--> statement-breakpoint
CREATE INDEX "credit_payments_account_idx" ON "credit_payments" USING btree ("credit_account_id");--> statement-breakpoint
CREATE INDEX "credit_payments_date_idx" ON "credit_payments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "credit_payments_installment_idx" ON "credit_payments" USING btree ("installment_number");--> statement-breakpoint
CREATE INDEX "product_requests_status_idx" ON "product_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "product_requests_date_idx" ON "product_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "reservations_product_idx" ON "reservations" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "reservations_status_idx" ON "reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reservations_payment_date_idx" ON "reservations" USING btree ("payment_date");--> statement-breakpoint
CREATE INDEX "reservations_type_idx" ON "reservations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "reservations_credit_account_idx" ON "reservations" USING btree ("credit_account_id");--> statement-breakpoint
CREATE INDEX "reservations_customer_idx" ON "reservations" USING btree ("customer_id");