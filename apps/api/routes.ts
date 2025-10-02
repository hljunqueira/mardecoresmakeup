import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProductSchema, insertCollectionSchema, insertCouponSchema, insertFinancialTransactionSchema, insertSupplierSchema, insertReservationSchema, insertProductRequestSchema, insertProductReviewSchema, type Product } from "@shared/schema";
import { z } from "zod";
import * as crypto from "crypto";
import { upload, imageUploadService } from "./upload-service";
import { GoogleImagesService } from "./services/google-images";
import { financialWebhook } from "./services/financial-webhook";
import { financialSyncJob } from "./services/financial-sync-job";
// Adicionar imports do Drizzle para verificação de dependências
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';
import { eq, sql, and } from 'drizzle-orm';

// Inicializar conexão do banco para verificação de dependências
const connectionUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const client = postgres(connectionUrl);
const db = drizzle(client, { schema });

// Função para hash da senha (mesma usada no cadastro)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const adminAuthSchema = z.object({
  username: z.string(),
  password: z.string(),
});

// ================================================================
// FUNÇÃO PARA FINALIZAR AUTOMATICAMENTE RESERVAS DE CREDIÁRIO
// ================================================================

/**
 * Finaliza automaticamente todas as reservas ativas de uma conta de crediário quitada
 * Reduz estoque, cria transações de venda e marca reservas como vendidas
 */
