import { pgTable, index, varchar, text, timestamp, jsonb, unique, foreignKey, boolean, integer, numeric } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const siteViews = pgTable("site_views", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	sessionId: text("session_id"),
	page: text().notNull(),
	userAgent: text("user_agent"),
	ipAddress: text("ip_address"),
	timestamp: timestamp({ mode: 'string' }).defaultNow(),
	metadata: jsonb(),
}, (table) => [
	index("site_views_page_idx").using("btree", table.page.asc().nullsLast().op("text_ops")),
	index("site_views_session_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("site_views_timestamp_idx").using("btree", table.timestamp.asc().nullsLast().op("timestamp_ops")),
]);

export const productRequests = pgTable("product_requests", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	customerName: text("customer_name").notNull(),
	productName: text("product_name").notNull(),
	phone: text().notNull(),
	status: text().default('pending'),
	notes: text(),
	contactedAt: timestamp("contacted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("product_requests_date_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("product_requests_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const users = pgTable("users", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	role: text().default('admin'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
}, (table) => [
	unique("users_username_unique").on(table.username),
]);

export const customerAddresses = pgTable("customer_addresses", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	customerId: varchar("customer_id").notNull(),
	label: text().notNull(),
	street: text().notNull(),
	number: text().notNull(),
	complement: text(),
	neighborhood: text().notNull(),
	city: text().notNull(),
	state: text().notNull(),
	zipCode: text("zip_code").notNull(),
	isDefault: boolean("is_default").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("customer_addresses_customer_idx").using("btree", table.customerId.asc().nullsLast().op("text_ops")),
	index("customer_addresses_zip_idx").using("btree", table.zipCode.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "customer_addresses_customer_id_customers_id_fk"
		}).onDelete("cascade"),
]);

export const customers = pgTable("customers", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	phone: text(),
	dateOfBirth: text("date_of_birth"),
	cpf: text(),
	totalOrders: integer("total_orders").default(0),
	totalSpent: numeric("total_spent", { precision: 12, scale:  2 }).default('0'),
	lastOrderAt: timestamp("last_order_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("customers_cpf_idx").using("btree", table.cpf.asc().nullsLast().op("text_ops")),
	index("customers_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("customers_phone_idx").using("btree", table.phone.asc().nullsLast().op("text_ops")),
	unique("customers_email_unique").on(table.email),
	unique("customers_cpf_unique").on(table.cpf),
]);

export const products = pgTable("products", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	originalPrice: numeric("original_price", { precision: 10, scale:  2 }),
	stock: integer().default(0),
	minStock: integer("min_stock").default(5),
	images: text().array(),
	category: text(),
	brand: text(),
	sku: text(),
	tags: text().array(),
	featured: boolean().default(false),
	active: boolean().default(true),
	rating: numeric({ precision: 2, scale:  1 }).default('0'),
	reviewCount: integer("review_count").default(0),
	weight: numeric({ precision: 8, scale:  2 }),
	dimensions: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("products_active_idx").using("btree", table.active.asc().nullsLast().op("bool_ops")),
	index("products_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("products_featured_idx").using("btree", table.featured.asc().nullsLast().op("bool_ops")),
	unique("products_sku_unique").on(table.sku),
]);

export const productImages = pgTable("product_images", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	productId: varchar("product_id").notNull(),
	url: text().notNull(),
	altText: text("alt_text"),
	isPrimary: boolean("is_primary").default(false),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("product_images_primary_idx").using("btree", table.isPrimary.asc().nullsLast().op("bool_ops")),
	index("product_images_product_idx").using("btree", table.productId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_images_product_id_products_id_fk"
		}).onDelete("cascade"),
]);

export const coupons = pgTable("coupons", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	code: text().notNull(),
	type: text().notNull(),
	value: numeric({ precision: 10, scale:  2 }).notNull(),
	active: boolean().default(true),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	usageLimit: integer("usage_limit"),
	usedCount: integer("used_count").default(0),
	minimumAmount: numeric("minimum_amount", { precision: 10, scale:  2 }),
	maxDiscount: numeric("max_discount", { precision: 10, scale:  2 }),
	applicableCategories: text("applicable_categories").array(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("coupons_active_idx").using("btree", table.active.asc().nullsLast().op("bool_ops")),
	index("coupons_expires_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamp_ops")),
	unique("coupons_code_unique").on(table.code),
]);

