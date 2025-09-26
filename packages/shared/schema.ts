import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, boolean, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tabela de usuários/administradores
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("admin"), // 'admin' | 'manager'
  createdAt: timestamp("created_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

// Tabela de produtos
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  stock: integer("stock").default(0),
  minStock: integer("min_stock").default(5), // Alerta de estoque baixo
  images: text("images").array(),
  category: text("category"),
  brand: text("brand"), // Marca do produto
  sku: text("sku").unique(), // Código único do produto
  tags: text("tags").array(),
  featured: boolean("featured").default(false),
  active: boolean("active").default(true), // Produto ativo/inativo
  rating: decimal("rating", { precision: 2, scale: 1 }).default("0"),
  reviewCount: integer("review_count").default(0),
  weight: decimal("weight", { precision: 8, scale: 2 }), // Peso em gramas
  dimensions: text("dimensions"), // Dimensões (LxAxP em cm)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  categoryIdx: index("products_category_idx").on(table.category),
  featuredIdx: index("products_featured_idx").on(table.featured),
  activeIdx: index("products_active_idx").on(table.active),
}));

// Tabela de coleções
export const collections = pgTable("collections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  image: text("image"),
  products: text("products").array(), // Product IDs
  featured: boolean("featured").default(false),
  active: boolean("active").default(true),
  sortOrder: integer("sort_order").default(0), // Ordem de exibição
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabela de cupons
export const coupons = pgTable("coupons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  type: text("type").notNull(), // 'percentage' | 'fixed'
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  active: boolean("active").default(true),
  expiresAt: timestamp("expires_at"),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").default(0),
  minimumAmount: decimal("minimum_amount", { precision: 10, scale: 2 }), // Valor mínimo para uso
  maxDiscount: decimal("max_discount", { precision: 10, scale: 2 }), // Desconto máximo em reais
  applicableCategories: text("applicable_categories").array(), // Categorias aplicáveis
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  activeIdx: index("coupons_active_idx").on(table.active),
  expiresIdx: index("coupons_expires_idx").on(table.expiresAt),
}));

// Tabela de transações financeiras
export const financialTransactions = pgTable("financial_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'income' | 'expense'
  category: text("category").notNull(), // 'sale' | 'supplier' | 'marketing' | 'operational' | 'taxes'
  subcategory: text("subcategory"), // Subcategoria mais específica
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").defaultNow(),
  status: text("status").default("pending"), // 'pending' | 'completed' | 'cancelled'
  paymentMethod: text("payment_method"), // 'cash' | 'card' | 'pix' | 'bank_transfer'
  reference: text("reference"), // Número de nota fiscal, recibo, etc.
  metadata: jsonb("metadata"), // Dados extras em JSON para vendas reversíveis
  supplierId: varchar("supplier_id"), // FK para suppliers
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  typeIdx: index("transactions_type_idx").on(table.type),
  statusIdx: index("transactions_status_idx").on(table.status),
  dateIdx: index("transactions_date_idx").on(table.date),
  categoryIdx: index("transactions_category_idx").on(table.category),
}));

// Tabela de fornecedores
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  whatsapp: text("whatsapp"), // WhatsApp separado
  cnpj: text("cnpj"), // CNPJ do fornecedor
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  website: text("website"),
  contactPerson: text("contact_person"), // Pessoa de contato
  notes: text("notes"),
  active: boolean("active").default(true),
  paymentTerms: text("payment_terms"), // Condições de pagamento
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Nova tabela: Histórico de estoque
export const stockHistory = pgTable("stock_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  type: text("type").notNull(), // 'in' | 'out' | 'adjustment'
  quantity: integer("quantity").notNull(),
  previousStock: integer("previous_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  reason: text("reason"), // Motivo da movimentação
  reference: text("reference"), // Nota fiscal, venda, etc.
  userId: varchar("user_id"), // Quem fez a movimentação
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  productIdx: index("stock_history_product_idx").on(table.productId),
  dateIdx: index("stock_history_date_idx").on(table.createdAt),
}));

// Nova tabela: Reservas de produtos
export const reservations = pgTable("reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  customerName: text("customer_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(), // Data prevista de pagamento
  status: text("status").default("active"), // 'active' | 'sold' | 'cancelled' | 'returned'
  notes: text("notes"), // Observações da reserva
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"), // Data quando foi finalizada
}, (table) => ({
  productIdx: index("reservations_product_idx").on(table.productId),
  statusIdx: index("reservations_status_idx").on(table.status),
  paymentDateIdx: index("reservations_payment_date_idx").on(table.paymentDate),
}));