async function finalizeCreditAccountReservations(creditAccountId: string) {
  console.log('🎯 Buscando reservas ativas para conta:', creditAccountId);
  
  try {
    // 1. Buscar todas as reservas ativas da conta de crediário
    const reservations = await storage.getReservationsByCreditAccount(creditAccountId);
    const activeReservations = reservations.filter(r => r.status === 'active');
    
    console.log(`📎 Encontradas ${activeReservations.length} reservas ativas para finalizar`);
    
    if (activeReservations.length === 0) {
      return {
        reservationsProcessed: 0,
        transactionsCreated: 0,
        message: 'Nenhuma reserva ativa encontrada'
      };
    }
    
    let transactionsCreated = 0;
    const processedReservations = [];
    
    // 2. Processar cada reserva individualmente
    for (const reservation of activeReservations) {
      try {
        console.log(`🔄 Processando reserva ${reservation.id} - Produto: ${reservation.productId}, Quantidade: ${reservation.quantity}`);
        
        // 2.1. Buscar produto atual
        const product = await storage.getProduct(reservation.productId);
        if (!product) {
          console.error(`❌ Produto ${reservation.productId} não encontrado`);
          continue;
        }
        
        // 2.2. NOTA: Estoque já foi reduzido quando o produto foi adicionado ao crediário
        // Agora apenas criamos a transação de venda sem mexer no estoque
        const reservationQuantity = parseInt(reservation.quantity.toString());
        
        console.log(`💰 Criando transação de venda para "${product.name}" (${reservationQuantity}x) - Estoque já foi reduzido anteriormente`);
        
        // 2.3. Criar transação de venda
        const unitPrice = parseFloat(reservation.unitPrice.toString());
        const totalAmount = unitPrice * reservationQuantity;
        
        const transactionData = {
          type: 'income' as const,
          amount: totalAmount.toString(),
          description: `Venda Crediário - ${product.name} (${reservationQuantity}x) - Conta Quitada`,
          category: 'Crediário',
          status: 'completed' as const,
          date: new Date(),
          metadata: {
            productId: reservation.productId,
            productName: product.name,
            quantity: reservationQuantity,
            unitPrice: unitPrice,
            creditAccountId: creditAccountId,
            reservationId: reservation.id,
            type: 'credit_finalization',
            source: 'auto_finalization'
          }
        };
        
        const transaction = await storage.createTransaction(transactionData);
        transactionsCreated++;
        
        console.log(`💰 Transação criada: ${transaction.id} - R$ ${totalAmount.toFixed(2)}`);
        
        // 2.4. Marcar reserva como vendida
        await storage.updateReservation(reservation.id, {
          status: 'sold',
          completedAt: new Date()
        });
        
        processedReservations.push({
          reservationId: reservation.id,
          productId: reservation.productId,
          productName: product.name,
          quantity: reservationQuantity,
          amount: totalAmount,
          transactionId: transaction.id
        });
        
        console.log(`✅ Reserva ${reservation.id} finalizada com sucesso`);
        
      } catch (reservationError) {
        console.error(`❌ Erro ao processar reserva ${reservation.id}:`, reservationError);
        // Continua com as outras reservas
      }
    }
    
    const result = {
      reservationsProcessed: processedReservations.length,
      transactionsCreated,
      totalAmount: processedReservations.reduce((sum, item) => sum + item.amount, 0),
      processedReservations,
      message: `${processedReservations.length} reservas finalizadas e transacões de venda criadas (estoque já havia sido reduzido)`
    };
    
    console.log('✅ Finalização automática concluída:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Erro na finalização automática de reservas:', error);
    throw error;
  }
}

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

  // Public products routes
  app.get("/api/products", async (req, res) => {
    try {
      // Buscar apenas produtos ativos para o público
      const products = await storage.getActiveProducts();
      console.log('✅ Produtos públicos encontrados:', products.length);
      res.json(products);
    } catch (error) {
      console.error('❌ Erro ao buscar produtos públicos:', error);
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
      const productId = req.params.id;
      console.log('🗑️ Iniciando deleção do produto:', productId);
      
      // Primeiro, buscar o produto para obter as imagens
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Verificar dependências que impedem a deleção
      console.log('🔍 Verificando dependências do produto...');
      const dependencies = {
        orderItems: 0,
        creditAccountItems: 0,
        reservations: 0
      };
      
      try {
        // Verificar itens de pedidos
        console.log('📦 Verificando order_items...');
        const orderItemsCount = await client`
          SELECT COUNT(*) as count FROM order_items WHERE product_id = ${productId}
        `;
        dependencies.orderItems = parseInt(orderItemsCount[0]?.count || '0');
        console.log('📊 Order items encontrados:', dependencies.orderItems);
        
        // Verificar itens de crediário
        console.log('💳 Verificando credit_account_items...');
        const creditItemsCount = await client`
          SELECT COUNT(*) as count FROM credit_account_items WHERE product_id = ${productId}
        `;
        dependencies.creditAccountItems = parseInt(creditItemsCount[0]?.count || '0');
        console.log('📊 Credit items encontrados:', dependencies.creditAccountItems);
        
        // Verificar reservas ativas
        console.log('📋 Verificando reservations...');
        const reservationsCount = await client`
          SELECT COUNT(*) as count FROM reservations WHERE product_id = ${productId} AND status = 'active'
        `;
        dependencies.reservations = parseInt(reservationsCount[0]?.count || '0');
        console.log('📊 Reservations encontradas:', dependencies.reservations);
        
        console.log('🔍 Dependências totais encontradas:', dependencies);
        
        // Se há dependências, retornar erro informativo
        const totalDependencies = dependencies.orderItems + dependencies.creditAccountItems + dependencies.reservations;
        if (totalDependencies > 0) {
          const errorDetails = [];
          if (dependencies.orderItems > 0) {
            errorDetails.push(`${dependencies.orderItems} pedido(s)`);
          }
          if (dependencies.creditAccountItems > 0) {
            errorDetails.push(`${dependencies.creditAccountItems} conta(s) de crediário`);
          }
          if (dependencies.reservations > 0) {
            errorDetails.push(`${dependencies.reservations} reserva(s) ativa(s)`);
          }
          
          return res.status(400).json({ 
            message: "Não é possível deletar este produto",
            details: `O produto está sendo usado em: ${errorDetails.join(', ')}.`,
            dependencies: dependencies,
            suggestion: "Para deletar este produto, você deve primeiro remover ou cancelar essas dependências."
          });
        }
        
      } catch (depError) {
        console.error('❌ Erro ao verificar dependências:', depError);
        return res.status(500).json({ 
          message: "Erro ao verificar dependências do produto",
          error: depError instanceof Error ? depError.message : 'Erro desconhecido'
        });
      }
      
      // Se não há dependências, prosseguir com a deleção
      if (product.images && product.images.length > 0) {
        // Deletar as imagens do storage antes de deletar o produto
        await imageUploadService.deleteMultipleImages(product.images);
        console.log('🗑️ Imagens do produto deletadas:', product.images.length);
      }
      
      // Deletar imagens do banco de dados
      try {
        const deletedImages = await client`
          DELETE FROM product_images WHERE product_id = ${productId}
        `;
        console.log('🗑️ Metadados de imagens removidos do banco:', deletedImages.count);
      } catch (imageError) {
        console.warn('⚠️ Erro ao deletar metadados de imagens:', imageError);
      }
      
      const deleted = await storage.deleteProduct(productId);
      if (!deleted) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      console.log('✅ Produto deletado com sucesso:', productId);
      res.json({ 
        success: true, 
        message: "Produto deletado com sucesso",
        productId: productId
      });
      
    } catch (error) {
      console.error('❌ Erro ao deletar produto:', error);
      res.status(500).json({ 
        message: "Falha ao deletar produto",
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
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
      
      // Validação básica - apenas nome é obrigatório
      const { name } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({ 
          message: "Nome é obrigatório",
          required: ['name']
        });
      }
      
      // Se email foi fornecido, verificar se já existe
      if (req.body.email) {
        const existingCustomer = await storage.getCustomerByEmail(req.body.email);
        if (existingCustomer) {
          return res.status(409).json({ 
            message: "Já existe um cliente com este email",
            existingCustomerId: existingCustomer.id
          });
        }
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

  // API para verificar se cliente já tem conta ativa
  app.get("/api/admin/customers/:customerId/active-account", async (req, res) => {
    try {
      const { customerId } = req.params;
      const accounts = await storage.getCreditAccountsByCustomer(customerId);
      const activeAccount = accounts.find(account => account.status === 'active');
      
      res.json({
        hasActiveAccount: !!activeAccount,
        activeAccount: activeAccount || null
      });
    } catch (error) {
      console.error('❌ Erro ao verificar conta ativa:', error);
      res.status(500).json({ message: "Failed to check active account" });
    }
  });

  // API para buscar itens específicos de uma conta de crediário
  app.get("/api/admin/credit-accounts/:accountId/items", async (req, res) => {
    try {
      const { accountId } = req.params;
      
      // Verificar se a conta existe
      const account = await storage.getCreditAccount(accountId);
      if (!account) {
        return res.status(404).json({ message: "Credit account not found" });
      }
      
      // Buscar os itens da conta
      const items = await storage.getCreditAccountItems(accountId);
      console.log('✅ Itens da conta encontrados:', items.length);
      
      res.json(items);
    } catch (error) {
      console.error('❌ Erro ao buscar itens da conta:', error);
      res.status(500).json({ message: "Failed to fetch account items" });
    }
  });

  // API para adicionar produto à conta existente
  app.post("/api/admin/credit-accounts/:accountId/add-product", async (req, res) => {
    try {
      const { accountId } = req.params;
      const { productId, productName, quantity, unitPrice } = req.body;
      
      console.log('💳 Adicionando produto à conta:', { accountId, productId, quantity });
      
      // 0. 📦 REDUZIR ESTOQUE PRIMEIRO (NOVO FLUXO)
      console.log('📦 Reduzindo estoque do produto antes de adicionar à conta...');
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      
      const currentStock = product.stock || 0;
      const newStock = currentStock - quantity;
      
      console.log(`📦 Estoque de "${product.name}": ${currentStock} → ${newStock}`);
      
      if (newStock < 0) {
        return res.status(400).json({ 
          message: `Estoque insuficiente para ${product.name}`,
          available: currentStock,
          requested: quantity
        });
      }
      
      // Atualizar estoque do produto
      await storage.updateProduct(productId, {
        stock: newStock
      });
      
      console.log('✅ Estoque reduzido com sucesso');
      
      // Calcular preço total
      const totalPrice = quantity * unitPrice;
      
      // Buscar a conta atual
      const account = await storage.getCreditAccount(accountId);
      if (!account) {
        // Se houve erro, tentar reverter o estoque
        try {
          await storage.updateProduct(productId, { stock: currentStock });
          console.log('❌ Estoque revertido devido a conta não encontrada');
        } catch (revertError) {
          console.error('❌ Erro ao reverter estoque:', revertError);
        }
        return res.status(404).json({ message: "Credit account not found" });
      }
      
      // Criar item na conta de crediário
      await storage.createCreditAccountItem({
        creditAccountId: accountId,
        productId,
        productName,
        quantity,
        unitPrice: unitPrice.toString(),
        totalPrice: totalPrice.toString(),
        metadata: {
          source: 'manual',
          addedAt: new Date().toISOString(),
          addedBy: 'admin', // TODO: Identificar usuário logado
          stockReduced: {
            previousStock: currentStock,
            newStock: newStock,
            quantityReduced: quantity
          }
        }
      });
      
      // Atualizar o valor total da conta
      const currentTotal = account.totalAmount ? parseFloat(account.totalAmount.toString()) : 0;
      const currentPaid = account.paidAmount ? parseFloat(account.paidAmount.toString()) : 0;
      const newTotalAmount = currentTotal + totalPrice;
      const newRemainingAmount = newTotalAmount - currentPaid;
      
      await storage.updateCreditAccount(accountId, {
        totalAmount: newTotalAmount.toString(),
        remainingAmount: newRemainingAmount.toString()
      });
      
      console.log('✅ Produto adicionado à conta com estoque reduzido');
      
      res.json({
        success: true,
        message: "Produto adicionado à conta com sucesso e estoque reduzido",
        newTotalAmount,
        stockUpdate: {
          productId,
          productName: product.name,
          previousStock: currentStock,
          newStock: newStock,
          quantityReduced: quantity
        },
        productAdded: {
          productId,
          productName,
          quantity,
          unitPrice,
          totalPrice
        }
      });
    } catch (error) {
      console.error('❌ Erro ao adicionar produto:', error);
      res.status(500).json({ message: "Failed to add product to account" });
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

  // Deletar conta de crediário
  app.delete("/api/admin/credit-accounts/:id", async (req, res) => {
    try {
      console.log('🗑️ Iniciando deleção da conta de crediário:', req.params.id);
      
      // Verificar se a conta existe
      const account = await storage.getCreditAccount(req.params.id);
      if (!account) {
        console.log('❌ Conta não encontrada:', req.params.id);
        return res.status(404).json({ message: "Credit account not found" });
      }
      
      console.log(`📊 Conta encontrada: ${account.accountNumber}`);
      
      // 1. Primeiro, buscar e deletar todos os pagamentos relacionados
      console.log('🧹 Buscando pagamentos para deleção...');
      const payments = await storage.getCreditPayments(req.params.id);
      console.log(`💰 Pagamentos encontrados: ${payments.length}`);
      
      let deletedPayments = 0;
      for (const payment of payments) {
        try {
          const paymentDeleted = await storage.deleteCreditPayment(payment.id);
          if (paymentDeleted) {
            console.log(`  ✅ Pagamento deletado: ${payment.id} - R$ ${payment.amount}`);
            deletedPayments++;
          } else {
            console.log(`  ⚠️ Falha ao deletar pagamento: ${payment.id}`);
          }
        } catch (paymentError) {
          console.error(`  ❌ Erro ao deletar pagamento ${payment.id}:`, paymentError);
          throw paymentError; // Parar se não conseguir deletar um pagamento
        }
      }
      
      console.log(`✅ Total de pagamentos deletados: ${deletedPayments}`);
      
      // 2. Buscar e deletar itens da conta se existirem
      console.log('🧹 Buscando itens da conta para deleção...');
      try {
        const items = await storage.getCreditAccountItems(req.params.id);
        console.log(`📋 Itens encontrados: ${items.length}`);
        
        let deletedItems = 0;
        for (const item of items) {
          const itemDeleted = await storage.deleteCreditAccountItem(item.id);
          if (itemDeleted) {
            console.log(`  ✅ Item deletado: ${item.id} - ${item.productName}`);
            deletedItems++;
          }
        }
        console.log(`✅ Total de itens deletados: ${deletedItems}`);
      } catch (itemsError) {
        console.log('ℹ️ Erro ao buscar/deletar itens (talvez não existam):', itemsError instanceof Error ? itemsError.message : String(itemsError));
        // Não é um erro crítico se não conseguir deletar itens
      }
      
      // 3. Finalmente, deletar a conta principal
      console.log('🗑️ Deletando a conta principal...');
      const deleted = await storage.deleteCreditAccount(req.params.id);
      if (!deleted) {
        console.log('❌ Falha ao deletar conta após limpeza');
        return res.status(500).json({ message: "Failed to delete credit account after cleanup" });
      }
      
      console.log(`✅ Conta de crediário deletada completamente: ${account.accountNumber}`);
      console.log(`📈 Resumo: ${deletedPayments} pagamentos + conta principal`);
      
      res.json({ 
        success: true, 
        message: "Credit account and all related data deleted successfully",
        accountNumber: account.accountNumber,
        deletedPayments,
        deletedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Erro durante deleção da conta de crediário:', error);
      res.status(500).json({ 
        message: "Failed to delete credit account",
        error: error instanceof Error ? error.message : String(error)
      });
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


  // ========================================
  // 📊 API CONSOLIDADA DE MÉTRICAS FINANCEIRAS
  // ========================================
  
  app.get("/api/admin/financial/consolidated", async (req, res) => {
    try {
      const { 
        period = '30', 
        startDate, 
        endDate,
        includeManualTransactions = true,
        includeOrders = true,
        includeCreditAccounts = true 
      } = req.query;
      
      console.log('📊 Gerando métricas financeiras consolidadas:', { period, includeManualTransactions, includeOrders, includeCreditAccounts });
      
      // ===== BUSCAR TODOS OS DADOS =====
      const [transactions, orders, creditAccounts, creditPayments, customers, products] = await Promise.all([
        storage.getAllTransactions(),
        storage.getAllOrders(),
        storage.getAllCreditAccounts(),
        storage.getAllCreditAccounts(), // TODO: Implementar getCreditPayments
        storage.getAllCustomers(),
        storage.getAllProducts()
      ]);
      
      console.log('📊 Dados coletados:', {
        transactions: transactions.length,
        orders: orders.length,
        creditAccounts: creditAccounts.length,
        customers: customers.length
      });
      
      // ===== FILTROS DE DATA =====
      const now = new Date();
      const periodDays = parseInt(period as string);
      const filterStartDate = startDate ? new Date(startDate as string) : new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));
      const filterEndDate = endDate ? new Date(endDate as string) : now;
      
      // ===== TRANSAÇÕES MANUAIS FILTRADAS =====
      const filteredTransactions = transactions.filter(t => {
        if (!includeManualTransactions) return false;
        if (!t.createdAt) return false;
        const transactionDate = new Date(t.createdAt.toString());
        return transactionDate >= filterStartDate && transactionDate <= filterEndDate;
      });
      
      // ===== PEDIDOS FILTRADOS =====
      const filteredOrders = orders.filter(o => {
        if (!includeOrders) return false;
        const orderDate = new Date(o.createdAt);
        return orderDate >= filterStartDate && orderDate <= filterEndDate && 
               (o.status === 'confirmed' || o.status === 'completed');
      });
      
      console.log('📊 Debug pedidos:', {
        totalOrders: orders.length,
        filteredOrders: filteredOrders.length,
        ordersSample: orders.slice(0, 3).map(o => ({ id: o.id, status: o.status, paymentMethod: o.paymentMethod, total: o.total }))
      });
      
      // ===== CONTAS DE CREDIÁRIO ATIVAS =====
      const activeCreditAccounts = creditAccounts.filter(ca => {
        if (!includeCreditAccounts) return false;
        return ca.status === 'active';
      });
      
      // ===== CÁLCULO DAS MÉTRICAS PRINCIPAIS =====
      
      // Receitas das transações manuais
      const manualRevenue = filteredTransactions
        .filter(t => t.type === 'income' && t.status === 'completed')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      // Receitas dos pedidos à vista (PIX, cartão, dinheiro)
      const cashOrdersRevenue = filteredOrders
        .filter(o => o.paymentMethod && ['pix', 'cartao', 'dinheiro', 'cash'].includes(o.paymentMethod.toLowerCase()))
        .reduce((sum, o) => sum + parseFloat(o.total.toString()), 0);
      
      console.log('💰 Debug receitas à vista:', {
        cashOrders: filteredOrders.filter(o => o.paymentMethod && ['pix', 'cartao', 'dinheiro', 'cash'].includes(o.paymentMethod.toLowerCase())).length,
        cashOrdersRevenue,
        paymentMethods: filteredOrders.map(o => o.paymentMethod)
      });
      
      // Pagamentos recebidos do crediário (aproximação)
      const creditRevenue = activeCreditAccounts
        .reduce((sum, ca) => sum + parseFloat(ca.paidAmount?.toString() || '0'), 0);
      
      // Total de receitas
      const totalRevenue = manualRevenue + cashOrdersRevenue + creditRevenue;
      
      // Despesas das transações manuais
      const totalExpenses = filteredTransactions
        .filter(t => t.type === 'expense' && t.status === 'completed')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      // Lucro líquido
      const netProfit = totalRevenue - totalExpenses;
      
      // ===== CONTAS A RECEBER =====
      const pendingReceivables = filteredTransactions
        .filter(t => t.type === 'income' && t.status === 'pending')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const creditAccountsBalance = activeCreditAccounts
        .reduce((sum, ca) => sum + parseFloat(ca.remainingAmount?.toString() || '0'), 0);
      
      // ===== CONTAS A PAGAR =====
      const pendingPayables = filteredTransactions
        .filter(t => t.type === 'expense' && t.status === 'pending')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      // ===== ANÁLISE DE CRESCIMENTO =====
      const previousPeriodStart = new Date(filterStartDate.getTime() - (periodDays * 24 * 60 * 60 * 1000));
      const previousPeriodTransactions = transactions.filter(t => {
        if (!t.createdAt) return false;
        const transactionDate = new Date(t.createdAt.toString());
        return transactionDate >= previousPeriodStart && transactionDate < filterStartDate &&
               t.type === 'income' && t.status === 'completed';
      });
      
      const previousPeriodRevenue = previousPeriodTransactions
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const growthPercentage = previousPeriodRevenue > 0 
        ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 
        : 0;
      
      // ===== ALERTAS =====
      const alerts: any[] = [];
      
      // Alerta de contas vencidas
      const overdueAccounts = activeCreditAccounts.filter(ca => {
        const nextPayment = ca.nextPaymentDate ? new Date(ca.nextPaymentDate) : null;
        return nextPayment && nextPayment < now;
      });
      
      if (overdueAccounts.length > 0) {
        const overdueAmount = overdueAccounts.reduce((sum, ca) => 
          sum + parseFloat(ca.remainingAmount?.toString() || '0'), 0);
        
        alerts.push({
          type: 'overdue',
          severity: 'high',
          title: 'Contas Vencidas',
          message: `${overdueAccounts.length} conta(s) em atraso`,
          amount: overdueAmount,
          actionRequired: true
        });
      }
      
      // ===== RESPOSTA CONSOLIDADA =====
      const consolidatedMetrics = {
        // Métricas principais
        totalRevenue,
        totalExpenses,
        netProfit,
        
        // Receitas por fonte
        revenueBreakdown: {
          manualTransactions: manualRevenue,
          cashOrders: cashOrdersRevenue,
          creditAccounts: creditRevenue
        },
        
        // Contas a receber
        accountsReceivable: {
          pending: pendingReceivables,
          creditAccountsBalance,
          overdue: overdueAccounts.reduce((sum, ca) => 
            sum + parseFloat(ca.remainingAmount?.toString() || '0'), 0)
        },
        
        // Contas a pagar
        accountsPayable: {
          pending: pendingPayables,
          suppliers: filteredTransactions
            .filter(t => t.type === 'expense' && t.category === 'supplier' && t.status === 'pending')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0),
          operational: filteredTransactions
            .filter(t => t.type === 'expense' && t.category === 'operational' && t.status === 'pending')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0)
        },
        
        // Análise temporal
        periodAnalysis: {
          period,
          startDate: filterStartDate.toISOString(),
          endDate: filterEndDate.toISOString(),
          monthlyComparison: {
            currentMonth: totalRevenue,
            previousMonth: previousPeriodRevenue,
            growth: growthPercentage
          }
        },
        
        // Alertas
        alerts,
        
        // Performance
        performance: {
          averageOrderValue: filteredOrders.length > 0 
            ? filteredOrders.reduce((sum, o) => sum + parseFloat(o.total.toString()), 0) / filteredOrders.length 
            : 0,
          totalOrders: filteredOrders.length,
          activeCreditAccounts: activeCreditAccounts.length
        },
        
        // Metadata
        metadata: {
          generatedAt: now.toISOString(),
          dataSource: {
            transactions: filteredTransactions.length,
            orders: filteredOrders.length,
            creditAccounts: activeCreditAccounts.length
          }
        }
      };
      
      console.log('✅ Métricas consolidadas geradas:', {
        totalRevenue,
        totalExpenses,
        netProfit,
        alertsCount: alerts.length
      });
      
      res.json(consolidatedMetrics);
    } catch (error) {
      console.error('❌ Erro ao gerar métricas consolidadas:', error);
      res.status(500).json({ message: "Failed to generate consolidated financial metrics" });
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

  // ========================================
  // 🔍 API DE DADOS FINANCEIROS FILTRADOS
  // ========================================
  
  app.get("/api/admin/financial/filtered", async (req, res) => {
    try {
      const {
        period,
        startDate,
        endDate,
        type,
        status,
        source,
        minAmount,
        maxAmount
      } = req.query;
      
      console.log('🔍 Aplicando filtros financeiros:', {
        period, startDate, endDate, type, status, source, minAmount, maxAmount
      });
      
      // Buscar dados de todas as fontes
      const [transactions, orders, creditAccounts] = await Promise.all([
        storage.getAllTransactions(),
        storage.getAllOrders(),
        storage.getAllCreditAccounts()
      ]);
      
      // Converter dados para formato unificado
      let unifiedData: any[] = [];
      
      // Adicionar transações manuais
      if (!source || source === 'all' || source === 'manual') {
        const transactionData = transactions.map(t => ({
          id: t.id,
          type: t.type,
          category: t.category,
          description: t.description,
          amount: parseFloat(t.amount),
          status: t.status,
          date: t.date || t.createdAt,
          createdAt: t.createdAt,
          source: 'manual',
          dueDate: t.dueDate
        }));
        unifiedData = [...unifiedData, ...transactionData];
      }
      
      // Adicionar pedidos à vista
      if (!source || source === 'all' || source === 'orders') {
        const orderData = orders
          .filter(o => o.paymentMethod !== 'credit' && (o.status === 'confirmed' || o.status === 'completed'))
          .map(o => ({
            id: o.id,
            type: 'income',
            category: 'Vendas',
            description: `Pedido #${o.id.substring(0, 8)}`,
            amount: parseFloat(o.total?.toString() || '0'),
            status: o.status === 'confirmed' || o.status === 'completed' ? 'completed' : 'pending',
            date: o.createdAt,
            createdAt: o.createdAt,
            source: 'orders',
            paymentMethod: o.paymentMethod
          }));
        unifiedData = [...unifiedData, ...orderData];
      }
      
      // Adicionar contas de crediário
      if (!source || source === 'all' || source === 'credit') {
        const customers = await storage.getAllCustomers();
        const customerMap = new Map(customers.map(c => [c.id, c.name]));
        
        const creditData = creditAccounts
          .filter(ca => ca.status === 'active')
          .map(ca => ({
            id: ca.id,
            type: 'income',
            category: 'Crediário',
            description: `Conta de crediário - ${customerMap.get(ca.customerId) || 'Cliente não encontrado'}`,
            amount: parseFloat(ca.totalAmount?.toString() || '0'),
            status: 'pending',
            date: ca.createdAt,
            createdAt: ca.createdAt,
            source: 'credit',
            remainingAmount: parseFloat(ca.remainingAmount?.toString() || '0'),
            paidAmount: parseFloat(ca.paidAmount?.toString() || '0')
          }));
        unifiedData = [...unifiedData, ...creditData];
      }
      
      // Aplicar filtros
      let filteredData = unifiedData;
      
      // Filtro de período
      if (period && period !== 'all') {
        const now = new Date();
        let filterStartDate: Date;
        
        switch (period) {
          case 'today':
            filterStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            filterStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            filterStartDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            break;
          case 'quarter':
            filterStartDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
            break;
          case 'year':
            filterStartDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            break;
          case 'custom':
            if (startDate) {
              filterStartDate = new Date(startDate as string);
            } else {
              filterStartDate = new Date(0); // Início dos tempos se não especificado
            }
            break;
          default:
            filterStartDate = new Date(0);
        }
        
        const filterEndDate = period === 'custom' && endDate ? new Date(endDate as string) : now;
        
        filteredData = filteredData.filter(item => {
          const itemDate = new Date(item.date || item.createdAt);
          return itemDate >= filterStartDate && itemDate <= filterEndDate;
        });
      }
      
      // Filtro de tipo
      if (type && type !== 'all') {
        filteredData = filteredData.filter(item => item.type === type);
      }
      
      // Filtro de status
      if (status && status !== 'all') {
        filteredData = filteredData.filter(item => item.status === status);
      }
      
      // Filtro de fonte específica
      if (source && source !== 'all') {
        filteredData = filteredData.filter(item => item.source === source);
      }
      
      // Filtro de valor mínimo
      if (minAmount) {
        const min = parseFloat(minAmount as string);
        filteredData = filteredData.filter(item => item.amount >= min);
      }
      
      // Filtro de valor máximo
      if (maxAmount) {
        const max = parseFloat(maxAmount as string);
        filteredData = filteredData.filter(item => item.amount <= max);
      }
      
      // Calcular métricas dos dados filtrados
      const revenue = filteredData
        .filter(item => item.type === 'income')
        .reduce((sum, item) => sum + item.amount, 0);
      
      const expenses = filteredData
        .filter(item => item.type === 'expense')
        .reduce((sum, item) => sum + item.amount, 0);
      
      const metrics = {
        totalFiltered: filteredData.length,
        revenue,
        expenses,
        balance: revenue - expenses,
        count: filteredData.length
      };
      
      // Ordenar por data mais recente
      filteredData.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt).getTime();
        const dateB = new Date(b.date || b.createdAt).getTime();
        return dateB - dateA;
      });
      
      console.log('✅ Filtros aplicados:', {
        totalItems: unifiedData.length,
        filteredItems: filteredData.length,
        revenue,
        expenses
      });
      
      res.json({
        transactions: filteredData,
        metrics,
        appliedFilters: {
          period, startDate, endDate, type, status, source, minAmount, maxAmount
        }
      });
    } catch (error) {
      console.error('❌ Erro ao filtrar dados financeiros:', error);
      res.status(500).json({ message: "Failed to filter financial data" });
    }
  });

  // Reports API endpoint integrado - Inclui vendas manuais, pedidos e crediário
  app.get("/api/admin/reports", async (req, res) => {
    try {
      const { period = '30' } = req.query;
      console.log('📈 Gerando relatório integrado para período:', period);
      
      // Buscar dados de todas as fontes
      const products = await storage.getAllProducts();
      const transactions = await storage.getAllTransactions();
      const reservations = await storage.getAllReservations();
      const coupons = await storage.getAllCoupons();
      const orders = await storage.getAllOrders(); // NOVO: Incluir pedidos
      const customers = await storage.getAllCustomers();
      const creditAccounts = await storage.getAllCreditAccounts();
      
      console.log('📈 Dados coletados:', {
        products: products.length,
        transactions: transactions.length,
        orders: orders.length,
        creditAccounts: creditAccounts.length
      });
      
      // VENDAS MANUAIS (sistema antigo de controle de estoque)
      const manualSales = transactions.filter(t => 
        t.type === "income" && 
        t.status === "completed" && 
        (t.category === "Vendas" || t.category === "sale")
      );
      
      const manualRevenue = manualSales.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      // VENDAS POR PEDIDOS (novo sistema)
      const completedOrders = orders.filter(order => 
        order.status === 'completed' || order.status === 'confirmed'
      );
      
      // Pedidos à vista e crediário
      const cashOrders = completedOrders.filter(order => 
        order.paymentMethod && ['pix', 'cartao', 'dinheiro'].includes(order.paymentMethod)
      );
      
      const creditOrders = completedOrders.filter(order => 
        order.paymentMethod === 'credit'
      );
      
      const ordersRevenue = completedOrders.reduce((sum, order) => 
        sum + parseFloat(order.total?.toString() || '0'), 0
      );
      
      // CREDIÁRIO (contas ativas e valores)
      const totalCredit = creditAccounts.reduce((sum, acc) => 
        sum + parseFloat(acc.totalAmount?.toString() || "0"), 0
      );
      
      const totalPaid = creditAccounts.reduce((sum, acc) => 
        sum + parseFloat(acc.paidAmount?.toString() || "0"), 0
      );
      
      // COMBINAR VENDAS TOTAIS
      const totalSales = manualSales.length + completedOrders.length;
      const totalRevenue = manualRevenue + ordersRevenue;
      
      // ESTATÍSTICAS DE RESERVAS (sistema antigo)
      const totalReservations = reservations.length;
      const activeReservations = reservations.filter(r => r.status === 'active').length;
      const soldReservations = reservations.filter(r => r.status === 'sold').length;
      const reservedValue = reservations
        .filter(r => r.status === 'active')
        .reduce((sum, r) => sum + (r.quantity * parseFloat(r.unitPrice.toString())), 0);
      
      // PRODUTOS COM ESTOQUE BAIXO
      const lowStockProducts = products.filter(p => 
        (p.stock || 0) <= (p.minStock || 5)
      );
      
      // TOP PRODUTOS VENDIDOS (combinando vendas manuais e pedidos)
      const productSales: { [key: string]: { count: number; revenue: number; productId?: string } } = {};
      
      // Vendas manuais do controle de estoque
      manualSales.forEach(transaction => {
        let productKey = '';
        let productId = '';
        
        if (transaction.metadata && typeof transaction.metadata === 'object') {
          const metadata = transaction.metadata as any;
          if (metadata.productId && metadata.productName) {
            productId = metadata.productId;
            productKey = productId;
          }
        }
        
        if (!productKey) {
          productKey = transaction.description || 'Produto não identificado';
        }
        
        if (!productSales[productKey]) {
          productSales[productKey] = { count: 0, revenue: 0, productId };
        }
        
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
      
      // Vendas por pedidos
      for (const order of completedOrders) {
        const orderItems = await storage.getOrderItems(order.id);
        
        for (const item of orderItems) {
          const product = await storage.getProduct(item.productId);
          const productKey = product?.id || item.productId;
          
          if (!productSales[productKey]) {
            productSales[productKey] = { count: 0, revenue: 0, productId: item.productId };
          }
          
          productSales[productKey].count += item.quantity;
          productSales[productKey].revenue += parseFloat(item.totalPrice.toString());
        }
      }
      
      // Buscar informações completas dos produtos para o relatório
      const topProducts = await Promise.all(
        Object.entries(productSales)
          .map(async ([key, data]) => {
            let product = { name: key };
            
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
      
      const sortedTopProducts = topProducts
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      
      // VENDAS POR MÊS (combinando vendas manuais e pedidos)
      const now = new Date();
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      
      const salesByMonth = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        
        // Vendas manuais do mês
        const monthManualTransactions = manualSales.filter(t => {
          const transactionDate = new Date(t.date || t.createdAt || new Date());
          return transactionDate >= monthDate && transactionDate < nextMonth;
        });
        
        // Pedidos do mês
        const monthOrders = completedOrders.filter(order => {
          const orderDate = new Date(order.createdAt || new Date());
          return orderDate >= monthDate && orderDate < nextMonth;
        });
        
        const monthManualRevenue = monthManualTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const monthOrdersRevenue = monthOrders.reduce((sum, order) => sum + parseFloat(order.total?.toString() || '0'), 0);
        
        salesByMonth.push({
          month: monthNames[monthDate.getMonth()],
          sales: monthManualTransactions.length + monthOrders.length,
          revenue: monthManualRevenue + monthOrdersRevenue,
          manualSales: monthManualTransactions.length,
          orderSales: monthOrders.length,
          manualRevenue: monthManualRevenue,
          orderRevenue: monthOrdersRevenue
        });
      }
      
      // RELATÓRIO INTEGRADO
      const report = {
        // Métricas gerais
        totalSales,
        totalRevenue,
        totalProducts: products.length,
        
        // Detalhamento por tipo de venda
        manualSales: manualSales.length,
        manualRevenue,
        orderSales: completedOrders.length,
        orderRevenue: ordersRevenue,
        
        // Pedidos por tipo de pagamento
        cashOrders: cashOrders.length,
        creditOrders: creditOrders.length,
        
        // Crediário
        totalCredit,
        totalPaid,
        pendingCredit: totalCredit - totalPaid,
        creditAccounts: creditAccounts.length,
        activeAccounts: creditAccounts.filter(acc => acc.status === 'active').length,
        
        // Reservas (sistema antigo)
        totalReservations,
        activeReservations,
        soldReservations,
        reservedValue,
        
        // Análises
        topProducts: sortedTopProducts,
        salesByMonth,
        lowStockProducts,
        
        // Outros
        activeCoupons: coupons.filter(c => c.active).length,
        period: Number(period),
        
        // Metadados do relatório
        generatedAt: new Date(),
        dataIntegration: {
          manualSalesIncluded: true,
          ordersIncluded: true,
          creditAccountsIncluded: true,
          reservationsIncluded: true
        }
      };
      
      console.log('📈 Relatório integrado gerado:', {
        totalSales: report.totalSales,
        totalRevenue: report.totalRevenue,
        sources: report.dataIntegration
      });
      
      res.json(report);
    } catch (error) {
      console.error('❌ Erro ao gerar relatório integrado:', error);
      res.status(500).json({ message: "Failed to generate integrated reports" });
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

  // ========================================
  // 🛒 SISTEMA DE PEDIDOS - NOVAS APIS
  // ========================================

  // Função helper para gerar número de pedido (delegada para storage)
  async function generateOrderNumber(): Promise<string> {
    return await storage.generateOrderNumber();
  }

  // Listar todos os pedidos com dados completos
  app.get("/api/admin/orders", async (req, res) => {
    try {
      console.log('🛒 Buscando todos os pedidos...');
      
      const [orders, customers] = await Promise.all([
        storage.getAllOrders(),
        storage.getAllCustomers()
      ]);
      
      // Enriquecer pedidos com dados do cliente
      const ordersWithCustomers = orders.map(order => {
        const customer = customers.find(c => c.id === order.customerId);
        return {
          ...order,
          customer,
          // Garantir que customerName existe (da relação ou do campo direto)
          customerName: customer?.name || order.customerName || null,
          customerPhone: customer?.phone || order.customerPhone || null,
          customerEmail: customer?.email || order.customerEmail || null
        };
      });
      
      console.log('✅ Pedidos encontrados:', orders.length, 'com', customers.length, 'clientes');
      res.json(ordersWithCustomers);
    } catch (error) {
      console.error('❌ Erro ao buscar pedidos:', error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Buscar pedido por ID com detalhes completos
  app.get("/api/admin/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('🛒 Buscando pedido completo:', id);
      
      const [order, orderItems, customers, products] = await Promise.all([
        storage.getOrder(id),
        storage.getOrderItems(id),
        storage.getAllCustomers(),
        storage.getAllProducts()
      ]);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Buscar cliente relacionado
      const customer = customers.find(c => c.id === order.customerId);
      
      // Enriquecer itens com dados dos produtos
      const itemsWithProducts = orderItems.map(item => {
        const product = products.find(p => p.id === item.productId);
        return {
          ...item,
          product,
          productName: product?.name || 'Produto não encontrado'
        };
      });
      
      const orderWithDetails = {
        ...order,
        customer,
        customerName: customer?.name || order.customerName || null,
        customerPhone: customer?.phone || order.customerPhone || null,
        customerEmail: customer?.email || order.customerEmail || null,
        items: itemsWithProducts
      };
      
      console.log('✅ Pedido completo encontrado:', order.orderNumber, 'com', orderItems.length, 'itens');
      res.json(orderWithDetails);
    } catch (error) {
      console.error('❌ Erro ao buscar pedido:', error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  // Buscar itens do pedido com dados dos produtos
  app.get("/api/admin/orders/:id/items", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('🛒 Buscando itens do pedido:', id);
      
      const [items, products] = await Promise.all([
        storage.getOrderItems(id),
        storage.getAllProducts()
      ]);
      
      // Enriquecer itens com dados dos produtos
      const itemsWithProducts = items.map(item => {
        const product = products.find(p => p.id === item.productId);
        return {
          ...item,
          product,
          productName: product?.name || 'Produto não encontrado',
          productImage: product?.images?.[0] || null
        };
      });
      
      console.log('✅ Itens encontrados:', items.length, 'com dados dos produtos');
      res.json(itemsWithProducts);
    } catch (error) {
      console.error('❌ Erro ao buscar itens do pedido:', error);
      res.status(500).json({ message: "Failed to fetch order items" });
    }
  });

  // Criar novo pedido
  app.post("/api/admin/orders", async (req, res) => {
    try {
      console.log('🛒 Criando novo pedido:', req.body);
      
      const { items, ...orderData } = req.body;
      
      // 🎯 FLUXO ATUALIZADO: Para crediário, estoque já foi reduzido no frontend
      // Para pedidos à vista, verificar e reduzir estoque normalmente
      if (orderData.paymentMethod !== 'credit' && items && items.length > 0) {
        console.log('💰 Pedido à vista - verificando e reduzindo estoque...');
        
        for (const item of items) {
          const product = await storage.getProduct(item.productId);
          if (!product) {
            return res.status(404).json({ 
              message: `Produto não encontrado: ${item.productName || item.productId}`,
              productId: item.productId
            });
          }
          
          const currentStock = product.stock || 0;
          
          // Verificar se há estoque suficiente
          if (currentStock < item.quantity) {
            return res.status(400).json({ 
              message: `Estoque insuficiente para ${product.name}. Disponível: ${currentStock}, Solicitado: ${item.quantity}`,
              productId: item.productId,
              availableStock: currentStock,
              requestedQuantity: item.quantity
            });
          }
          
          // Reduzir estoque
          const newStock = currentStock - item.quantity;
          await storage.updateProduct(item.productId, {
            stock: newStock
          });
          
          console.log(`📦 Produto ${product.name}: ${currentStock} → ${newStock} (reduzido ${item.quantity})`);
        }
        
        console.log('✅ Estoque atualizado para pedido à vista');
      } else if (orderData.paymentMethod === 'credit') {
        console.log('💳 Pedido de crediário - estoque já foi reduzido no carrinho, prosseguindo...');
      }
      
      // Usar storage real para criar o pedido
      const order = await storage.createOrder({
        ...orderData,
        status: orderData.status || 'pending',
        paymentStatus: orderData.paymentStatus || 'pending',
      });
      
      // Criar itens do pedido se existirem
      if (items && items.length > 0) {
        for (const item of items) {
          await storage.createOrderItem({
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toString(),
            totalPrice: item.totalPrice.toString(),
          });
        }
      }
      
      console.log('✅ Pedido criado:', order.orderNumber);
      res.status(201).json(order);
    } catch (error) {
      console.error('❌ Erro ao criar pedido:', error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // Atualizar pedido
  app.put("/api/admin/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('🛒 Atualizando pedido:', id, req.body);
      
      const order = await storage.updateOrder(id, req.body);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      console.log('✅ Pedido atualizado:', order.orderNumber);
      res.json(order);
    } catch (error) {
      console.error('❌ Erro ao atualizar pedido:', error);
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  // Confirmar pedido
  app.post("/api/admin/orders/:id/confirm", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('✅ Confirmando pedido:', id);
      
      // 1. Buscar o pedido
      const orderData = await storage.getOrder(id);
      if (!orderData) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // 2. Buscar os itens do pedido
      const orderItems = await storage.getOrderItems(id);
      
      // 3. Atualizar estoque dos produtos
      if (orderItems && orderItems.length > 0) {
        console.log('📦 Atualizando estoque dos produtos...');
        for (const item of orderItems) {
          try {
            // Buscar produto atual
            const product = await storage.getProduct(item.productId);
            if (product) {
              const newStock = Math.max(0, (product.stock || 0) - item.quantity);
              console.log(`📦 Produto ${product.name}: ${product.stock || 0} → ${newStock} (reduzido ${item.quantity})`);
              
              // Atualizar estoque
              await storage.updateProduct(item.productId, {
                stock: newStock
              });
            }
          } catch (stockError) {
            console.error(`❌ Erro ao atualizar estoque do produto ${item.productId}:`, stockError);
            // Continua o processo mesmo se um produto falhar
          }
        }
      }
      
      // 4. Criar transação financeira (apenas para pedidos à vista)
      if (orderData.paymentMethod && ['pix', 'cartao', 'dinheiro'].includes(orderData.paymentMethod)) {
        try {
          console.log('💰 Criando transação financeira para pedido à vista...');
          
          const transactionData = {
            type: 'income' as const,
            amount: orderData.total?.toString() || '0',
            description: `Venda à Vista - Pedido ${orderData.orderNumber}`,
            category: 'Vendas',
            status: 'completed',
            metadata: {
              orderId: orderData.id,
              orderNumber: orderData.orderNumber,
              paymentMethod: orderData.paymentMethod,
              type: 'order_sale',
              reversible: true
            }
          };
          
          await storage.createTransaction(transactionData);
          console.log('💰 Transação financeira criada com sucesso');
        } catch (financialError) {
          console.error('❌ Erro ao criar transação financeira:', financialError);
          // Não bloqueia o pedido se houver erro financeiro
        }
      }
      
      // 5. Confirmar o pedido
      const order = await storage.updateOrder(id, {
        status: 'confirmed'
      });
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      console.log('✅ Pedido confirmado, estoque atualizado e transação criada:', order.orderNumber);
      res.json(order);
    } catch (error) {
      console.error('❌ Erro ao confirmar pedido:', error);
      res.status(500).json({ message: "Failed to confirm order" });
    }
  });

  // Cancelar pedido
  app.post("/api/admin/orders/:id/cancel", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      console.log('❌ Cancelando pedido:', id, { reason });
      
      // 1. Buscar o pedido
      const orderData = await storage.getOrder(id);
      if (!orderData) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // 2. Se o pedido foi confirmado/concluído, reverter integrações
      if (orderData.status === 'confirmed' || orderData.status === 'completed') {
        const orderItems = await storage.getOrderItems(id);
        
        // Devolver produtos ao estoque
        if (orderItems && orderItems.length > 0) {
          console.log('🔄 Devolvendo produtos ao estoque...');
          for (const item of orderItems) {
            try {
              const product = await storage.getProduct(item.productId);
              if (product) {
                const newStock = (product.stock || 0) + item.quantity;
                console.log(`🔄 Produto ${product.name}: ${product.stock || 0} → ${newStock} (devolvido ${item.quantity})`);
                
                await storage.updateProduct(item.productId, {
                  stock: newStock
                });
              }
            } catch (stockError) {
              console.error(`❌ Erro ao devolver estoque do produto ${item.productId}:`, stockError);
            }
          }
        }
        
        // Reverter transação financeira (para pedidos à vista)
        if (orderData.paymentMethod && ['pix', 'cartao', 'dinheiro'].includes(orderData.paymentMethod)) {
          try {
            console.log('💰 Criando estorno da transação financeira...');
            
            const reversalData = {
              type: 'expense' as const,
              amount: orderData.total?.toString() || '0',
              description: `Estorno - Pedido Cancelado ${orderData.orderNumber} - ${reason || 'Sem motivo especificado'}`,
              category: 'Estornos',
              status: 'completed',
              metadata: {
                orderId: orderData.id,
                orderNumber: orderData.orderNumber,
                paymentMethod: orderData.paymentMethod,
                type: 'order_reversal',
                reason: reason || 'Cancelamento de pedido'
              }
            };
            
            await storage.createTransaction(reversalData);
            console.log('💰 Estorno criado com sucesso');
          } catch (financialError) {
            console.error('❌ Erro ao criar estorno:', financialError);
          }
        }
      }
      
      // 3. Cancelar o pedido
      const order = await storage.updateOrder(id, {
        status: 'cancelled',
        notes: reason ? `Cancelado: ${reason}` : 'Pedido cancelado'
      });
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      console.log('❌ Pedido cancelado, estoque restaurado e estorno criado:', order.orderNumber);
      res.json(order);
    } catch (error) {
      console.error('❌ Erro ao cancelar pedido:', error);
      res.status(500).json({ message: "Failed to cancel order" });
    }
  });

  // Concluir pedido
  app.post("/api/admin/orders/:id/complete", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('✅ Concluindo pedido:', id);
      
      // 1. Buscar o pedido
      const orderData = await storage.getOrder(id);
      if (!orderData) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // 2. Se o pedido ainda está 'pending', atualizar estoque e criar transação
      if (orderData.status === 'pending') {
        const orderItems = await storage.getOrderItems(id);
        
        // Atualizar estoque
        if (orderItems && orderItems.length > 0) {
          console.log('📦 Pedido pendente - Atualizando estoque dos produtos...');
          for (const item of orderItems) {
            try {
              const product = await storage.getProduct(item.productId);
              if (product) {
                const newStock = Math.max(0, (product.stock || 0) - item.quantity);
                console.log(`📦 Produto ${product.name}: ${product.stock || 0} → ${newStock} (reduzido ${item.quantity})`);
                
                await storage.updateProduct(item.productId, {
                  stock: newStock
                });
              }
            } catch (stockError) {
              console.error(`❌ Erro ao atualizar estoque do produto ${item.productId}:`, stockError);
            }
          }
        }
        
        // Criar transação financeira (apenas para pedidos à vista)
        if (orderData.paymentMethod && ['pix', 'cartao', 'dinheiro'].includes(orderData.paymentMethod)) {
          try {
            console.log('💰 Criando transação financeira para pedido à vista...');
            
            const transactionData = {
              type: 'income' as const,
              amount: orderData.total?.toString() || '0',
              description: `Venda à Vista - Pedido ${orderData.orderNumber}`,
              category: 'Vendas',
              status: 'completed',
              metadata: {
                orderId: orderData.id,
                orderNumber: orderData.orderNumber,
                paymentMethod: orderData.paymentMethod,
                type: 'order_sale',
                reversible: true
              }
            };
            
            await storage.createTransaction(transactionData);
            console.log('💰 Transação financeira criada com sucesso');
          } catch (financialError) {
            console.error('❌ Erro ao criar transação financeira:', financialError);
          }
        }
      }
      
      // 3. Para pedidos de crediário, integrar com conta de crediário
      if (orderData.paymentMethod === 'credit' && orderData.customerId) {
        try {
          console.log('💳 Integrando pedido crediário com conta...');
          
          // Buscar ou criar conta de crediário para o cliente
          const customerId = orderData.customerId!; // Garantido pelo condicional acima
          const customer = await storage.getCustomer(customerId);
          if (customer) {
            // Buscar conta existente ou criar nova
            let creditAccount;
            const existingAccounts = await storage.getCreditAccountsByCustomer(customerId);
            const activeAccount = existingAccounts.find(acc => acc.status === 'active');
            
            if (activeAccount) {
              creditAccount = activeAccount;
            } else {
              // Criar nova conta de crediário
              creditAccount = await storage.createCreditAccount({
                customerId: customerId,
                accountNumber: `ACC-${Date.now()}`, // Gerar número único
                totalAmount: orderData.total?.toString() || '0',
                paidAmount: '0',
                nextPaymentDate: orderData.deliveryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
                status: 'active'
              });
            }
            
            // Adicionar itens do pedido à conta de crediário
            const orderItems = await storage.getOrderItems(id);
            for (const item of orderItems) {
              const product = await storage.getProduct(item.productId);
              if (product) {
                await storage.createCreditAccountItem({
                  creditAccountId: creditAccount.id,
                  productId: item.productId,
                  productName: product.name,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice.toString(),
                  totalPrice: item.totalPrice.toString(),
                  metadata: {
                    source: 'order',
                    orderId: orderData.id,
                    orderNumber: orderData.orderNumber,
                    addedAt: new Date().toISOString()
                  }
                });
              }
            }
            
            console.log('💳 Pedido crediário integrado com conta:', creditAccount.id);
          }
        } catch (creditError) {
          console.error('❌ Erro ao integrar com conta de crediário:', creditError);
        }
      }
      
      // 4. Concluir o pedido
      const order = await storage.updateOrder(id, {
        status: 'completed'
      });
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      console.log('✅ Pedido concluído e integrações realizadas:', order.orderNumber);
      res.json(order);
    } catch (error) {
      console.error('❌ Erro ao concluir pedido:', error);
      res.status(500).json({ message: "Failed to complete order" });
    }
  });

  // Deletar pedido
  app.delete("/api/admin/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('🛒 Deletando pedido:', id);
      
      // Primeiro, verificar se o pedido existe
      const orderData = await storage.getOrder(id);
      if (!orderData) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Se o pedido foi confirmado/concluído, reverter integrações
      if (orderData.status === 'confirmed' || orderData.status === 'completed') {
        const orderItems = await storage.getOrderItems(id);
        
        // Devolver produtos ao estoque
        if (orderItems && orderItems.length > 0) {
          console.log('🔄 Devolvendo produtos ao estoque...');
          for (const item of orderItems) {
            try {
              const product = await storage.getProduct(item.productId);
              if (product) {
                const newStock = (product.stock || 0) + item.quantity;
                console.log(`🔄 Produto ${product.name}: ${product.stock || 0} → ${newStock} (devolvido ${item.quantity})`);
                
                await storage.updateProduct(item.productId, {
                  stock: newStock
                });
              }
            } catch (stockError) {
              console.error(`❌ Erro ao devolver estoque do produto ${item.productId}:`, stockError);
            }
          }
        }
        
        // Se for crediário pago, criar estorno
        if (orderData.paymentMethod === 'credit' && orderData.paymentStatus === 'paid') {
          try {
            console.log('💰 Criando estorno para crediário pago...');
            await storage.createTransaction({
              type: 'expense',
              category: 'estorno',
              amount: orderData.total?.toString() || '0',
              description: `Estorno do pedido ${orderData.orderNumber} - Cliente: ${orderData.customerName || 'N/A'}`,
              date: new Date(),
            });
          } catch (transactionError) {
            console.error('❌ Erro ao criar estorno:', transactionError);
          }
        }
      }
      
      // Deletar o pedido (os itens serão deletados em cascade)
      const deleted = await storage.deleteOrder(id);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete order" });
      }
      
      console.log('✅ Pedido deletado com sucesso:', orderData.orderNumber);
      res.json({ success: true, message: "Order deleted successfully" });
    } catch (error) {
      console.error('❌ Erro ao deletar pedido:', error);
      res.status(500).json({ message: "Failed to delete order" });
    }
  });

  // Buscar pedidos por cliente
  app.get("/api/admin/customers/:customerId/orders", async (req, res) => {
    try {
      const { customerId } = req.params;
      console.log('🛒 Buscando pedidos do cliente:', customerId);
      
      // TODO: Implementar busca no storage
      // const orders = await storage.getOrdersByCustomer(customerId);
      
      const orders: any[] = [];
      
      console.log('✅ Pedidos do cliente encontrados:', orders.length);
      res.json(orders);
    } catch (error) {
      console.error('❌ Erro ao buscar pedidos do cliente:', error);
      res.status(500).json({ message: "Failed to fetch customer orders" });
    }
  });

  // Confirmar pagamento de pedido
  app.post("/api/admin/orders/:id/confirm-payment", async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentMethod, notes } = req.body;
      
      console.log('💳 Confirmando pagamento do pedido:', id, { paymentMethod, notes });
      
      // Buscar o pedido
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Verificar se o pedido já foi confirmado
      if (order.status === 'confirmed' || order.status === 'completed') {
        return res.status(400).json({ message: "Order already confirmed" });
      }
      
      // Atualizar status do pedido para 'confirmed'
      const updatedOrder = await storage.updateOrder(id, {
        status: 'confirmed',
        paymentMethod: paymentMethod || order.paymentMethod,
        notes: notes || order.notes
      });
      
      if (!updatedOrder) {
        return res.status(500).json({ message: "Failed to update order" });
      }
      
      console.log('✅ Pedido confirmado:', updatedOrder.id);
      
      // 🔔 DISPARAR WEBHOOK DE SINCRONIZAÇÃO FINANCEIRA
      console.log('🔔 Disparando webhook de sincronização financeira...');
      
      const webhookResult = await financialWebhook.processOrderConfirmation(id);
      
      if (webhookResult.success) {
        console.log('✅ Webhook executado com sucesso:', webhookResult.message);
      } else {
        console.error('❌ Erro no webhook:', webhookResult.message);
      }
      
      // Retornar resposta com informações do webhook
      res.json({
        success: true,
        order: updatedOrder,
        webhook: {
          success: webhookResult.success,
          message: webhookResult.message,
          transactionId: webhookResult.transactionId,
          syncedData: webhookResult.syncedData
        }
      });
      
    } catch (error) {
      console.error('❌ Erro ao confirmar pagamento:', error);
      res.status(500).json({ message: "Failed to confirm payment" });
    }
  });

  console.log('🛒 Rotas de pedidos registradas:');
  console.log('✅ GET /api/admin/orders - Listar pedidos');
  console.log('✅ GET /api/admin/orders/:id - Buscar pedido');
  console.log('✅ POST /api/admin/orders - Criar pedido');
  console.log('✅ PUT /api/admin/orders/:id - Atualizar pedido');
  console.log('✅ DELETE /api/admin/orders/:id - Deletar pedido');
  console.log('✅ GET /api/admin/customers/:customerId/orders - Pedidos por cliente');
  console.log('✅ POST /api/admin/orders/:id/confirm-payment - Confirmar pagamento');
  console.log('');

  // ========================================
  // 🔔 SISTEMA DE WEBHOOKS FINANCEIROS
  // ========================================

  // Cancelar pedido e sincronizar financeiro
  app.post("/api/admin/orders/:id/cancel", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      console.log('🚫 Cancelando pedido:', id, { reason });
      
      // Buscar o pedido
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Atualizar status do pedido para 'cancelled'
      const updatedOrder = await storage.updateOrder(id, {
        status: 'cancelled',
        notes: reason || 'Pedido cancelado'
      });
      
      if (!updatedOrder) {
        return res.status(500).json({ message: "Failed to cancel order" });
      }
      
      console.log('✅ Pedido cancelado:', updatedOrder.id);
      
      // 🔔 DISPARAR WEBHOOK DE CANCELAMENTO
      console.log('🔔 Disparando webhook de cancelamento financeiro...');
      
      const webhookResult = await financialWebhook.processOrderCancellation(id);
      
      if (webhookResult.success) {
        console.log('✅ Webhook de cancelamento executado:', webhookResult.message);
      } else {
        console.error('❌ Erro no webhook de cancelamento:', webhookResult.message);
      }
      
      res.json({
        success: true,
        order: updatedOrder,
        webhook: {
          success: webhookResult.success,
          message: webhookResult.message,
          transactionId: webhookResult.transactionId
        }
      });
      
    } catch (error) {
      console.error('❌ Erro ao cancelar pedido:', error);
      res.status(500).json({ message: "Failed to cancel order" });
    }
  });

  // Registrar pagamento de crediário
  app.post("/api/admin/credit/:id/payment", async (req, res) => {
    try {
      const { id } = req.params;
      const { amount, paymentMethod, notes } = req.body;
      
      console.log('💰 Registrando pagamento de crediário:', id, { amount, paymentMethod });
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Amount must be greater than 0" });
      }
      
      // Buscar conta de crediário
      const creditAccount = await storage.getCreditAccount(id);
      if (!creditAccount) {
        return res.status(404).json({ message: "Credit account not found" });
      }
      
      // Calcular novos valores
      const currentPaid = parseFloat(creditAccount.paidAmount?.toString() || '0');
      const newPaidAmount = currentPaid + parseFloat(amount);
      const totalAmount = parseFloat(creditAccount.totalAmount?.toString() || '0');
      const newRemainingAmount = Math.max(0, totalAmount - newPaidAmount);
      
      // Atualizar conta de crediário
      const updatedAccount = await storage.updateCreditAccount(id, {
        paidAmount: newPaidAmount.toString(),
        remainingAmount: newRemainingAmount.toString(),
        status: newRemainingAmount <= 0 ? 'paid' : 'active'
      });
      
      if (!updatedAccount) {
        return res.status(500).json({ message: "Failed to update credit account" });
      }
      
      console.log('✅ Pagamento de crediário registrado:', updatedAccount.id);
      
      // 🎯 NOVO FLUXO: Se a conta foi quitada, finalizar automaticamente as reservas
      if (newRemainingAmount <= 0) {
        console.log('🎉 Conta quitada! Iniciando finalização automática das reservas...');
        
        try {
          const finalizationResult = await finalizeCreditAccountReservations(id);
          console.log('✅ Finalização automática concluída:', finalizationResult);
        } catch (finalizationError) {
          console.error('❌ Erro na finalização automática:', finalizationError);
          // Não falha o pagamento, apenas loga o erro
        }
      }
      
      // 🔔 DISPARAR WEBHOOK DE PAGAMENTO DE CREDIÁRIO
      console.log('🔔 Disparando webhook de pagamento de crediário...');
      
      const webhookResult = await financialWebhook.processCreditPayment(id, parseFloat(amount));
      
      if (webhookResult.success) {
        console.log('✅ Webhook de pagamento executado:', webhookResult.message);
      } else {
        console.error('❌ Erro no webhook de pagamento:', webhookResult.message);
      }
      
      res.json({
        success: true,
        creditAccount: updatedAccount,
        webhook: {
          success: webhookResult.success,
          message: webhookResult.message,
          transactionId: webhookResult.transactionId,
          syncedData: webhookResult.syncedData
        }
      });
      
    } catch (error) {
      console.error('❌ Erro ao registrar pagamento de crediário:', error);
      res.status(500).json({ message: "Failed to register credit payment" });
    }
  });

  // ================================================================
  // API PARA FINALIZAÇAO AUTOMATICA DE RESERVAS DO CREDITO
  // ================================================================
  
  // Finalizar automaticamente as reservas quando a conta de crediario e quitada
  app.post("/api/admin/credit-accounts/:id/finalize-reservations", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('🎯 Iniciando finalização automática de reservas para conta:', id);
      
      const result = await finalizeCreditAccountReservations(id);
      
      res.json({
        success: true,
        ...result
      });
      
    } catch (error) {
      console.error('❌ Erro ao finalizar reservas da conta de crediário:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to finalize credit account reservations",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Sincronização manual de dados históricos
  app.post("/api/admin/financial/sync-historical", async (req, res) => {
    try {
      console.log('🔄 Iniciando sincronização manual de dados históricos...');
      
      const result = await financialWebhook.syncHistoricalData();
      
      if (result.success) {
        console.log('✅ Sincronização concluída:', result.message);
      } else {
        console.error('❌ Falha na sincronização:', result.message);
      }
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Erro na sincronização histórica:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to sync historical data",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Status do webhook e sincronização
  app.get("/api/admin/financial/sync-status", async (req, res) => {
    try {
      const [transactions, orders, creditAccounts] = await Promise.all([
        storage.getAllTransactions(),
        storage.getAllOrders(),
        storage.getAllCreditAccounts()
      ]);
      
      // Analisar status de sincronização
      const confirmedOrders = orders.filter(o => o.status === 'confirmed' || o.status === 'completed');
      const syncedOrders = transactions.filter(t => 
        t.metadata && 
        typeof t.metadata === 'object' && 
        (t.metadata as any).source === 'order_webhook'
      );
      
      const activeCreditAccounts = creditAccounts.filter(ca => ca.status === 'active');
      const syncedCreditPayments = transactions.filter(t => 
        t.metadata && 
        typeof t.metadata === 'object' && 
        (t.metadata as any).source === 'credit_webhook'
      );
      
      const status = {
        orders: {
          total: orders.length,
          confirmed: confirmedOrders.length,
          synced: syncedOrders.length,
          pendingSync: Math.max(0, confirmedOrders.length - syncedOrders.length)
        },
        credit: {
          totalAccounts: creditAccounts.length,
          activeAccounts: activeCreditAccounts.length,
          syncedPayments: syncedCreditPayments.length
        },
        transactions: {
          total: transactions.length,
          webhookGenerated: transactions.filter(t => 
            t.metadata && 
            typeof t.metadata === 'object' && 
            ['order_webhook', 'credit_webhook'].includes((t.metadata as any).source)
          ).length
        },
        syncHealth: {
          ordersInSync: confirmedOrders.length === syncedOrders.length,
          lastSyncCheck: new Date().toISOString()
        }
      };
      
      res.json(status);
      
    } catch (error) {
      console.error('❌ Erro ao verificar status de sincronização:', error);
      res.status(500).json({ message: "Failed to get sync status" });
    }
  });

  console.log('🔔 Rotas de webhook financeiro registradas:');
  console.log('✅ POST /api/admin/orders/:id/cancel - Cancelar pedido com webhook');
  console.log('✅ POST /api/admin/credit/:id/payment - Registrar pagamento crediário');
  console.log('✅ POST /api/admin/financial/sync-historical - Sincronização histórica');
  console.log('✅ GET /api/admin/financial/sync-status - Status de sincronização');
  console.log('');

  // ========================================
  // 🚀 SISTEMA DE JOB DE SINCRONIZAÇÃO
  // ========================================

  // Iniciar job de sincronização automática
  app.post("/api/admin/financial/sync-job/start", async (req, res) => {
    try {
      const { intervalMinutes = 30 } = req.body;
      
      console.log('🚀 Iniciando job de sincronização automática:', { intervalMinutes });
      
      const status = financialSyncJob.getStatus();
      if (status.isRunning) {
        return res.status(400).json({ 
          success: false,
          message: "Job já está em execução" 
        });
      }
      
      financialSyncJob.start(intervalMinutes);
      
      console.log('✅ Job de sincronização iniciado com sucesso');
      
      res.json({
        success: true,
        message: `Job de sincronização iniciado (intervalo: ${intervalMinutes} minutos)`,
        status: financialSyncJob.getStatus()
      });
      
    } catch (error) {
      console.error('❌ Erro ao iniciar job de sincronização:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to start sync job" 
      });
    }
  });

  // Parar job de sincronização
  app.post("/api/admin/financial/sync-job/stop", async (req, res) => {
    try {
      console.log('⏹️ Parando job de sincronização...');
      
      financialSyncJob.stop();
      
      console.log('✅ Job de sincronização parado com sucesso');
      
      res.json({
        success: true,
        message: "Job de sincronização parado",
        status: financialSyncJob.getStatus()
      });
      
    } catch (error) {
      console.error('❌ Erro ao parar job de sincronização:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to stop sync job" 
      });
    }
  });

  // Executar job de sincronização manualmente
  app.post("/api/admin/financial/sync-job/run", async (req, res) => {
    try {
      console.log('🚀 Executando job de sincronização manual...');
      
      const result = await financialSyncJob.runSyncJob();
      
      if (result.success) {
        console.log('✅ Job de sincronização manual concluído:', result.message);
      } else {
        console.error('❌ Job de sincronização manual falhou:', result.message);
      }
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Erro ao executar job manual:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to run sync job" 
      });
    }
  });

  // Status detalhado do job
  app.get("/api/admin/financial/sync-job/status", async (req, res) => {
    try {
      const status = financialSyncJob.getStatus();
      const detailedStats = await financialSyncJob.getDetailedStats();
      
      res.json({
        success: true,
        status,
        stats: detailedStats
      });
      
    } catch (error) {
      console.error('❌ Erro ao obter status do job:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to get job status" 
      });
    }
  });

  // Detectar inconsistências
  app.get("/api/admin/financial/inconsistencies", async (req, res) => {
    try {
      console.log('🔍 Detectando inconsistências nos dados...');
      
      // Usar método interno do job para detectar inconsistências
      const inconsistencies = await financialSyncJob.detectInconsistencies();
      
      console.log(`✅ Inconsistências detectadas: ${inconsistencies.length}`);
      
      // Categorizar por severidade
      const categorized = {
        high: inconsistencies.filter(i => i.severity === 'high'),
        medium: inconsistencies.filter(i => i.severity === 'medium'),
        low: inconsistencies.filter(i => i.severity === 'low')
      };
      
      res.json({
        success: true,
        total: inconsistencies.length,
        categorized,
        inconsistencies: inconsistencies.map(i => ({
          ...i,
          detectedAt: new Date().toISOString()
        }))
      });
      
    } catch (error) {
      console.error('❌ Erro ao detectar inconsistências:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to detect inconsistencies" 
      });
    }
  });

  // Corrigir inconsistências específicas
  app.post("/api/admin/financial/fix-inconsistencies", async (req, res) => {
    try {
      const { inconsistencyIds } = req.body;
      
      console.log('🔧 Corrigindo inconsistências:', inconsistencyIds);
      
      // Detectar todas as inconsistências
      const allInconsistencies = await financialSyncJob.detectInconsistencies();
      
      // Filtrar apenas as solicitadas (por simplicidade, corrigir todas as críticas)
      const criticalInconsistencies = allInconsistencies.filter(i => i.severity === 'high');
      
      const fixedCount = await financialSyncJob.fixCriticalInconsistencies(criticalInconsistencies);
      
      console.log(`✅ Inconsistências corrigidas: ${fixedCount}`);
      
      res.json({
        success: true,
        fixedCount,
        message: `${fixedCount} inconsistências críticas foram corrigidas`
      });
      
    } catch (error) {
      console.error('❌ Erro ao corrigir inconsistências:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fix inconsistencies" 
      });
    }
  });

  console.log('🚀 Rotas de job de sincronização registradas:');
  console.log('✅ POST /api/admin/financial/sync-job/start - Iniciar job automático');
  console.log('✅ POST /api/admin/financial/sync-job/stop - Parar job automático');
  console.log('✅ POST /api/admin/financial/sync-job/run - Executar job manual');
  console.log('✅ GET /api/admin/financial/sync-job/status - Status detalhado');
  console.log('✅ GET /api/admin/financial/inconsistencies - Detectar inconsistências');
  console.log('✅ POST /api/admin/financial/fix-inconsistencies - Corrigir inconsistências');
  console.log('');

  // Job de sincronização será iniciado manualmente via API
  console.log('🚨 Job de sincronização disponível para inicialização manual');
  console.log('');

  // ========================================
  // 🌟 SISTEMA DE AVALIAÇÕES - NOVA API
  // ========================================

  // Listar todas as avaliações (admin)
  app.get("/api/admin/reviews", async (req, res) => {
    try {
      console.log('🌟 Buscando todas as avaliações...');
      
      const reviews = await storage.getAllProductReviews();
      
      console.log('✅ Avaliações encontradas:', reviews.length);
      res.json(reviews);
    } catch (error) {
      console.error('❌ Erro ao buscar avaliações:', error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Buscar avaliações de um produto específico (público)
  app.get("/api/products/:productId/reviews", async (req, res) => {
    try {
      const { productId } = req.params;
      console.log('🌟 Buscando avaliações do produto:', productId);
      
      const reviews = await storage.getProductReviews(productId);
      
      console.log('✅ Avaliações do produto encontradas:', reviews.length);
      res.json(reviews);
    } catch (error) {
      console.error('❌ Erro ao buscar avaliações do produto:', error);
      res.status(500).json({ message: "Failed to fetch product reviews" });
    }
  });

  // Buscar avaliação por ID (admin)
  app.get("/api/admin/reviews/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('🌟 Buscando avaliação:', id);
      
      const review = await storage.getProductReview(id);
      
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }
      
      console.log('✅ Avaliação encontrada:', review.id);
      res.json(review);
    } catch (error) {
      console.error('❌ Erro ao buscar avaliação:', error);
      res.status(500).json({ message: "Failed to fetch review" });
    }
  });

  // Criar nova avaliação (público)
  app.post("/api/products/:productId/reviews", async (req, res) => {
    try {
      const { productId } = req.params;
      const { customerName, customerPhone, rating, comment, recommendation, isVerifiedPurchase } = req.body;
      
      console.log('🌟 Criando nova avaliação para produto:', productId);
      
      // Validar dados obrigatórios
      if (!customerName || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "customerName e rating (1-5) são obrigatórios" });
      }
      
      const reviewData = {
        productId,
        customerName,
        customerEmail: customerPhone || null, // Usando campo de email para telefone temporário
        rating,
        title: recommendation === 'sim' ? '👍 Recomendo este produto' : '👎 Não recomendo',
        comment: comment || null,
        isVerifiedPurchase: isVerifiedPurchase || false,
        isApproved: true // Por padrão aprovar automaticamente
      };
      
      const review = await storage.createProductReview(reviewData);
      
      console.log('✅ Avaliação criada com sucesso:', review.id);
      res.status(201).json({ success: true, data: review });
    } catch (error) {
      console.error('❌ Erro ao criar avaliação:', error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // Atualizar avaliação (admin)
  app.put("/api/admin/reviews/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      console.log('🌟 Atualizando avaliação:', id);
      
      // Validar rating se fornecido
      if (updateData.rating && (updateData.rating < 1 || updateData.rating > 5)) {
        return res.status(400).json({ message: "Rating deve estar entre 1 e 5" });
      }
      
      const review = await storage.updateProductReview(id, updateData);
      
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }
      
      console.log('✅ Avaliação atualizada:', review.id);
      res.json(review);
    } catch (error) {
      console.error('❌ Erro ao atualizar avaliação:', error);
      res.status(500).json({ message: "Failed to update review" });
    }
  });

  // Deletar avaliação (admin)
  app.delete("/api/admin/reviews/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('🌟 Deletando avaliação:', id);
      
      const deleted = await storage.deleteProductReview(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Review not found" });
      }
      
      console.log('✅ Avaliação deletada:', id);
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Erro ao deletar avaliação:', error);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  // Aprovar/reprovar avaliação (admin)
  app.patch("/api/admin/reviews/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const { isApproved } = req.body;
      
      console.log('🌟 Alterando aprovação da avaliação:', id, { isApproved });
      
      const review = await storage.updateProductReview(id, { isApproved });
      
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }
      
      console.log('✅ Status de aprovação atualizado:', review.id);
      res.json(review);
    } catch (error) {
      console.error('❌ Erro ao atualizar aprovação:', error);
      res.status(500).json({ message: "Failed to update review approval" });
    }
  });

  console.log('🌟 Rotas de avaliações registradas:');
  console.log('✅ GET /api/admin/reviews - Listar todas as avaliações');
  console.log('✅ GET /api/products/:productId/reviews - Avaliações de um produto');
  console.log('✅ GET /api/admin/reviews/:id - Buscar avaliação por ID');
  console.log('✅ POST /api/products/:productId/reviews - Criar avaliação');
  console.log('✅ PUT /api/admin/reviews/:id - Atualizar avaliação');
  console.log('✅ DELETE /api/admin/reviews/:id - Deletar avaliação');
  console.log('✅ PATCH /api/admin/reviews/:id/approve - Aprovar/reprovar avaliação');
  console.log('');

  const httpServer = createServer(app);
  return httpServer;
}
