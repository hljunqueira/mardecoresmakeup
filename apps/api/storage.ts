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
  Reservation,
  InsertReservation,
  ProductRequest,
  InsertProductRequest,
  Customer,
  InsertCustomer,
  CustomerAddress,
  InsertCustomerAddress,
  CreditAccount,
  InsertCreditAccount,
  CreditPayment,
  InsertCreditPayment,
  CreditAccountItem,
  InsertCreditAccountItem,
  Order,
  InsertOrder,
  OrderItem,
  InsertOrderItem,
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
  
  // NOVAS OPERAÇÕES DE BUSCA INTELIGENTE PARA CREDIÁRIO
  searchAvailableProducts(filters: {
    query: string;
    category: string | null;
    brand: string | null;
    minStock: number;
    maxPrice: number | null;
    featured: boolean | null;
  }): Promise<Product[]>;
  
  advancedProductSearch(params: {
    query: string;
    categories: string[];
    brands: string[];
    priceMin: number | null;
    priceMax: number | null;
    activeOnly: boolean;
    stockOnly: boolean;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    limit: number;
  }): Promise<Product[]>;

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


  // Product Request operations
  createProductRequest(productRequest: InsertProductRequest): Promise<ProductRequest>;
  getProductRequests(): Promise<ProductRequest[]>;
  getProductRequest(id: string): Promise<ProductRequest | undefined>;
  updateProductRequest(id: string, productRequest: Partial<ProductRequest>): Promise<ProductRequest | undefined>;
  deleteProductRequest(id: string): Promise<boolean>;
  
  // NOVAS OPERAÇÕES DE CLIENTES PARA CREDIÁRIO
  getAllCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  searchCustomers(query: string): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<Customer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;
  
  // Customer Address operations
  getCustomerAddresses(customerId: string): Promise<CustomerAddress[]>;
  createCustomerAddress(address: InsertCustomerAddress): Promise<CustomerAddress>;
  updateCustomerAddress(id: string, address: Partial<CustomerAddress>): Promise<CustomerAddress | undefined>;
  deleteCustomerAddress(id: string): Promise<boolean>;
  
  // NOVAS OPERAÇÕES DE CONTAS DE CREDIÁRIO
  getAllCreditAccounts(): Promise<CreditAccount[]>;
  getCreditAccount(id: string): Promise<CreditAccount | undefined>;
  getCreditAccountsByCustomer(customerId: string): Promise<CreditAccount[]>;
  createCreditAccount(account: InsertCreditAccount): Promise<CreditAccount>;
  updateCreditAccount(id: string, account: Partial<CreditAccount>): Promise<CreditAccount | undefined>;
  deleteCreditAccount(id: string): Promise<boolean>;
  
  // Credit Payment operations
  getCreditPayments(creditAccountId: string): Promise<CreditPayment[]>;
  getCreditPaymentsByAccount(accountId: string): Promise<CreditPayment[]>;
  getCreditPayment(id: string): Promise<CreditPayment | undefined>;
  createCreditPayment(payment: InsertCreditPayment): Promise<CreditPayment>;
  updateCreditPayment(id: string, payment: Partial<CreditPayment>): Promise<CreditPayment | undefined>;
  deleteCreditPayment(id: string): Promise<boolean>;
  getCreditPaymentsReport(filters: {
    startDate?: Date;
    endDate?: Date;
    customerId?: string;
    accountId?: string;
  }): Promise<CreditPayment[]>;
  
  // Credit Account Item operations
  getCreditAccountItems(creditAccountId: string): Promise<CreditAccountItem[]>;
  createCreditAccountItem(item: InsertCreditAccountItem): Promise<CreditAccountItem>;
  updateCreditAccountItem(id: string, item: Partial<CreditAccountItem>): Promise<CreditAccountItem | undefined>;
  deleteCreditAccountItem(id: string): Promise<boolean>;
  
  // Order operations - NOVO SISTEMA DE PEDIDOS (TODO: Implementar no SupabaseStorage)
  getAllOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByCustomer(customerId: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, order: Partial<Order>): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<boolean>;
  getOrdersReport(filters: {
    startDate?: Date;
    endDate?: Date;
    customerId?: string;
    status?: string;
    paymentType?: string;
  }): Promise<Order[]>;
  
  // Order Item operations (TODO: Implementar no SupabaseStorage)
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  updateOrderItem(id: string, item: Partial<OrderItem>): Promise<OrderItem | undefined>;
  deleteOrderItem(id: string): Promise<boolean>;
  
  // Order utilities (TODO: Implementar no SupabaseStorage)
  generateOrderNumber(): Promise<string>;
  calculateOrderTotal(orderId: string): Promise<number>;
  
  // Product Review operations
  getAllProductReviews(): Promise<any[]>;
  getProductReviews(productId: string): Promise<any[]>;
  getProductReview(id: string): Promise<any>;
  createProductReview(review: any): Promise<any>;
  updateProductReview(id: string, review: any): Promise<any>;
  deleteProductReview(id: string): Promise<boolean>;
}

// Configuração direta do Supabase Storage
let storage: IStorage;

async function initializeStorage(): Promise<IStorage> {
  try {
    const { SupabaseStorage } = await import('./supabase-storage.js');
    const supabaseStorage = new SupabaseStorage();
    console.log('✅ Usando Supabase Storage');
    // TODO: Implementar métodos de pedidos no SupabaseStorage
    return supabaseStorage as unknown as IStorage;
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
