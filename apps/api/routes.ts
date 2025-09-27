import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProductSchema, insertCollectionSchema, insertCouponSchema, insertFinancialTransactionSchema, insertSupplierSchema, insertReservationSchema, insertProductRequestSchema, type Product } from "@shared/schema";
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
      console.log('📋 Dados recebidos:', {
        username: req.body.username,
        hasPassword: !!req.body.password,
        passwordLength: req.body.password?.length || 0
      });
      
      console.log('📝 Validando dados com Zod schema...');
      const { username, password } = adminAuthSchema.parse(req.body);
      console.log('✅ Dados validados com sucesso');
      
      console.log('🔍 Iniciando busca por usuário...');
      const user = await storage.getUserByUsername(username);
      console.log('📊 Resultado da busca:', { found: !!user, userId: user?.id || 'não encontrado' });
      
      if (!user) {
        console.log('❌ Usuário não encontrado:', username);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Hash da senha para comparação
      console.log('🔒 Gerando hash da senha...');
      const hashedPassword = hashPassword(password);
      console.log('🔍 Comparando senhas:', { 
        stored: user.password.substring(0, 10) + '...', 
        provided: hashedPassword.substring(0, 10) + '...',
        match: user.password === hashedPassword
      });
      
      if (user.password !== hashedPassword) {
        console.log('❌ Senha incorreta para:', username);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log('✅ Login bem-sucedido para:', username);
      res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
      console.error('❌ Erro no login:', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
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

  // NOVAS APIs DE BUSCA INTELIGENTE PARA CREDIÁRIO
  // Seguindo especificações da memória: marcas brasileiras preferidas
  
  // API para buscar produtos disponíveis (ativos + com estoque)
  app.get("/api/admin/products/available", async (req, res) => {
    try {
      const { 
        query = '',
        category = '',
        brand = '',
        minStock = 0,
        maxPrice = null,
        featured = null
      } = req.query;
      
      console.log('🔍 Busca inteligente - Parâmetros:', { query, category, brand, minStock, maxPrice, featured });
      
      // Buscar produtos seguindo especificações da memória:
      // "A busca de produtos deve retornar apenas itens ativos (active=true) 
      // com estoque disponível (stock > 0)"
      const products = await storage.searchAvailableProducts({
        query: query as string,
        category: category as string || null,
        brand: brand as string || null,
        minStock: Number(minStock),
        maxPrice: maxPrice ? Number(maxPrice) : null,
        featured: featured === 'true' ? true : featured === 'false' ? false : null
      });
      
      console.log('✅ Produtos encontrados:', products.length);
      
      res.json({
        success: true,
        products,
        count: products.length,
        filters: { query, category, brand, minStock, maxPrice, featured }
      });
    } catch (error) {
      console.error('❌ Erro na busca inteligente:', error);
      res.status(500).json({ message: "Failed to search available products" });
    }
  });
  
  // API para busca avançada de produtos com filtros
  app.get("/api/admin/products/search", async (req, res) => {
    try {
      const { 
        q: query = '',
        categories = '',
        brands = '',
        priceMin = null,
        priceMax = null,
        activeOnly = 'true',
        stockOnly = 'true',
        sortBy = 'name',
        sortOrder = 'asc',
        limit = 50
      } = req.query;
      
      console.log('🔍 Busca avançada - Parâmetros:', req.query);
      
      // Marcas brasileiras preferidas (conforme memória do usuário)
      const brazilianBrands = ['Vivai', 'Ruby Rose', 'Natura', 'Avon', 'Océane', 'Eudora', 'O Boticário'];
      
      const searchParams = {
        query: query as string,
        categories: categories ? (categories as string).split(',') : [],
        brands: brands ? (brands as string).split(',') : [],
        priceMin: priceMin ? Number(priceMin) : null,
        priceMax: priceMax ? Number(priceMax) : null,
        activeOnly: activeOnly === 'true',
        stockOnly: stockOnly === 'true',
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        limit: Number(limit)
      };
      
      const results = await storage.advancedProductSearch(searchParams);
      
      // Priorizar marcas brasileiras nos resultados
      const sortedResults = results.sort((a: Product, b: Product) => {
        const aBrazilian = brazilianBrands.includes(a.brand || '');
        const bBrazilian = brazilianBrands.includes(b.brand || '');
        
        if (aBrazilian && !bBrazilian) return -1;
        if (!aBrazilian && bBrazilian) return 1;
        return 0;
      });
      
      console.log('✅ Resultados da busca avançada:', sortedResults.length);
      
      res.json({
        success: true,
        results: sortedResults,
        count: sortedResults.length,
        brazilianBrandsFound: sortedResults.filter((p: Product) => brazilianBrands.includes(p.brand || '')).length,
        searchParams
      });
    } catch (error) {
      console.error('❌ Erro na busca avançada:', error);
      res.status(500).json({ message: "Failed to perform advanced search" });
    }
  });
  
  // API para sugestões de busca com foco em marcas brasileiras
  app.get("/api/admin/products/suggestions", async (req, res) => {
    try {
      const { q: query = '', limit = 10 } = req.query;
      
      // Marcas brasileiras sugeridas (conforme preferência do usuário)
      const brazilianBrandSuggestions = [
        'Vivai', 'Ruby Rose', 'Natura', 'Avon', 'Océane', 
        'Eudora', 'O Boticário', 'Quem Disse Berenice', 'Vult'
      ];
      
      // Categorias populares de maquiagem
      const categorySuggestions = [
        'Base', 'Corretivo', 'Pó Compacto', 'Blush', 'Bronzer',
        'Sombra', 'Delineador', 'Máscara de Cílios', 'Batom', 
        'Gloss', 'Lápis de Olho', 'Lápis de Boca'
      ];
      
      const suggestions = {
        brands: brazilianBrandSuggestions.filter(brand => 
          brand.toLowerCase().includes((query as string).toLowerCase())
        ).slice(0, Number(limit) / 2),
        categories: categorySuggestions.filter(cat => 
          cat.toLowerCase().includes((query as string).toLowerCase())
        ).slice(0, Number(limit) / 2)
      };
      
      // Se não há query, retornar sugestões populares
      if (!query) {
        suggestions.brands = brazilianBrandSuggestions.slice(0, 5);
        suggestions.categories = categorySuggestions.slice(0, 5);
      }
      
      res.json({
        success: true,
        suggestions,
        query,
        note: "Sugestões priorizando marcas brasileiras conforme preferência"
      });
    } catch (error) {
      console.error('❌ Erro ao buscar sugestões:', error);
      res.status(500).json({ message: "Failed to fetch suggestions" });
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

  app.get("/api/admin/products/:id", async (req, res) => {
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

  // Admin reservation routes
  app.get("/api/admin/reservations", async (req, res) => {
    try {
      const reservations = await storage.getAllReservations();
      res.json(reservations);
    } catch (error) {
      console.error('❌ Erro ao buscar reservas:', error);
      res.status(500).json({ message: "Failed to fetch reservations" });
    }
  });
  
  // ================================================================
  // NOVAS APIs DE GESTÃO DE CLIENTES PARA CREDIÁRIO
  // ================================================================
  
  // Listar todos os clientes
  app.get("/api/admin/customers", async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      console.log('✅ Clientes encontrados:', customers.length);
      res.json(customers);
    } catch (error) {
      console.error('❌ Erro ao buscar clientes:', error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });
  
  // Buscar cliente por ID
  app.get("/api/admin/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error('❌ Erro ao buscar cliente:', error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });
  
  // Buscar clientes por termo (nome, email, telefone, CPF)
  app.get("/api/admin/customers/search", async (req, res) => {
    try {
      const { q: query = '' } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Parâmetro 'q' (query) é obrigatório" });
      }
      
      console.log('🔍 Buscando clientes com termo:', query);
      const customers = await storage.searchCustomers(query);
      
      console.log('✅ Clientes encontrados na busca:', customers.length);
      res.json({
        success: true,
        customers,
        count: customers.length,
        query
      });
    } catch (error) {
      console.error('❌ Erro na busca de clientes:', error);
      res.status(500).json({ message: "Failed to search customers" });
    }
  });
  
  // Criar novo cliente
  app.post("/api/admin/customers", async (req, res) => {
    try {
      console.log('🔍 POST /api/admin/customers - Dados recebidos:', JSON.stringify(req.body, null, 2));
      
      // Validação básica
      const { name, email } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ 
          message: "Nome e email são obrigatórios",
          required: ['name', 'email']
        });
      }
      
      // Verificar se já existe cliente com esse email
      const existingCustomer = await storage.getCustomerByEmail(email);
      if (existingCustomer) {
        return res.status(409).json({ 
          message: "Já existe um cliente com este email",
          existingCustomerId: existingCustomer.id
        });
      }
      
      const customer = await storage.createCustomer(req.body);
      console.log('✅ Cliente criado com sucesso:', customer.id);
      
      res.status(201).json(customer);
    } catch (error) {
      console.error('❌ Erro ao criar cliente:', error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });
  
  // Atualizar cliente
  app.put("/api/admin/customers/:id", async (req, res) => {
    try {
      console.log('🔍 PUT /api/admin/customers - Dados recebidos:', JSON.stringify(req.body, null, 2));
      
      const customer = await storage.updateCustomer(req.params.id, req.body);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      console.log('✅ Cliente atualizado com sucesso:', customer.id);
      res.json(customer);
    } catch (error) {
      console.error('❌ Erro ao atualizar cliente:', error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });
  
  // Deletar cliente
  app.delete("/api/admin/customers/:id", async (req, res) => {
    try {
      console.log('🗑️ Tentando deletar cliente:', req.params.id);
      
      const deleted = await storage.deleteCustomer(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      console.log('✅ Cliente deletado:', req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Erro ao deletar cliente:', error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });
  
  // Buscar contas de crediário de um cliente específico
  app.get("/api/admin/customers/:id/credit-accounts", async (req, res) => {
    try {
      console.log('🔍 Buscando contas do cliente:', req.params.id);
      
      const accounts = await storage.getCreditAccountsByCustomer(req.params.id);
      console.log('✅ Contas encontradas:', accounts.length);
      
      res.json(accounts);
    } catch (error) {
      console.error('❌ Erro ao buscar contas do cliente:', error);
      res.status(500).json({ message: "Failed to fetch customer credit accounts" });
    }
  });

  // Dashboard consolidado - Métricas integradas de crediário e reservas
  app.get("/api/admin/dashboard/metrics", async (req, res) => {
    try {
      // Buscar dados básicos
      const products = await storage.getAllProducts();
      const reservations = await storage.getAllReservations();
      const customers = await storage.getAllCustomers();
      const creditAccounts = await storage.getAllCreditAccounts();
      const transactions = await storage.getAllTransactions();
      
      // Métricas de produtos
      const totalProducts = products.length;
      const activeProducts = products.filter(p => p.active !== false).length;
      const lowStockProducts = products.filter(p => (p.stock || 0) <= (p.minStock || 5)).length;
      const featuredProducts = products.filter(p => p.featured).length;
      
      // Métricas de reservas segmentadas
      const totalReservations = reservations.length;
      const activeReservations = reservations.filter(r => r.status === 'active').length;
      const soldReservations = reservations.filter(r => r.status === 'sold').length;
      const simpleReservations = reservations.filter(r => r.type === 'simple' || !r.type).length;
      const creditReservations = reservations.filter(r => r.type === 'credit_account').length;
      
      const totalReservedValue = reservations
        .filter(r => r.status === 'active')
        .reduce((sum, r) => sum + (r.quantity * parseFloat(r.unitPrice.toString())), 0);
      
      // Métricas de crediário
      const totalCustomers = customers.length;
      const totalCreditAccounts = creditAccounts.length;
      const activeCreditAccounts = creditAccounts.filter(ca => ca.status === 'active').length;
      
      const totalCreditLimit = creditAccounts.reduce((sum, account) => {
        return sum + parseFloat(account.totalAmount?.toString() || "0");
      }, 0);
      
      const usedCredit = creditAccounts.reduce((sum, account) => {
        return sum + parseFloat(account.paidAmount?.toString() || "0");
      }, 0);
      
      const availableCredit = totalCreditLimit - usedCredit;
      const averageTicket = totalCustomers > 0 ? totalCreditLimit / totalCustomers : 0;
      const conversionRate = totalCustomers > 0 ? (activeCreditAccounts / totalCustomers) * 100 : 0;
      
      // Métricas financeiras
      const totalRevenue = transactions
        .filter(t => t.type === "income" && t.status === "completed")
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const totalExpenses = transactions
        .filter(t => t.type === "expense" && t.status === "completed")
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const balance = totalRevenue - totalExpenses;
      
      // Análise de performance por período
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const recentCreditAccounts = creditAccounts.filter(ca => 
        new Date(ca.createdAt || Date.now()) >= last30Days
      ).length;
      
      const recentReservations = reservations.filter(r => 
        new Date(r.createdAt || Date.now()) >= last30Days
      ).length;
      
      res.json({
        // Métricas gerais
        totalProducts,
        activeProducts,
        lowStockProducts,
        featuredProducts,
        
        // Métricas de reservas
        totalReservations,
        activeReservations,
        soldReservations,
        simpleReservations,
        creditReservations,
        totalReservedValue,
        
        // Métricas de crediário
        totalCustomers,
        totalCreditAccounts,
        activeCreditAccounts,
        totalCreditLimit,
        usedCredit,
        availableCredit,
        averageTicket,
        conversionRate,
        
        // Métricas financeiras
        totalRevenue,
        totalExpenses,
        balance,
        
        // Performance recente
        recent: {
          creditAccounts: recentCreditAccounts,
          reservations: recentReservations,
          period: '30 dias'
        },
        
        // Análises
        insights: {
          creditUtilization: totalCreditLimit > 0 ? (usedCredit / totalCreditLimit) * 100 : 0,
          creditAvailability: totalCreditLimit > 0 ? (availableCredit / totalCreditLimit) * 100 : 0,
          customerEngagement: conversionRate,
          systemHealth: {
            totalAccounts: totalCreditAccounts,
            activeAccounts: activeCreditAccounts,
            migrationComplete: true
          }
        },
        
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Erro ao buscar métricas do dashboard:', error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });
  
  // ================================================================
  // APIs DE CONTAS DE CREDIÁRIO
  // ================================================================
  
  // Listar todas as contas de crediário
  app.get("/api/admin/credit-accounts", async (req, res) => {
    try {
      const accounts = await storage.getAllCreditAccounts();
      console.log('✅ Contas de crediário encontradas:', accounts.length);
      res.json(accounts);
    } catch (error) {
      console.error('❌ Erro ao buscar contas de crediário:', error);
      res.status(500).json({ message: "Failed to fetch credit accounts" });
    }
  });
  
  // Buscar conta de crediário por ID
  app.get("/api/admin/credit-accounts/:id", async (req, res) => {
    try {
      const account = await storage.getCreditAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Credit account not found" });
      }
      res.json(account);
    } catch (error) {
      console.error('❌ Erro ao buscar conta de crediário:', error);
      res.status(500).json({ message: "Failed to fetch credit account" });
    }
  });
  
  // Criar nova conta de crediário
  app.post("/api/admin/credit-accounts", async (req, res) => {
    try {
      console.log('🔍 POST /api/admin/credit-accounts - Dados recebidos:', JSON.stringify(req.body, null, 2));
      
      // Validação básica
      const { customerId, totalAmount } = req.body;
      
      if (!customerId || !totalAmount) {
        return res.status(400).json({ 
          message: "Customer ID e valor total são obrigatórios",
          required: ['customerId', 'totalAmount']
        });
      }
      
      // Verificar se o cliente existe
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ 
          message: "Cliente não encontrado",
          customerId
        });
      }
      
      // Converter nextPaymentDate de string para Date se necessário
      const accountData = { ...req.body };
      if (accountData.nextPaymentDate && typeof accountData.nextPaymentDate === 'string') {
        // Criar um objeto Date válido a partir da string
        const dateObj = new Date(accountData.nextPaymentDate + 'T00:00:00.000Z');
        
        // Verificar se a data é válida
        if (isNaN(dateObj.getTime())) {
          console.log('❌ Data inválida:', accountData.nextPaymentDate);
          return res.status(400).json({ message: "Invalid date format" });
        }
        
        accountData.nextPaymentDate = dateObj;
        console.log('🔄 Data de pagamento convertida:', accountData.nextPaymentDate, 'ISO:', accountData.nextPaymentDate.toISOString());
      }
      
      const account = await storage.createCreditAccount(accountData);
      console.log('✅ Conta de crediário criada:', account.id);
      
      res.status(201).json(account);
    } catch (error) {
      console.error('❌ Erro ao criar conta de crediário:', error);
      res.status(500).json({ message: "Failed to create credit account" });
    }
  });
  
  // Atualizar conta de crediário
  app.put("/api/admin/credit-accounts/:id", async (req, res) => {
    try {
      console.log('🔍 PUT /api/admin/credit-accounts - ID:', req.params.id);
      console.log('🔍 PUT /api/admin/credit-accounts - Dados recebidos:', JSON.stringify(req.body, null, 2));
      
      // Converter nextPaymentDate de string para Date se necessário
      const updateData = { ...req.body };
      if (updateData.nextPaymentDate && typeof updateData.nextPaymentDate === 'string') {
        // Criar um objeto Date válido a partir da string
        const dateObj = new Date(updateData.nextPaymentDate + 'T00:00:00.000Z');
        
        // Verificar se a data é válida
        if (isNaN(dateObj.getTime())) {
          console.log('❌ Data inválida:', updateData.nextPaymentDate);
          return res.status(400).json({ message: "Invalid date format" });
        }
        
        updateData.nextPaymentDate = dateObj;
        console.log('🔄 Data convertida:', updateData.nextPaymentDate, 'ISO:', updateData.nextPaymentDate.toISOString());
      }
      
      const account = await storage.updateCreditAccount(req.params.id, updateData);
      if (!account) {
        console.log('❌ Conta de crediário não encontrada:', req.params.id);
        return res.status(404).json({ message: "Credit account not found" });
      }
      
      console.log('✅ Conta de crediário atualizada com sucesso:', account.id);
      res.json(account);
    } catch (error) {
      console.error('❌ Erro ao atualizar conta de crediário:', error);
      res.status(500).json({ message: "Failed to update credit account" });
    }
  });

  // ================================================================
  // APIs DE PAGAMENTOS DE CREDIÁRIO
  // ================================================================
  
  // Listar todos os pagamentos de uma conta de crediário
  app.get("/api/admin/credit-accounts/:accountId/payments", async (req, res) => {
    try {
      const payments = await storage.getCreditPayments(req.params.accountId);
      console.log('✅ Pagamentos encontrados:', payments.length);
      res.json(payments);
    } catch (error) {
      console.error('❌ Erro ao buscar pagamentos:', error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });
  
  // Registrar novo pagamento
  app.post("/api/admin/credit-payments", async (req, res) => {
    try {
      console.log('🔍 POST /api/admin/credit-payments - Dados recebidos:', JSON.stringify(req.body, null, 2));
      
      // Validação básica
      const { creditAccountId, amount, paymentMethod } = req.body;
      
      if (!creditAccountId || !amount || !paymentMethod) {
        return res.status(400).json({ 
          message: "Account ID, valor e método de pagamento são obrigatórios",
          required: ['creditAccountId', 'amount', 'paymentMethod']
        });
      }
      
      // Verificar se a conta existe
      const account = await storage.getCreditAccount(creditAccountId);
      if (!account) {
        return res.status(404).json({ 
          message: "Conta de crediário não encontrada",
          creditAccountId
        });
      }
      
      // Verificar se o valor não excede o pendente
      const remainingAmount = parseFloat(account.remainingAmount?.toString() || "0");
      const paymentAmount = parseFloat(amount.toString());
      
      if (paymentAmount > remainingAmount) {
        return res.status(400).json({ 
          message: `Valor do pagamento (R$ ${paymentAmount.toFixed(2)}) excede o valor pendente (R$ ${remainingAmount.toFixed(2)})`,
          maxAmount: remainingAmount
        });
      }
      
      const payment = await storage.createCreditPayment(req.body);
      console.log('✅ Pagamento registrado:', payment.id);
      
      res.status(201).json(payment);
    } catch (error) {
      console.error('❌ Erro ao registrar pagamento:', error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });
  
  // Buscar pagamento por ID
  app.get("/api/admin/credit-payments/:id", async (req, res) => {
    try {
      // Como não temos método getCreditPayment, vamos implementar busca simples
      const allPayments = await storage.getCreditPayments('');
      const payment = allPayments.find(p => p.id === req.params.id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      console.error('❌ Erro ao buscar pagamento:', error);
      res.status(500).json({ message: "Failed to fetch payment" });
    }
  });
  
  // Atualizar pagamento
  app.put("/api/admin/credit-payments/:id", async (req, res) => {
    try {
      console.log('🔍 PUT /api/admin/credit-payments - Dados recebidos:', JSON.stringify(req.body, null, 2));
      
      const payment = await storage.updateCreditPayment(req.params.id, req.body);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      console.log('✅ Pagamento atualizado:', payment.id);
      res.json(payment);
    } catch (error) {
      console.error('❌ Erro ao atualizar pagamento:', error);
      res.status(500).json({ message: "Failed to update payment" });
    }
  });
  
  // Cancelar pagamento
  app.delete("/api/admin/credit-payments/:id", async (req, res) => {
    try {
      console.log('🗑️ Cancelando pagamento:', req.params.id);
      
      const deleted = await storage.deleteCreditPayment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      console.log('✅ Pagamento cancelado:', req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Erro ao cancelar pagamento:', error);
      res.status(500).json({ message: "Failed to cancel payment" });
    }
  });
  
  // Relatório de pagamentos (período específico)
  app.get("/api/admin/credit-payments/report", async (req, res) => {
    try {
      const { startDate, endDate, customerId, accountId } = req.query;
      
      // Por enquanto, buscar todos os pagamentos e filtrar depois
      const allPayments = await storage.getCreditPayments('');
      let payments = allPayments;
      
      // Filtrar por datas se fornecidas
      if (startDate || endDate) {
        payments = payments.filter(p => {
          const paymentDate = new Date(p.createdAt || new Date());
          const start = startDate ? new Date(startDate as string) : new Date('1900-01-01');
          const end = endDate ? new Date(endDate as string) : new Date();
          return paymentDate >= start && paymentDate <= end;
        });
      }
      
      // Filtrar por conta se fornecido
      if (accountId) {
        payments = payments.filter(p => p.creditAccountId === accountId);
      }
      
      const totalAmount = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount.toString()), 0);
      const paymentMethods = payments.reduce((acc: Record<string, number>, p: any) => {
        acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + parseFloat(p.amount.toString());
        return acc;
      }, {} as Record<string, number>);
      
      res.json({
        payments,
        summary: {
          totalPayments: payments.length,
          totalAmount,
          paymentMethods,
          period: {
            startDate: startDate || 'Início',
            endDate: endDate || 'Hoje'
          }
        }
      });
    } catch (error) {
      console.error('❌ Erro ao gerar relatório de pagamentos:', error);
      res.status(500).json({ message: "Failed to generate payments report" });
    }
  });

  // Admin reservations routes
  app.get("/api/admin/reservations", async (req, res) => {
    try {
      const reservations = await storage.getAllReservations();
      res.json(reservations);
    } catch (error) {
      console.error('❌ Erro ao buscar reservas:', error);
      res.status(500).json({ message: "Failed to fetch reservations" });
    }
  });

  app.post("/api/admin/reservations", async (req, res) => {
    try {
      console.log('🔍 POST /api/admin/reservations - Dados recebidos:', JSON.stringify(req.body, null, 2));
      console.log('🔍 Tipos dos dados:', {
        productId: typeof req.body.productId,
        customerName: typeof req.body.customerName,
        quantity: typeof req.body.quantity,
        unitPrice: typeof req.body.unitPrice,
        paymentDate: typeof req.body.paymentDate
      });
      
      // Schema customizado para aceitar os tipos do frontend
      const frontendReservationSchema = z.object({
        productId: z.string(),
        customerName: z.string(),
        quantity: z.number(),
        unitPrice: z.string(), // unitPrice já vem como string do frontend
        paymentDate: z.coerce.date(), // Força conversão para Date
        status: z.string().default('active').optional(),
        notes: z.string().optional()
      });

      console.log('🧪 Testando validação do schema...');
      const validatedData = frontendReservationSchema.parse(req.body);
      console.log('✅ Dados validados com sucesso:', JSON.stringify(validatedData, null, 2));
      
      const reservation = await storage.createReservation(validatedData);
      console.log('✅ Reserva criada com sucesso:', reservation.id);
      
      res.status(201).json(reservation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('❌ Erro de validação Zod:', JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Invalid reservation data", errors: error.errors });
      }
      console.log('❌ Erro ao criar reserva:', error);
      res.status(500).json({ message: "Failed to create reservation" });
    }
  });

  app.put("/api/admin/reservations/:id", async (req, res) => {
    try {
      console.log('🔍 PUT /api/admin/reservations - Dados recebidos:', JSON.stringify(req.body, null, 2));
      
      // Converter campos de data se necessário
      const updateData = { ...req.body };
      if (updateData.completedAt && typeof updateData.completedAt === 'string') {
        updateData.completedAt = new Date(updateData.completedAt);
      }
      if (updateData.paymentDate && typeof updateData.paymentDate === 'string') {
        updateData.paymentDate = new Date(updateData.paymentDate);
      }
      
      const reservation = await storage.updateReservation(req.params.id, updateData);
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }
      
      console.log('✅ Reserva atualizada com sucesso:', reservation.id);
      res.json(reservation);
    } catch (error) {
      console.error('❌ Erro ao atualizar reserva:', error);
      res.status(500).json({ message: "Failed to update reservation" });
    }
  });

  app.delete("/api/admin/reservations/:id", async (req, res) => {
    try {
      console.log('🗑️ Tentando deletar reserva:', req.params.id);
      const deleted = await storage.deleteReservation(req.params.id);
      console.log('🗑️ Resultado da deleção:', deleted);
      if (!deleted) {
        console.log('❌ Reserva não encontrada para deleção:', req.params.id);
        return res.status(404).json({ message: "Reservation not found" });
      }
      
      console.log('✅ Reserva deletada:', req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Erro ao deletar reserva:', error);
      res.status(500).json({ message: "Failed to delete reservation" });
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
      console.log('🔍 POST /api/admin/transactions - Dados recebidos:', JSON.stringify(req.body, null, 2));
      
      const transactionData = insertFinancialTransactionSchema.parse(req.body);
      console.log('✅ Dados validados com sucesso:', JSON.stringify(transactionData, null, 2));
      
      const transaction = await storage.createTransaction(transactionData);
      console.log('✅ Transação criada com sucesso:', transaction.id);
      
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('❌ Erro de validação Zod:', JSON.stringify(error.errors, null, 2));
        console.log('📋 Dados originais que falharam:', JSON.stringify(req.body, null, 2));
        return res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      }
      console.log('❌ Erro geral ao criar transação:', error);
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
      
      // Contar vendas específicas do controle de estoque
      const stockSales = transactions.filter(t => 
        t.type === "income" && 
        t.status === "completed" && 
        (t.category === "Vendas" || t.category === "sale")
      );

      res.json({
        totalRevenue,
        totalExpenses,
        balance,
        pendingReceivables,
        pendingPayables,
        totalTransactions: transactions.length,
        stockSales: stockSales.length, // Número de vendas via controle de estoque
        stockSalesRevenue: stockSales.reduce((sum, t) => sum + parseFloat(t.amount), 0) // Receita das vendas de estoque
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
      const reservations = await storage.getAllReservations();
      const coupons = await storage.getAllCoupons();
      
      // Calcular métricas reais
      const totalRevenue = transactions
        .filter(t => t.type === "income" && t.status === "completed")
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const totalExpenses = transactions
        .filter(t => t.type === "expense" && t.status === "completed")
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      // Estatísticas de reservas
      const totalReservations = reservations.length;
      const activeReservations = reservations.filter(r => r.status === 'active').length;
      const soldReservations = reservations.filter(r => r.status === 'sold').length;
      const reservedValue = reservations
        .filter(r => r.status === 'active')
        .reduce((sum, r) => sum + (r.quantity * parseFloat(r.unitPrice.toString())), 0);
      
      // Produtos com estoque baixo
      const lowStockProducts = products.filter(p => 
        (p.stock || 0) <= (p.minStock || 5)
      );
      
      // Produtos mais vendidos (baseado em transações de venda do controle de estoque)
      const salesTransactions = transactions.filter(t => 
        t.type === "income" && 
        t.status === "completed" && 
        (t.category === "Vendas" || t.category === "sale") // Reconhece vendas do controle de estoque
      );
      
      const productSales: { [key: string]: { count: number; revenue: number; product?: any; productId?: string } } = {};
      
      // Agrupar vendas por produto usando metadata quando disponível
      salesTransactions.forEach(transaction => {
        let productKey = '';
        let productName = '';
        let productId = '';
        
        // Tentar extrair informações do metadata primeiro (vendas do controle de estoque)
        if (transaction.metadata && typeof transaction.metadata === 'object') {
          const metadata = transaction.metadata as any;
          if (metadata.productId && metadata.productName) {
            productId = metadata.productId;
            productName = metadata.productName;
            productKey = productId; // Usar ID como chave principal
          }
        }
        
        // Fallback para descrição se não tiver metadata
        if (!productKey) {
          productName = transaction.description;
          productKey = productName;
        }
        
        if (!productSales[productKey]) {
          productSales[productKey] = { count: 0, revenue: 0, productId };
        }
        
        // Extrair quantidade do metadata se disponível
        let quantity = 1;
        if (transaction.metadata && typeof transaction.metadata === 'object') {
          const metadata = transaction.metadata as any;
          if (metadata.quantity) {
            quantity = metadata.quantity;
          }
        }
        
        productSales[productKey].count += quantity;
        productSales[productKey].revenue += parseFloat(transaction.amount);
      });
      
      // Buscar informações completas dos produtos para o relatório
      const topProducts = await Promise.all(
        Object.entries(productSales)
          .map(async ([key, data]) => {
            let product = { name: key };
            
            // Se temos productId, buscar dados completos do produto
            if (data.productId) {
              const fullProduct = await storage.getProduct(data.productId);
              if (fullProduct) {
                product = fullProduct;
              }
            }
            
            return {
              product,
              sales: data.count,
              revenue: data.revenue
            };
          })
      );
      
      // Ordenar por receita e pegar top 5
      const sortedTopProducts = topProducts
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
        totalReservations,
        activeReservations,
        soldReservations, 
        reservedValue,
        topProducts: sortedTopProducts,
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

  // ========== PRODUCT REQUESTS API ==========
  
  // Criar solicitação de produto
  app.post("/api/product-requests", async (req, res) => {
    try {
      console.log('🔍 Criando solicitação de produto:', req.body);
      const data = insertProductRequestSchema.parse(req.body);
      const productRequest = await storage.createProductRequest(data);
      console.log('✅ Solicitação criada com sucesso:', productRequest.id);
      res.status(201).json(productRequest);
    } catch (error) {
      console.error('❌ Erro ao criar solicitação:', error);
      res.status(400).json({ message: "Erro ao criar solicitação de produto" });
    }
  });

  // Listar solicitações de produtos (admin)
  app.get("/api/admin/product-requests", async (req, res) => {
    try {
      const productRequests = await storage.getProductRequests();
      res.json(productRequests);
    } catch (error) {
      console.error('❌ Erro ao buscar solicitações:', error);
      res.status(500).json({ message: "Erro ao buscar solicitações" });
    }
  });

  // Atualizar status de solicitação (admin)
  app.patch("/api/admin/product-requests/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      
      const updatedRequest = await storage.updateProductRequest(id, { status, notes });
      if (!updatedRequest) {
        return res.status(404).json({ message: "Solicitação não encontrada" });
      }
      
      res.json(updatedRequest);
    } catch (error) {
      console.error('❌ Erro ao atualizar solicitação:', error);
      res.status(500).json({ message: "Erro ao atualizar solicitação" });
    }
  });

  // Deletar solicitação (admin)
  app.delete("/api/admin/product-requests/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteProductRequest(id);
      
      if (!success) {
        return res.status(404).json({ message: "Solicitação não encontrada" });
      }
      
      res.json({ message: "Solicitação deletada com sucesso" });
    } catch (error) {
      console.error('❌ Erro ao deletar solicitação:', error);
      res.status(500).json({ message: "Erro ao deletar solicitação" });
    }
  });

  // ================================================================
  // FASE 7: APIs ESPECIALIZADAS PARA CREDIÁRIO
  // ================================================================

  // API de Analytics Avançados de Crediário
  app.get("/api/admin/credit/analytics", async (req, res) => {
    try {
      const { 
        startDate, 
        endDate, 
        customerId, 
        accountStatus = 'all' 
      } = req.query;
      
      console.log('📊 Gerando analytics de crediário:', { startDate, endDate, customerId, accountStatus });
      
      // Buscar todas as contas
      const allAccounts = await storage.getAllCreditAccounts();
      const allCustomers = await storage.getAllCustomers();
      
      // Filtrar por data se especificado
      let filteredAccounts = allAccounts;
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        filteredAccounts = allAccounts.filter(account => {
          const accountDate = account.createdAt ? new Date(account.createdAt) : new Date();
          return accountDate >= start && accountDate <= end;
        });
      }
      
      // Filtrar por cliente se especificado
      if (customerId) {
        filteredAccounts = filteredAccounts.filter(account => account.customerId === customerId);
      }
      
      // Filtrar por status se especificado
      if (accountStatus !== 'all') {
        filteredAccounts = filteredAccounts.filter(account => account.status === accountStatus);
      }
      
      // Calcular métricas principais
      const totalAccounts = filteredAccounts.length;
      const activeAccounts = filteredAccounts.filter(acc => acc.status === 'active').length;
      const closedAccounts = filteredAccounts.filter(acc => acc.status === 'closed' || acc.status === 'paid_off').length;
      const suspendedAccounts = filteredAccounts.filter(acc => acc.status === 'suspended').length;
      
      const totalCreditValue = filteredAccounts.reduce((sum, acc) => 
        sum + parseFloat(acc.totalAmount?.toString() || '0'), 0
      );
      
      const totalPaidValue = filteredAccounts.reduce((sum, acc) => 
        sum + parseFloat(acc.paidAmount?.toString() || '0'), 0
      );
      
      const totalPendingValue = filteredAccounts.reduce((sum, acc) => 
        sum + parseFloat(acc.remainingAmount?.toString() || '0'), 0
      );
      
      // Contas vencidas
      const overdueAccounts = filteredAccounts.filter(acc => {
        if (acc.status !== 'active') return false;
        const nextPayment = acc.nextPaymentDate ? new Date(acc.nextPaymentDate) : null;
        return nextPayment && nextPayment < new Date();
      }).length;
      
      // Taxa de pagamento
      const paymentRate = totalCreditValue > 0 ? (totalPaidValue / totalCreditValue) * 100 : 0;
      
      // Ticket médio
      const averageTicket = totalAccounts > 0 ? totalCreditValue / totalAccounts : 0;
      
      // Top 10 clientes por valor
      const customerStats = allCustomers.map(customer => {
        const customerAccounts = filteredAccounts.filter(acc => acc.customerId === customer.id);
        const totalCustomerCredit = customerAccounts.reduce((sum, acc) => 
          sum + parseFloat(acc.totalAmount?.toString() || '0'), 0
        );
        const totalCustomerPaid = customerAccounts.reduce((sum, acc) => 
          sum + parseFloat(acc.paidAmount?.toString() || '0'), 0
        );
        const totalCustomerPending = customerAccounts.reduce((sum, acc) => 
          sum + parseFloat(acc.remainingAmount?.toString() || '0'), 0
        );
        
        return {
          customer,
          accountsCount: customerAccounts.length,
          totalCredit: totalCustomerCredit,
          totalPaid: totalCustomerPaid,
          totalPending: totalCustomerPending,
          paymentRate: totalCustomerCredit > 0 ? (totalCustomerPaid / totalCustomerCredit) * 100 : 0
        };
      })
      .filter(stat => stat.totalCredit > 0)
      .sort((a, b) => b.totalCredit - a.totalCredit)
      .slice(0, 10);
      
      const analytics = {
        summary: {
          totalAccounts,
          activeAccounts,
          closedAccounts,
          suspendedAccounts,
          overdueAccounts,
          totalCreditValue,
          totalPaidValue,
          totalPendingValue,
          paymentRate,
          averageTicket
        },
        topCustomers: customerStats,
        filters: {
          startDate,
          endDate,
          customerId,
          accountStatus,
          appliedAccountsCount: totalAccounts
        }
      };
      
      console.log('✅ Analytics gerados para', totalAccounts, 'contas');
      res.json(analytics);
    } catch (error) {
      console.error('❌ Erro ao gerar analytics:', error);
      res.status(500).json({ message: "Failed to generate analytics" });
    }
  });

  // API de Alertas de Crediário
  app.get("/api/admin/credit/alerts", async (req, res) => {
    try {
      console.log('🚨 Gerando alertas de crediário');
      
      const accounts = await storage.getAllCreditAccounts();
      const customers = await storage.getAllCustomers();
      const now = new Date();
      
      const alerts: any[] = [];
      
      // Alertas de contas vencidas
      const overdueAccounts = accounts.filter(account => {
        if (account.status !== 'active') return false;
        const nextPayment = account.nextPaymentDate ? new Date(account.nextPaymentDate) : null;
        return nextPayment && nextPayment < now;
      });
      
      overdueAccounts.forEach(account => {
        const customer = customers.find(c => c.id === account.customerId);
        const daysPastDue = account.nextPaymentDate ? 
          Math.ceil((now.getTime() - new Date(account.nextPaymentDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
        
        alerts.push({
          type: 'overdue',
          severity: daysPastDue > 30 ? 'high' : daysPastDue > 15 ? 'medium' : 'low',
          title: 'Conta Vencida',
          message: `Conta ${account.accountNumber} de ${customer?.name || 'Cliente desconhecido'} está ${daysPastDue} dias em atraso`,
          account,
          customer,
          daysPastDue,
          amount: parseFloat(account.remainingAmount?.toString() || '0')
        });
      });
      
      // Alertas de vencimento próximo (próximos 7 dias)
      const upcomingDue = accounts.filter(account => {
        if (account.status !== 'active') return false;
        const nextPayment = account.nextPaymentDate ? new Date(account.nextPaymentDate) : null;
        if (!nextPayment) return false;
        
        const daysUntilDue = Math.ceil((nextPayment.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDue >= 0 && daysUntilDue <= 7;
      });
      
      upcomingDue.forEach(account => {
        const customer = customers.find(c => c.id === account.customerId);
        const daysUntilDue = account.nextPaymentDate ? 
          Math.ceil((new Date(account.nextPaymentDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        
        alerts.push({
          type: 'upcoming_due',
          severity: daysUntilDue <= 2 ? 'medium' : 'low',
          title: 'Vencimento Próximo',
          message: `Conta ${account.accountNumber} de ${customer?.name || 'Cliente desconhecido'} vence em ${daysUntilDue} dias`,
          account,
          customer,
          daysUntilDue,
          amount: parseFloat(account.remainingAmount?.toString() || '0')
        });
      });
      
      const alertsSummary = {
        total: alerts.length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
      };
      
      console.log('✅ Alertas gerados:', alerts.length);
      res.json({
        summary: alertsSummary,
        alerts
      });
    } catch (error) {
      console.error('❌ Erro ao gerar alertas:', error);
      res.status(500).json({ message: "Failed to generate alerts" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
