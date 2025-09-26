import type {
  User,
  InsertUser,
  Product,
  InsertProduct,
  Collection,
  InsertCollection,
  Coupon,
  InsertCoupon,
  FinancialTransaction,
  InsertFinancialTransaction,
  Supplier,
  InsertSupplier,
  ProductImage,
  InsertProductImage,
  SiteView,
  InsertSiteView,
  Analytics,
  InsertAnalytics,
  Reservation,
  InsertReservation,
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Product operations
  getAllProducts(): Promise<Product[]>;
  getActiveProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  getFeaturedProducts(): Promise<Product[]>;

  // Product Images operations
  getProductImages(productId: string): Promise<ProductImage[]>;
  addProductImage(image: InsertProductImage): Promise<ProductImage>;
  updateProductImage(id: string, image: Partial<ProductImage>): Promise<ProductImage | undefined>;
  deleteProductImage(id: string): Promise<boolean>;
  setMainProductImage(productId: string, imageId: string): Promise<boolean>;

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

  // Reservation operations
  getAllReservations(): Promise<Reservation[]>;
  getReservation(id: string): Promise<Reservation | undefined>;
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  updateReservation(id: string, reservation: Partial<Reservation>): Promise<Reservation | undefined>;
  deleteReservation(id: string): Promise<boolean>;

  // Site Views operations
  recordSiteView(view: InsertSiteView): Promise<SiteView>;
  getSiteViewsStats(): Promise<{
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  }>;

  // Analytics operations
  recordAnalytic(analytic: InsertAnalytics): Promise<Analytics>;
  getAnalytics(metric: string, period?: number): Promise<Analytics[]>;
}

// Configuração direta do Supabase Storage
let storage: IStorage;

async function initializeStorage(): Promise<IStorage> {
  try {
    const { SupabaseStorage } = await import('./supabase-storage.js');
    const supabaseStorage = new SupabaseStorage();
    console.log('✅ Usando Supabase Storage');
    return supabaseStorage;
  } catch (error) {
    console.error('❌ Falha ao carregar Supabase Storage:', error);
    throw new Error('Não foi possível conectar com o Supabase. Verifique as configurações.');
  }
}

// Inicialização do storage - apenas Supabase
initializeStorage().then(s => {
  storage = s;
}).catch(error => {
  console.error('💥 Erro crítico na inicialização do storage:', error);
  process.exit(1);
});

export { storage };
