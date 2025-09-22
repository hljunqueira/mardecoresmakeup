import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProductSchema, insertCollectionSchema, insertCouponSchema, insertFinancialTransactionSchema, insertSupplierSchema } from "@shared/schema";
import { z } from "zod";
import * as crypto from "crypto";
import { upload, imageUploadService } from "./upload-service";
import { GoogleImagesService } from "./services/google-images";

// Função para hash da senha (mesma usada no cadastro)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const adminAuthSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check route para Railway
  app.get("/", (req, res) => {
    res.status(200).json({ 
      status: "ok", 
      message: "Mar de Cores API is running", 
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  });

  app.get("/health", (req, res) => {
    res.status(200).json({ 
      status: "healthy", 
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // Initialize Google Images Service
  const googleImagesService = new GoogleImagesService();

  // Google Images Search API
  app.get("/api/images/search", async (req, res) => {
    try {
      const { q: query, count = 10 } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Parâmetro 'q' (query) é obrigatório" });
      }

      console.log('🔍 Buscando imagens para:', query);
      const images = await googleImagesService.searchImages(query, Number(count));
      
      console.log('✅ Encontradas', images.length, 'imagens para:', query);
      res.json({
        success: true,
        query,
        count: images.length,
        images
      });
    } catch (error) {
      console.error('❌ Erro na busca de imagens:', error);
      res.status(500).json({ 
        success: false,
        message: "Erro na busca de imagens", 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
    }
  });
  // Admin authentication
  app.post("/api/admin/login", async (req, res) => {
    try {
      console.log('🔐 Tentativa de login:', { username: req.body.username });
      const { username, password } = adminAuthSchema.parse(req.body);
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        console.log('❌ Usuário não encontrado:', username);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Hash da senha para comparação
      const hashedPassword = hashPassword(password);
      console.log('🔍 Comparando senhas:', { stored: user.password.substring(0, 10) + '...', provided: hashedPassword.substring(0, 10) + '...' });
      
      if (user.password !== hashedPassword) {
        console.log('❌ Senha incorreta para:', username);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log('✅ Login bem-sucedido para:', username);
      res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
      console.error('❌ Erro no login:', error);
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // Image upload routes
  app.post("/api/admin/upload/single", upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      const { productId } = req.body;
      const imageUrl = await imageUploadService.uploadImage(req.file, productId);
      
      console.log('✅ Upload único realizado:', imageUrl);
      res.json({ 
        success: true, 
        imageUrl,
        message: "Imagem enviada com sucesso" 
      });
    } catch (error) {
      console.error('❌ Erro no upload:', error);
      res.status(500).json({ 
        message: "Erro no upload da imagem", 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
    }
  });

  app.post("/api/admin/upload/multiple", upload.array('images', 10), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      const { productId } = req.body;
      const imageUrls = await imageUploadService.uploadMultipleImages(req.files, productId);
      
      console.log('✅ Upload múltiplo realizado:', imageUrls.length, 'imagens');
      res.json({ 
        success: true, 
        imageUrls,
        count: imageUrls.length,
        message: `${imageUrls.length} imagens enviadas com sucesso` 
      });
    } catch (error) {
      console.error('❌ Erro no upload múltiplo:', error);
      res.status(500).json({ 
        message: "Erro no upload das imagens", 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
    }
  });

  app.delete("/api/admin/upload/delete", async (req, res) => {
    try {
      const { imageUrl, imageUrls } = req.body;
      
      if (imageUrl) {
        // Deletar uma única imagem
        const success = await imageUploadService.deleteImage(imageUrl);
        res.json({ 
          success, 
          message: success ? "Imagem deletada com sucesso" : "Erro ao deletar imagem" 
        });
      } else if (imageUrls && Array.isArray(imageUrls)) {
        // Deletar múltiplas imagens
        const results = await imageUploadService.deleteMultipleImages(imageUrls);
        const successCount = results.filter(Boolean).length;
        res.json({ 
          success: successCount > 0, 
          results,
          successCount,
          message: `${successCount} de ${imageUrls.length} imagens deletadas com sucesso` 
        });
      } else {
        res.status(400).json({ message: "URL da imagem é obrigatória" });
      }
    } catch (error) {
      console.error('❌ Erro ao deletar imagem:', error);
      res.status(500).json({ 
        message: "Erro ao deletar imagem", 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
    }
  });

  app.get("/api/admin/upload/product/:productId", async (req, res) => {
    try {
      const { productId } = req.params;
      const imageUrls = await imageUploadService.listProductImages(productId);
      
      res.json({ 
        success: true, 
        imageUrls,
        count: imageUrls.length
      });
    } catch (error) {
      console.error('❌ Erro ao listar imagens:', error);
      res.status(500).json({ 
        message: "Erro ao listar imagens do produto", 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
    }
  });

  // Product Images database routes
  app.get("/api/admin/products/:productId/images", async (req, res) => {
    try {
      const images = await storage.getProductImages(req.params.productId);
      res.json(images);
    } catch (error) {
      console.error('❌ Erro ao buscar imagens do produto:', error);
      res.status(500).json({ message: "Failed to fetch product images" });
    }
  });

  app.post("/api/admin/products/:productId/images", async (req, res) => {
    try {
      const { url, altText, isPrimary, sortOrder } = req.body;
      const image = await storage.addProductImage({
        productId: req.params.productId,
        url,
        altText: altText || null,
        isPrimary: isPrimary || false,
        sortOrder: sortOrder || 0,
      });
      
      console.log('✅ Imagem adicionada ao banco:', image.id);
      res.status(201).json(image);
    } catch (error) {
      console.error('❌ Erro ao adicionar imagem:', error);
      res.status(500).json({ message: "Failed to add product image" });
    }
  });

  app.put("/api/admin/products/images/:imageId", async (req, res) => {
    try {
      const image = await storage.updateProductImage(req.params.imageId, req.body);
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      console.log('✅ Imagem atualizada:', image.id);
      res.json(image);
    } catch (error) {
      console.error('❌ Erro ao atualizar imagem:', error);
      res.status(500).json({ message: "Failed to update product image" });
    }
  });

  app.delete("/api/admin/products/images/:imageId", async (req, res) => {
    try {
      const deleted = await storage.deleteProductImage(req.params.imageId);
      if (!deleted) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      console.log('✅ Imagem removida do banco:', req.params.imageId);
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Erro ao deletar imagem:', error);
      res.status(500).json({ message: "Failed to delete product image" });
    }
  });

  app.post("/api/admin/products/:productId/images/:imageId/set-main", async (req, res) => {
    try {
      const success = await storage.setMainProductImage(req.params.productId, req.params.imageId);
      if (!success) {
        return res.status(404).json({ message: "Failed to set main image" });
      }
      
      console.log('✅ Imagem principal definida:', req.params.imageId);
      res.json({ success: true, message: "Main image set successfully" });
    } catch (error) {
      console.error('❌ Erro ao definir imagem principal:', error);
      res.status(500).json({ message: "Failed to set main image" });
    }
  });

  // Public product routes
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getActiveProducts();
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
  app.get("/api/admin/products", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admin products" });
    }
  });

  app.post("/api/admin/products", async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      
      console.log('✅ Produto criado:', product.name, 'ID:', product.id);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      console.error('❌ Erro ao criar produto:', error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put("/api/admin/products/:id", async (req, res) => {
    try {
      const productData = insertProductSchema.partial().parse(req.body);
      
      // Se houver imagens antigas para deletar
      if (req.body.deleteImages && Array.isArray(req.body.deleteImages)) {
        await imageUploadService.deleteMultipleImages(req.body.deleteImages);
        console.log('🗑️ Imagens antigas deletadas:', req.body.deleteImages.length);
      }
      
      const product = await storage.updateProduct(req.params.id, productData);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      console.log('✅ Produto atualizado:', product.name, 'ID:', product.id);
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      console.error('❌ Erro ao atualizar produto:', error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/admin/products/:id", async (req, res) => {
    try {
      // Primeiro, buscar o produto para obter as imagens
      const product = await storage.getProduct(req.params.id);
      
      if (product && product.images && product.images.length > 0) {
        // Deletar as imagens do storage antes de deletar o produto
        await imageUploadService.deleteMultipleImages(product.images);
        console.log('🗑️ Imagens do produto deletadas:', product.images.length);
      }
      
      const deleted = await storage.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      console.log('✅ Produto deletado:', req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Erro ao deletar produto:', error);
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

  // Rota para contagem de cupons ativos
  app.get("/api/admin/coupons/active/count", async (req, res) => {
    try {
      const coupons = await storage.getAllCoupons();
      const activeCoupons = coupons.filter(coupon => 
        coupon.active && 
        (!coupon.expiresAt || new Date(coupon.expiresAt) > new Date())
      ).length;
      res.json(activeCoupons);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active coupons count" });
    }
  });

  // Sistema de visualizações do site (usando banco de dados)
  app.post("/api/analytics/view", async (req, res) => {
    try {
      console.log('📊 Recebendo dados de visualização:', req.body);
      
      const { page, userAgent } = req.body || {};
      
      // Registrar visualização no banco
      await storage.recordSiteView({
        page: page || req.path || '/',
        userAgent: userAgent || req.headers['user-agent'] || null,
        sessionId: req.headers['x-session-id'] as string || null,
        ipAddress: req.ip || req.headers['x-forwarded-for'] as string || null,
        metadata: {
          timestamp: new Date().toISOString(),
          referer: req.headers.referer || null,
        },
      });
      
      // Buscar estatísticas atualizadas
      const stats = await storage.getSiteViewsStats();
      
      console.log('📊 Visualização registrada - Total:', stats.total);
      
      res.json({ success: true, views: stats });
    } catch (error) {
      console.error('❌ Erro ao registrar visualização:', error);
      res.status(500).json({ message: "Failed to record view", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
  
  // Rota para buscar estatísticas de visualizações
  app.get("/api/analytics/views", async (req, res) => {
    try {
      const stats = await storage.getSiteViewsStats();
      res.json({ success: true, views: stats });
    } catch (error) {
      console.error('❌ Erro ao buscar visualizações:', error);
      res.status(500).json({ message: "Failed to fetch views" });
    }
  });
  
  // Rota para contagem de visualizações (compatibilidade)
  app.get("/api/admin/analytics/visits", async (req, res) => {
    try {
      // Retorna as visualizações do nosso sistema do banco de dados
      const stats = await storage.getSiteViewsStats();
      res.json(stats.total);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch visits count" });
    }
  });
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

  // Reports API endpoint (usando dados reais)
  app.get("/api/admin/reports", async (req, res) => {
    try {
      const { period = '30' } = req.query;
      
      // Buscar dados reais dos produtos
      const products = await storage.getAllProducts();
      const transactions = await storage.getAllTransactions();
      const coupons = await storage.getAllCoupons();
      const siteViewsStats = await storage.getSiteViewsStats();
      
      // Calcular métricas reais
      const totalRevenue = transactions
        .filter(t => t.type === "income" && t.status === "completed")
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const totalExpenses = transactions
        .filter(t => t.type === "expense" && t.status === "completed")
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      // Produtos com estoque baixo
      const lowStockProducts = products.filter(p => 
        (p.stock || 0) <= (p.minStock || 5)
      );
      
      // Produtos mais vendidos (baseado em transações de venda)
      const salesTransactions = transactions.filter(t => t.type === "income" && t.category === "sale");
      const productSales: { [key: string]: { count: number; revenue: number; product?: any } } = {};
      
      // Agrupar vendas por produto (simulado baseado na descrição)
      salesTransactions.forEach(transaction => {
        // Tentar extrair informações do produto da descrição
        const productName = transaction.description;
        if (!productSales[productName]) {
          productSales[productName] = { count: 0, revenue: 0 };
        }
        productSales[productName].count += 1;
        productSales[productName].revenue += parseFloat(transaction.amount);
      });
      
      const topProducts = Object.entries(productSales)
        .map(([name, data]) => ({
          product: { name },
          sales: data.count,
          revenue: data.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      
      // Vendas por mês (baseado em transações reais dos últimos 6 meses)
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      
      const salesByMonth = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        
        const monthTransactions = salesTransactions.filter(t => {
          const transactionDate = new Date(t.date || t.createdAt || new Date());
          return transactionDate >= monthDate && transactionDate < nextMonth;
        });
        
        salesByMonth.push({
          month: monthNames[monthDate.getMonth()],
          sales: monthTransactions.length,
          revenue: monthTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)
        });
      }
      
      res.json({
        totalSales: salesTransactions.length,
        totalRevenue: totalRevenue,
        totalProducts: products.length,
        totalCustomers: 0, // TODO: implementar quando tiver tabela de clientes
        totalViews: siteViewsStats.total,
        viewsToday: siteViewsStats.today,
        viewsThisWeek: siteViewsStats.thisWeek,
        topProducts,
        salesByMonth,
        lowStockProducts,
        activeCoupons: coupons.filter(c => c.active).length,
        period: Number(period)
      });
    } catch (error) {
      console.error('❌ Erro ao gerar relatório:', error);
      res.status(500).json({ message: "Failed to generate reports" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
