import {
  type User,
  type InsertUser,
  type Product,
  type InsertProduct,
  type Collection,
  type InsertCollection,
  type Coupon,
  type InsertCoupon,
  type FinancialTransaction,
  type InsertFinancialTransaction,
  type Supplier,
  type InsertSupplier,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Product operations
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  getFeaturedProducts(): Promise<Product[]>;

  // Collection operations
  getAllCollections(): Promise<Collection[]>;
  getCollection(id: string): Promise<Collection | undefined>;
  createCollection(collection: InsertCollection): Promise<Collection>;
  updateCollection(id: string, collection: Partial<Collection>): Promise<Collection | undefined>;
  deleteCollection(id: string): Promise<boolean>;

  // Coupon operations
  getAllCoupons(): Promise<Coupon[]>;
  getCoupon(id: string): Promise<Coupon | undefined>;
  getCouponByCode(code: string): Promise<Coupon | undefined>;
  createCoupon(coupon: InsertCoupon): Promise<Coupon>;
  updateCoupon(id: string, coupon: Partial<Coupon>): Promise<Coupon | undefined>;
  deleteCoupon(id: string): Promise<boolean>;

  // Financial operations
  getAllTransactions(): Promise<FinancialTransaction[]>;
  getTransaction(id: string): Promise<FinancialTransaction | undefined>;
  createTransaction(transaction: InsertFinancialTransaction): Promise<FinancialTransaction>;
  updateTransaction(id: string, transaction: Partial<FinancialTransaction>): Promise<FinancialTransaction | undefined>;
  deleteTransaction(id: string): Promise<boolean>;

  // Supplier operations
  getAllSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<Supplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private products: Map<string, Product> = new Map();
  private collections: Map<string, Collection> = new Map();
  private coupons: Map<string, Coupon> = new Map();
  private transactions: Map<string, FinancialTransaction> = new Map();
  private suppliers: Map<string, Supplier> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed admin user
    const adminUser: User = {
      id: "admin-1",
      username: "admin@mardecores.com",
      password: "admin123", // In production, this should be hashed
    };
    this.users.set(adminUser.id, adminUser);

    // Seed sample products
    const sampleProducts: Product[] = [
      {
        id: "product-1",
        name: "Batom Premium Dourado",
        description: "Batom de longa duração com acabamento metálico dourado",
        price: "10.00",
        originalPrice: "25.00",
        stock: 50,
        images: ["https://images.unsplash.com/photo-1586495777744-4413f21062fa"],
        category: "Lábios",
        tags: ["batom", "dourado", "premium"],
        featured: true,
        rating: "4.8",
        reviewCount: 127,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "product-2", 
        name: "Paleta Sombras Harmonia",
        description: "Paleta com 12 cores neutras para todos os tons de pele",
        price: "10.00",
        originalPrice: "35.00",
        stock: 30,
        images: ["https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9"],
        category: "Olhos",
        tags: ["paleta", "sombras", "neutro"],
        featured: true,
        rating: "4.9",
        reviewCount: 89,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "product-3",
        name: "Base Perfeita Natural",
        description: "Base líquida com cobertura natural e longa duração",
        price: "10.00",
        originalPrice: "40.00",
        stock: 25,
        images: ["https://images.unsplash.com/photo-1560472354-b33ff0c44a43"],
        category: "Rosto",
        tags: ["base", "natural", "cobertura"],
        featured: true,
        rating: "4.7",
        reviewCount: 203,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "product-4",
        name: "Máscara Volume Intenso",
        description: "Máscara para cílios com fórmula à prova d'água",
        price: "10.00",
        originalPrice: "20.00",
        stock: 40,
        images: ["https://images.unsplash.com/photo-1512496015851-a90fb38ba796"],
        category: "Olhos",
        tags: ["máscara", "volume", "cílios"],
        featured: true,
        rating: "4.8",
        reviewCount: 156,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    sampleProducts.forEach(product => {
      this.products.set(product.id, product);
    });

    // Seed sample collections
    const sampleCollections: Collection[] = [
      {
        id: "collection-1",
        name: "Glow Inverno",
        description: "Produtos para um brilho natural no inverno",
        image: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2",
        products: ["product-1", "product-3"],
        featured: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "collection-2",
        name: "Top 10 Favoritos",
        description: "Os produtos mais amados pelas clientes",
        image: "https://images.unsplash.com/photo-1515688594390-b649af70d282",
        products: ["product-2", "product-4"],
        featured: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "collection-3",
        name: "Beleza Natural",
        description: "Para um visual natural e radiante",
        image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be",
        products: ["product-1", "product-2", "product-3"],
        featured: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    sampleCollections.forEach(collection => {
      this.collections.set(collection.id, collection);
    });

    // Seed sample financial data
    const sampleTransactions: FinancialTransaction[] = [
      {
        id: "trans-1",
        type: "income",
        category: "sale",
        description: "Venda de produtos",
        amount: "150.00",
        date: new Date(),
        status: "completed",
        createdAt: new Date(),
      },
      {
        id: "trans-2",
        type: "expense",
        category: "supplier",
        description: "Compra de estoque",
        amount: "500.00",
        date: new Date(),
        status: "pending",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      },
    ];

    sampleTransactions.forEach(transaction => {
      this.transactions.set(transaction.id, transaction);
    });
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Product operations
  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product: Product = {
      ...insertProduct,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: string, productUpdate: Partial<Product>): Promise<Product | undefined> {
    const existing = this.products.get(id);
    if (!existing) return undefined;

    const updated: Product = {
      ...existing,
      ...productUpdate,
      id,
      updatedAt: new Date(),
    };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.products.delete(id);
  }

  async getFeaturedProducts(): Promise<Product[]> {
    return Array.from(this.products.values()).filter(p => p.featured);
  }

  // Collection operations
  async getAllCollections(): Promise<Collection[]> {
    return Array.from(this.collections.values());
  }

  async getCollection(id: string): Promise<Collection | undefined> {
    return this.collections.get(id);
  }

  async createCollection(insertCollection: InsertCollection): Promise<Collection> {
    const id = randomUUID();
    const collection: Collection = {
      ...insertCollection,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.collections.set(id, collection);
    return collection;
  }

  async updateCollection(id: string, collectionUpdate: Partial<Collection>): Promise<Collection | undefined> {
    const existing = this.collections.get(id);
    if (!existing) return undefined;

    const updated: Collection = {
      ...existing,
      ...collectionUpdate,
      id,
      updatedAt: new Date(),
    };
    this.collections.set(id, updated);
    return updated;
  }

  async deleteCollection(id: string): Promise<boolean> {
    return this.collections.delete(id);
  }

  // Coupon operations
  async getAllCoupons(): Promise<Coupon[]> {
    return Array.from(this.coupons.values());
  }

  async getCoupon(id: string): Promise<Coupon | undefined> {
    return this.coupons.get(id);
  }

  async getCouponByCode(code: string): Promise<Coupon | undefined> {
    return Array.from(this.coupons.values()).find(c => c.code === code);
  }

  async createCoupon(insertCoupon: InsertCoupon): Promise<Coupon> {
    const id = randomUUID();
    const coupon: Coupon = {
      ...insertCoupon,
      id,
      usedCount: 0,
      createdAt: new Date(),
    };
    this.coupons.set(id, coupon);
    return coupon;
  }

  async updateCoupon(id: string, couponUpdate: Partial<Coupon>): Promise<Coupon | undefined> {
    const existing = this.coupons.get(id);
    if (!existing) return undefined;

    const updated: Coupon = {
      ...existing,
      ...couponUpdate,
      id,
    };
    this.coupons.set(id, updated);
    return updated;
  }

  async deleteCoupon(id: string): Promise<boolean> {
    return this.coupons.delete(id);
  }

  // Financial operations
  async getAllTransactions(): Promise<FinancialTransaction[]> {
    return Array.from(this.transactions.values());
  }

  async getTransaction(id: string): Promise<FinancialTransaction | undefined> {
    return this.transactions.get(id);
  }

  async createTransaction(insertTransaction: InsertFinancialTransaction): Promise<FinancialTransaction> {
    const id = randomUUID();
    const transaction: FinancialTransaction = {
      ...insertTransaction,
      id,
      createdAt: new Date(),
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async updateTransaction(id: string, transactionUpdate: Partial<FinancialTransaction>): Promise<FinancialTransaction | undefined> {
    const existing = this.transactions.get(id);
    if (!existing) return undefined;

    const updated: FinancialTransaction = {
      ...existing,
      ...transactionUpdate,
      id,
    };
    this.transactions.set(id, updated);
    return updated;
  }

  async deleteTransaction(id: string): Promise<boolean> {
    return this.transactions.delete(id);
  }

  // Supplier operations
  async getAllSuppliers(): Promise<Supplier[]> {
    return Array.from(this.suppliers.values());
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    return this.suppliers.get(id);
  }

  async createSupplier(insertSupplier: InsertSupplier): Promise<Supplier> {
    const id = randomUUID();
    const supplier: Supplier = {
      ...insertSupplier,
      id,
      createdAt: new Date(),
    };
    this.suppliers.set(id, supplier);
    return supplier;
  }

  async updateSupplier(id: string, supplierUpdate: Partial<Supplier>): Promise<Supplier | undefined> {
    const existing = this.suppliers.get(id);
    if (!existing) return undefined;

    const updated: Supplier = {
      ...existing,
      ...supplierUpdate,
      id,
    };
    this.suppliers.set(id, updated);
    return updated;
  }

  async deleteSupplier(id: string): Promise<boolean> {
    return this.suppliers.delete(id);
  }
}

export const storage = new MemStorage();
