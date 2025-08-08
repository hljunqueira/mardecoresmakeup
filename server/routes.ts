import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProductSchema, insertCollectionSchema, insertCouponSchema, insertFinancialTransactionSchema, insertSupplierSchema } from "@shared/schema";
import { z } from "zod";

const adminAuthSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Admin authentication
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = adminAuthSchema.parse(req.body);
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      res.json({ success: true, user: { id: user.id, username: user.username } });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // Public product routes
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/featured", async (req, res) => {
    try {
      const products = await storage.getFeaturedProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch featured products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Public collection routes
  app.get("/api/collections", async (req, res) => {
    try {
      const collections = await storage.getAllCollections();
      res.json(collections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch collections" });
    }
  });

  app.get("/api/collections/:id", async (req, res) => {
    try {
      const collection = await storage.getCollection(req.params.id);
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }
      res.json(collection);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch collection" });
    }
  });

  // Admin product routes
  app.post("/api/admin/products", async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put("/api/admin/products/:id", async (req, res) => {
    try {
      const productData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, productData);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/admin/products/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Admin collection routes
  app.post("/api/admin/collections", async (req, res) => {
    try {
      const collectionData = insertCollectionSchema.parse(req.body);
      const collection = await storage.createCollection(collectionData);
      res.status(201).json(collection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid collection data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create collection" });
    }
  });

  app.put("/api/admin/collections/:id", async (req, res) => {
    try {
      const collectionData = insertCollectionSchema.partial().parse(req.body);
      const collection = await storage.updateCollection(req.params.id, collectionData);
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }
      res.json(collection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid collection data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update collection" });
    }
  });

  app.delete("/api/admin/collections/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCollection(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Collection not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete collection" });
    }
  });

  // Admin coupon routes
  app.get("/api/admin/coupons", async (req, res) => {
    try {
      const coupons = await storage.getAllCoupons();
      res.json(coupons);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch coupons" });
    }
  });

  app.post("/api/admin/coupons", async (req, res) => {
    try {
      const couponData = insertCouponSchema.parse(req.body);
      const coupon = await storage.createCoupon(couponData);
      res.status(201).json(coupon);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid coupon data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create coupon" });
    }
  });

  app.put("/api/admin/coupons/:id", async (req, res) => {
    try {
      const couponData = insertCouponSchema.partial().parse(req.body);
      const coupon = await storage.updateCoupon(req.params.id, couponData);
      if (!coupon) {
        return res.status(404).json({ message: "Coupon not found" });
      }
      res.json(coupon);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid coupon data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update coupon" });
    }
  });

  app.delete("/api/admin/coupons/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCoupon(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Coupon not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete coupon" });
    }
  });

  // Admin financial routes
  app.get("/api/admin/transactions", async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/admin/transactions", async (req, res) => {
    try {
      const transactionData = insertFinancialTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  app.put("/api/admin/transactions/:id", async (req, res) => {
    try {
      const transactionData = insertFinancialTransactionSchema.partial().parse(req.body);
      const transaction = await storage.updateTransaction(req.params.id, transactionData);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });

  app.delete("/api/admin/transactions/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTransaction(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // Admin supplier routes
  app.get("/api/admin/suppliers", async (req, res) => {
    try {
      const suppliers = await storage.getAllSuppliers();
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.post("/api/admin/suppliers", async (req, res) => {
    try {
      const supplierData = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(supplierData);
      res.status(201).json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid supplier data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });

  app.put("/api/admin/suppliers/:id", async (req, res) => {
    try {
      const supplierData = insertSupplierSchema.partial().parse(req.body);
      const supplier = await storage.updateSupplier(req.params.id, supplierData);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid supplier data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update supplier" });
    }
  });

  app.delete("/api/admin/suppliers/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteSupplier(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  });

  // Financial dashboard summary
  app.get("/api/admin/financial/summary", async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      
      const totalRevenue = transactions
        .filter(t => t.type === "income" && t.status === "completed")
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const totalExpenses = transactions
        .filter(t => t.type === "expense" && t.status === "completed")
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const pendingReceivables = transactions
        .filter(t => t.type === "income" && t.status === "pending")
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const pendingPayables = transactions
        .filter(t => t.type === "expense" && t.status === "pending")
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const balance = totalRevenue - totalExpenses;

      res.json({
        totalRevenue,
        totalExpenses,
        balance,
        pendingReceivables,
        pendingPayables,
        totalTransactions: transactions.length,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch financial summary" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