export const orderItems = pgTable("order_items", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	orderId: varchar("order_id").notNull(),
	productId: varchar("product_id").notNull(),
	quantity: integer().notNull(),
	unitPrice: numeric("unit_price", { precision: 10, scale:  2 }).notNull(),
	totalPrice: numeric("total_price", { precision: 12, scale:  2 }).notNull(),
	productSnapshot: jsonb("product_snapshot"),
}, (table) => [
	index("order_items_order_idx").using("btree", table.orderId.asc().nullsLast().op("text_ops")),
	index("order_items_product_idx").using("btree", table.productId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_items_order_id_orders_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "order_items_product_id_products_id_fk"
		}),
]);

export const couponUsage = pgTable("coupon_usage", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	couponId: varchar("coupon_id").notNull(),
	customerId: varchar("customer_id"),
	orderId: varchar("order_id"),
	discountAmount: numeric("discount_amount", { precision: 10, scale:  2 }).notNull(),
	usedAt: timestamp("used_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("coupon_usage_coupon_idx").using("btree", table.couponId.asc().nullsLast().op("text_ops")),
	index("coupon_usage_customer_idx").using("btree", table.customerId.asc().nullsLast().op("text_ops")),
	index("coupon_usage_date_idx").using("btree", table.usedAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.couponId],
			foreignColumns: [coupons.id],
			name: "coupon_usage_coupon_id_coupons_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "coupon_usage_customer_id_customers_id_fk"
		}),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "coupon_usage_order_id_orders_id_fk"
		}),
]);

