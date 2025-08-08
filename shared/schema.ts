import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  stock: integer("stock").default(0),
  images: text("images").array(),
  category: text("category"),
  tags: text("tags").array(),
  featured: boolean("featured").default(false),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("0"),
  reviewCount: integer("review_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const collections = pgTable("collections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  image: text("image"),
  products: text("products").array(), // Product IDs
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const coupons = pgTable("coupons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  type: text("type").notNull(), // 'percentage' | 'fixed'
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  active: boolean("active").default(true),
  expiresAt: timestamp("expires_at"),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const financialTransactions = pgTable("financial_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'income' | 'expense'
  category: text("category").notNull(), // 'sale' | 'supplier' | 'marketing' | 'operational'
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").defaultNow(),
  status: text("status").default("pending"), // 'pending' | 'completed' | 'cancelled'
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
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
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
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