// Nova tabela: Analytics/Métricas
export const analytics = pgTable("analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  metric: text("metric").notNull(), // 'page_views' | 'product_views' | 'admin_logins'
  value: integer("value").notNull(),
  metadata: text("metadata"), // JSON string com dados extras
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  dateMetricIdx: index("analytics_date_metric_idx").on(table.date, table.metric),
}));

// Nova tabela: Visualizações do site
export const siteViews = pgTable("site_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id"), // ID da sessão do usuário
  page: text("page").notNull(), // Página visitada
  userAgent: text("user_agent"), // User agent do navegador
  ipAddress: text("ip_address"), // IP do visitante
  timestamp: timestamp("timestamp").defaultNow(),
  metadata: jsonb("metadata"), // Dados extras em JSON
}, (table) => ({
  timestampIdx: index("site_views_timestamp_idx").on(table.timestamp),
  pageIdx: index("site_views_page_idx").on(table.page),
  sessionIdx: index("site_views_session_idx").on(table.sessionId),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCollectionSchema = createInsertSchema(collections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  createdAt: true,
  usedCount: true,
});

export const insertFinancialTransactionSchema = createInsertSchema(financialTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStockHistorySchema = createInsertSchema(stockHistory).omit({
  id: true,
  createdAt: true,
});

export const insertAnalyticsSchema = createInsertSchema(analytics).omit({
  id: true,
  createdAt: true,
});

export const insertSiteViewSchema = createInsertSchema(siteViews).omit({
  id: true,
  timestamp: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Collection = typeof collections.$inferSelect;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;

export type FinancialTransaction = typeof financialTransactions.$inferSelect;
export type InsertFinancialTransaction = z.infer<typeof insertFinancialTransactionSchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type StockHistory = typeof stockHistory.$inferSelect;
export type InsertStockHistory = z.infer<typeof insertStockHistorySchema>;

export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;

export type SiteView = typeof siteViews.$inferSelect;
export type InsertSiteView = z.infer<typeof insertSiteViewSchema>;

// ========== NOVAS TABELAS ESSENCIAIS PARA E-COMMERCE ==========

// Clientes do e-commerce
export const customers = pgTable('customers', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  phone: text('phone'),
  dateOfBirth: text('date_of_birth'), // formato YYYY-MM-DD como string
  cpf: text('cpf').unique(),
  totalOrders: integer('total_orders').default(0),
  totalSpent: decimal('total_spent', { precision: 12, scale: 2 }).default('0'),
  lastOrderAt: timestamp('last_order_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('customers_email_idx').on(table.email),
  phoneIdx: index('customers_phone_idx').on(table.phone),
  cpfIdx: index('customers_cpf_idx').on(table.cpf),
}));

// Endereços dos clientes
export const customerAddresses = pgTable('customer_addresses', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar('customer_id').references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  label: text('label').notNull(), // 'casa', 'trabalho', etc
  street: text('street').notNull(),
  number: text('number').notNull(),
  complement: text('complement'),
  neighborhood: text('neighborhood').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  zipCode: text('zip_code').notNull(),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  customerIdx: index('customer_addresses_customer_idx').on(table.customerId),
  zipCodeIdx: index('customer_addresses_zip_idx').on(table.zipCode),
}));

// Pedidos
export const orders = pgTable('orders', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar('customer_id').references(() => customers.id).notNull(),
  orderNumber: text('order_number').unique().notNull(),
  status: text('status').notNull().default('pending'), // 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'
  paymentMethod: text('payment_method'), // 'pix', 'cartao', 'dinheiro'
  paymentStatus: text('payment_status').default('pending'), // 'pending', 'paid', 'cancelled'
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).default('0'),
  shippingCost: decimal('shipping_cost', { precision: 12, scale: 2 }).default('0'),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
  couponId: varchar('coupon_id').references(() => coupons.id),
  shippingAddressId: varchar('shipping_address_id').references(() => customerAddresses.id),
  notes: text('notes'),
  deliveryDate: timestamp('delivery_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  customerIdx: index('orders_customer_idx').on(table.customerId),
  statusIdx: index('orders_status_idx').on(table.status),
  orderNumberIdx: index('orders_number_idx').on(table.orderNumber),
  dateIdx: index('orders_date_idx').on(table.createdAt),
}));

// Itens dos pedidos
export const orderItems = pgTable('order_items', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId: varchar('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 12, scale: 2 }).notNull(),
  productSnapshot: jsonb('product_snapshot'), // dados do produto no momento da compra
}, (table) => ({
  orderIdx: index('order_items_order_idx').on(table.orderId),
  productIdx: index('order_items_product_idx').on(table.productId),
}));