export const collections = pgTable("collections", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	image: text(),
	products: text().array(),
	featured: boolean().default(false),
	active: boolean().default(true),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const suppliers = pgTable("suppliers", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	email: text(),
	phone: text(),
	whatsapp: text(),
	cnpj: text(),
	address: text(),
	city: text(),
	state: text(),
	zipCode: text("zip_code"),
	website: text(),
	contactPerson: text("contact_person"),
	notes: text(),
	active: boolean().default(true),
	paymentTerms: text("payment_terms"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const stockHistory = pgTable("stock_history", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	productId: varchar("product_id").notNull(),
	type: text().notNull(),
	quantity: integer().notNull(),
	previousStock: integer("previous_stock").notNull(),
	newStock: integer("new_stock").notNull(),
	reason: text(),
	reference: text(),
	userId: varchar("user_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("stock_history_date_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("stock_history_product_idx").using("btree", table.productId.asc().nullsLast().op("text_ops")),
]);

export const analytics = pgTable("analytics", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	metric: text().notNull(),
	value: integer().notNull(),
	metadata: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("analytics_date_metric_idx").using("btree", table.date.asc().nullsLast().op("text_ops"), table.metric.asc().nullsLast().op("text_ops")),
]);

export const financialTransactions = pgTable("financial_transactions", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	type: text().notNull(),
	category: text().notNull(),
	subcategory: text(),
	description: text().notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	date: timestamp({ mode: 'string' }).defaultNow(),
	status: text().default('pending'),
	paymentMethod: text("payment_method"),
	reference: text(),
	supplierId: varchar("supplier_id"),
	dueDate: timestamp("due_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	metadata: jsonb(),
}, (table) => [
	index("transactions_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("transactions_date_idx").using("btree", table.date.asc().nullsLast().op("timestamp_ops")),
	index("transactions_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("transactions_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const orders = pgTable("orders", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	customerId: varchar("customer_id").notNull(),
	orderNumber: text("order_number").notNull(),
	status: text().default('pending').notNull(),
	paymentMethod: text("payment_method"),
	paymentStatus: text("payment_status").default('pending'),
	subtotal: numeric({ precision: 12, scale:  2 }).notNull(),
	discountAmount: numeric("discount_amount", { precision: 12, scale:  2 }).default('0'),
	shippingCost: numeric("shipping_cost", { precision: 12, scale:  2 }).default('0'),
	total: numeric({ precision: 12, scale:  2 }).notNull(),
	couponId: varchar("coupon_id"),
	shippingAddressId: varchar("shipping_address_id"),
	notes: text(),
	deliveryDate: timestamp("delivery_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("orders_customer_idx").using("btree", table.customerId.asc().nullsLast().op("text_ops")),
	index("orders_date_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("orders_number_idx").using("btree", table.orderNumber.asc().nullsLast().op("text_ops")),
	index("orders_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.couponId],
			foreignColumns: [coupons.id],
			name: "orders_coupon_id_coupons_id_fk"
		}),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "orders_customer_id_customers_id_fk"
		}),
	foreignKey({
			columns: [table.shippingAddressId],
			foreignColumns: [customerAddresses.id],
			name: "orders_shipping_address_id_customer_addresses_id_fk"
		}),
	unique("orders_order_number_unique").on(table.orderNumber),
]);

export const reservations = pgTable("reservations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	productId: varchar("product_id").notNull(),
	customerName: text("customer_name").notNull(),
	quantity: integer().notNull(),
	unitPrice: numeric("unit_price", { precision: 10, scale:  2 }).notNull(),
	paymentDate: timestamp("payment_date", { mode: 'string' }).notNull(),
	status: text().default('active'),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	type: text().default('simple'),
	creditAccountId: varchar("credit_account_id"),
	customerId: varchar("customer_id"),
}, (table) => [
	index("reservations_credit_account_idx").using("btree", table.creditAccountId.asc().nullsLast().op("text_ops")),
	index("reservations_customer_idx").using("btree", table.customerId.asc().nullsLast().op("text_ops")),
	index("reservations_payment_date_idx").using("btree", table.paymentDate.asc().nullsLast().op("timestamp_ops")),
	index("reservations_product_idx").using("btree", table.productId.asc().nullsLast().op("text_ops")),
	index("reservations_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("reservations_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const creditPayments = pgTable("credit_payments", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	creditAccountId: varchar("credit_account_id").notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	paymentMethod: text("payment_method"),
	installmentNumber: integer("installment_number"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("credit_payments_account_idx").using("btree", table.creditAccountId.asc().nullsLast().op("text_ops")),
	index("credit_payments_date_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("credit_payments_installment_idx").using("btree", table.installmentNumber.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.creditAccountId],
			foreignColumns: [creditAccounts.id],
			name: "credit_payments_credit_account_id_credit_accounts_id_fk"
		}),
]);

export const creditAccounts = pgTable("credit_accounts", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	customerId: varchar("customer_id").notNull(),
	accountNumber: text("account_number").notNull(),
	status: text().default('active'),
	totalAmount: numeric("total_amount", { precision: 12, scale:  2 }).default('0'),
	paidAmount: numeric("paid_amount", { precision: 12, scale:  2 }).default('0'),
	remainingAmount: numeric("remaining_amount", { precision: 12, scale:  2 }).default('0'),
	installments: integer().default(1),
	installmentValue: numeric("installment_value", { precision: 10, scale:  2 }),
	paymentFrequency: text("payment_frequency").default('monthly'),
	nextPaymentDate: timestamp("next_payment_date", { mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	closedAt: timestamp("closed_at", { mode: 'string' }),
}, (table) => [
	index("credit_accounts_customer_idx").using("btree", table.customerId.asc().nullsLast().op("text_ops")),
	index("credit_accounts_number_idx").using("btree", table.accountNumber.asc().nullsLast().op("text_ops")),
	index("credit_accounts_payment_date_idx").using("btree", table.nextPaymentDate.asc().nullsLast().op("timestamp_ops")),
	index("credit_accounts_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "credit_accounts_customer_id_customers_id_fk"
		}),
	unique("credit_accounts_account_number_unique").on(table.accountNumber),
]);

export const productReviews = pgTable("product_reviews", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	productId: varchar("product_id").notNull(),
	customerId: varchar("customer_id").notNull(),
	orderId: varchar("order_id"),
	rating: integer().notNull(),
	title: text(),
	comment: text(),
	isVerifiedPurchase: boolean("is_verified_purchase").default(false),
	isApproved: boolean("is_approved").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("reviews_approved_idx").using("btree", table.isApproved.asc().nullsLast().op("bool_ops")),
	index("reviews_customer_idx").using("btree", table.customerId.asc().nullsLast().op("text_ops")),
	index("reviews_product_idx").using("btree", table.productId.asc().nullsLast().op("text_ops")),
	index("reviews_rating_idx").using("btree", table.rating.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "product_reviews_customer_id_customers_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "product_reviews_order_id_orders_id_fk"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_reviews_product_id_products_id_fk"
		}).onDelete("cascade"),
]);

export const shoppingCart = pgTable("shopping_cart", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	customerId: varchar("customer_id"),
	sessionId: text("session_id"),
	productId: varchar("product_id").notNull(),
	quantity: integer().default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("cart_customer_idx").using("btree", table.customerId.asc().nullsLast().op("text_ops")),
	index("cart_product_idx").using("btree", table.productId.asc().nullsLast().op("text_ops")),
	index("cart_session_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "shopping_cart_customer_id_customers_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "shopping_cart_product_id_products_id_fk"
		}).onDelete("cascade"),
]);