// Carrinho de compras
export const shoppingCart = pgTable('shopping_cart', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  sessionId: text('session_id'), // para usuários não logados
  productId: varchar('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  customerIdx: index('cart_customer_idx').on(table.customerId),
  sessionIdx: index('cart_session_idx').on(table.sessionId),
  productIdx: index('cart_product_idx').on(table.productId),
}));

// Múltiplas imagens por produto
export const productImages = pgTable('product_images', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  url: text('url').notNull(),
  altText: text('alt_text'),
  isPrimary: boolean('is_primary').default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  productIdx: index('product_images_product_idx').on(table.productId),
  primaryIdx: index('product_images_primary_idx').on(table.isPrimary),
}));

// Avaliações dos produtos
export const productReviews = pgTable('product_reviews', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  customerId: varchar('customer_id').references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  orderId: varchar('order_id').references(() => orders.id), // opcional: vincula à compra
  rating: integer('rating').notNull(), // 1 a 5
  title: text('title'),
  comment: text('comment'),
  isVerifiedPurchase: boolean('is_verified_purchase').default(false),
  isApproved: boolean('is_approved').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  productIdx: index('reviews_product_idx').on(table.productId),
  customerIdx: index('reviews_customer_idx').on(table.customerId),
  ratingIdx: index('reviews_rating_idx').on(table.rating),
  approvedIdx: index('reviews_approved_idx').on(table.isApproved),
}));

// Uso de cupons
export const couponUsage = pgTable('coupon_usage', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  couponId: varchar('coupon_id').references(() => coupons.id, { onDelete: 'cascade' }).notNull(),
  customerId: varchar('customer_id').references(() => customers.id),
  orderId: varchar('order_id').references(() => orders.id),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).notNull(),
  usedAt: timestamp('used_at').defaultNow().notNull(),
}, (table) => ({
  couponIdx: index('coupon_usage_coupon_idx').on(table.couponId),
  customerIdx: index('coupon_usage_customer_idx').on(table.customerId),
  dateIdx: index('coupon_usage_date_idx').on(table.usedAt),
}));

// ========== INSERT SCHEMAS PARA NOVAS TABELAS ==========

export const insertCustomerSchema = createInsertSchema(customers);

export const insertCustomerAddressSchema = createInsertSchema(customerAddresses).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems);

export const insertShoppingCartSchema = createInsertSchema(shoppingCart).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductImageSchema = createInsertSchema(productImages).omit({
  id: true,
  createdAt: true,
});

export const insertProductReviewSchema = createInsertSchema(productReviews).omit({
  id: true,
  createdAt: true,
});

export const insertCouponUsageSchema = createInsertSchema(couponUsage).omit({
  id: true,
  usedAt: true,
});

export const insertReservationSchema = createInsertSchema(reservations).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

// ========== TYPES PARA NOVAS TABELAS ==========

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type InsertCustomerAddress = z.infer<typeof insertCustomerAddressSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type ShoppingCart = typeof shoppingCart.$inferSelect;
export type InsertShoppingCart = z.infer<typeof insertShoppingCartSchema>;

export type ProductImage = typeof productImages.$inferSelect;
export type InsertProductImage = z.infer<typeof insertProductImageSchema>;

export type ProductReview = typeof productReviews.$inferSelect;
export type InsertProductReview = z.infer<typeof insertProductReviewSchema>;

export type CouponUsage = typeof couponUsage.$inferSelect;
export type InsertCouponUsage = z.infer<typeof insertCouponUsageSchema>;

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = z.infer<typeof insertReservationSchema>;

// Tabela de solicitações de produtos
export const productRequests = pgTable("product_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerName: text("customer_name").notNull(),
  productName: text("product_name").notNull(),
  phone: text("phone").notNull(), // WhatsApp
  status: text("status").default("pending"), // 'pending' | 'contacted' | 'resolved' | 'cancelled'
  notes: text("notes"), // Observações do admin
  contactedAt: timestamp("contacted_at"), // Quando foi contatado
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  statusIdx: index("product_requests_status_idx").on(table.status),
  dateIdx: index("product_requests_date_idx").on(table.createdAt),
}));

export const insertProductRequestSchema = createInsertSchema(productRequests).omit({
  id: true,
  createdAt: true,
  contactedAt: true,
});

export type ProductRequest = typeof productRequests.$inferSelect;
export type InsertProductRequest = z.infer<typeof insertProductRequestSchema>;
