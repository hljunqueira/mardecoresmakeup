import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign,
  CreditCard,
  Search,
  Package,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  UserPlus,
  Phone,
  Mail,
  Calculator,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  ArrowLeft
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CustomerModal from "@/components/ui/customer-modal";
import type { Product, Customer } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderType: 'cash' | 'credit';
}

export function NewOrderModal({ isOpen, onClose, orderType }: NewOrderModalProps) {
  const [activeTab, setActiveTab] = useState("products");
  const [searchTerm, setSearchTerm] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerData, setCustomerData] = useState({
    name: "",
    phone: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
    enabled: isOpen,
  });

  const { data: customers, isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/admin/customers"],
    enabled: isOpen && orderType === 'credit',
  });

  // Mutation para criar pedido
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      if (!response.ok) throw new Error("Erro ao criar pedido");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pedido criado com sucesso!",
        description: orderType === 'credit' 
          ? "O pedido foi registrado e o estoque já foi reduzido."
          : "O pedido foi registrado no sistema.",
      });
      
      // 💰 Invalidar TODAS as queries relacionadas (incluindo financeiro)
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/financial/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/financial/consolidated"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      
      console.log('✅ Todas as queries invalidadas - sistema financeiro atualizado');
      
      // 📢 Disparar evento personalizado para atualização financeira
      const financialEvent = new CustomEvent('financial-update', {
        detail: { 
          source: 'order-creation', 
          orderType: orderType,
          amount: subtotal,
          timestamp: new Date().toISOString() 
        }
      });
      window.dispatchEvent(financialEvent);
      
      const orderEvent = new CustomEvent('order-status-change', {
        detail: { 
          action: 'created',
          orderType: orderType,
          amount: subtotal,
          timestamp: new Date().toISOString() 
        }
      });
      window.dispatchEvent(orderEvent);
      
      console.log('📢 Eventos financeiros disparados');
      
      // Limpar apenas se sucesso (não devolver estoque)
      setActiveTab("products");
      setSearchTerm("");
      setCartItems([]);
      setSelectedCustomer(null);
      setCustomerData({ name: "", phone: "" });
      setPaymentMethod("");
      setNotes("");
      setIsSubmitting(false);
      setIsCustomerModalOpen(false);
      onClose();
    },
    onError: (error) => {
      console.error('Erro ao criar pedido:', error);
      
      // Se houve erro e é crediário, devolver estoque
      if (orderType === 'credit' && cartItems.length > 0) {
        console.log('❌ Erro na criação do pedido - devolvendo estoque...');
        
        cartItems.forEach(async (item) => {
          try {
            const newStock = (item.product.stock || 0) + item.quantity;
            
            await apiRequest("PUT", `/api/admin/products/${item.product.id}`, {
              stock: newStock
            });
            
            console.log(`🔄 Estoque devolvido por erro: ${item.product.name}`);
          } catch (stockError) {
            console.error(`❌ Erro ao devolver estoque de ${item.product.name}:`, stockError);
          }
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      }
      
      toast({
        title: "Erro ao criar pedido",
        description: "Tente novamente ou contate o suporte.",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleClose = async () => {
    // 🎯 NOVO FLUXO: Para pedidos de crediário, devolver estoque dos produtos no carrinho
    if (orderType === 'credit' && cartItems.length > 0) {
      console.log('🔄 Devolvendo estoque dos produtos no carrinho ao fechar modal...');
      
      for (const item of cartItems) {
        try {
          const newStock = (item.product.stock || 0) + item.quantity;
          
          await apiRequest("PUT", `/api/admin/products/${item.product.id}`, {
            stock: newStock
          });
          
          console.log(`🔄 Estoque devolvido: ${item.product.name} (${item.product.stock} → ${newStock})`);
        } catch (error) {
          console.error(`❌ Erro ao devolver estoque de ${item.product.name}:`, error);
        }
      }
      
      // Invalidar queries para atualizar a interface
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      
      console.log('✅ Estoque devolvido para todos os produtos');
    }
    
    setActiveTab("products");
    setSearchTerm("");
    setCartItems([]);
    setSelectedCustomer(null);
    setCustomerData({ name: "", phone: "" });
    setPaymentMethod("");
    setNotes("");
    setIsSubmitting(false);
    setIsCustomerModalOpen(false);
    onClose();
  };

  const handleCustomerCreated = (newCustomer: Customer) => {
    setSelectedCustomer(newCustomer);
  };

  const addToCart = async (product: Product) => {
    const existingItem = cartItems.find(item => item.product.id === product.id);
    
    if (existingItem) {
      // 🎯 NOVO: Para crediário, permitir adicionar mesmo com estoque 0 (se já está no carrinho)
      if (orderType === 'credit') {
        // Para crediário: verificar estoque atual no servidor
        const currentStock = products?.find(p => p.id === product.id)?.stock || 0;
        
        if (currentStock > 0) {
          await updateQuantity(product.id, existingItem.quantity + 1);
        } else {
          toast({
            title: "Estoque esgotado",
            description: `Não há mais estoque de ${product.name}`,
            variant: "destructive",
          });
        }
      } else {
        // Para pedidos à vista: regra original
        if (existingItem.quantity < (product.stock || 0)) {
          await updateQuantity(product.id, existingItem.quantity + 1);
        } else {
          toast({
            title: "Estoque insuficiente",
            description: `Máximo disponível: ${product.stock}`,
            variant: "destructive",
          });
        }
      }
    } else {
      // 🎯 NOVO FLUXO: Para pedidos de crediário, reduzir estoque imediatamente
      if (orderType === 'credit') {
        try {
          console.log(`📦 Reduzindo estoque para crediário: ${product.name} (${product.stock} → ${(product.stock || 0) - 1})`);
          
          // Verificar se há estoque suficiente
          if ((product.stock || 0) <= 0) {
            toast({
              title: "Estoque esgotado",
              description: `Produto ${product.name} sem estoque disponível`,
              variant: "destructive",
            });
            return;
          }
          
          // Reduzir estoque do produto na API
          await apiRequest("PUT", `/api/admin/products/${product.id}`, {
            stock: (product.stock || 0) - 1
          });
          
          // Invalidar queries para atualizar a lista de produtos
          queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
          queryClient.invalidateQueries({ queryKey: ["/api/products"] });
          
          console.log(`✅ Estoque reduzido com sucesso: ${product.name}`);
          
          toast({
            title: "Produto adicionado",
            description: `${product.name} adicionado ao carrinho (estoque reduzido)`,
          });
        } catch (error) {
          console.error('❌ Erro ao reduzir estoque:', error);
          toast({
            title: "Erro ao reduzir estoque",
            description: "Não foi possível adicionar o produto. Tente novamente.",
            variant: "destructive",
          });
          return;
        }
      }
      
      const unitPrice = parseFloat(product.price.toString());
      const newItem: CartItem = {
        product: {
          ...product,
          // Atualizar estoque local para pedidos de crediário
          stock: orderType === 'credit' ? (product.stock || 0) - 1 : product.stock
        },
        quantity: 1,
        unitPrice,
        totalPrice: unitPrice,
      };
      setCartItems([...cartItems, newItem]);
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity === 0) {
      await removeFromCart(productId);
      return;
    }

    const currentItem = cartItems.find(item => item.product.id === productId);
    if (!currentItem) return;
    
    const quantityDiff = quantity - currentItem.quantity;
    
    // 🎯 NOVO FLUXO: Para pedidos de crediário, ajustar estoque na diferença
    if (orderType === 'credit' && quantityDiff !== 0) {
      try {
        const newStock = (currentItem.product.stock || 0) - quantityDiff;
        
        if (newStock < 0) {
          toast({
            title: "Estoque insuficiente",
            description: `Estoque disponível: ${currentItem.product.stock}`,
            variant: "destructive",
          });
          return;
        }
        
        console.log(`📦 Ajustando estoque: ${currentItem.product.name} (${currentItem.product.stock} → ${newStock})`);
        
        // Atualizar estoque na API
        await apiRequest("PUT", `/api/admin/products/${productId}`, {
          stock: newStock
        });
        
        // Invalidar queries para atualizar
        queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        
        console.log(`✅ Estoque ajustado: ${currentItem.product.name}`);
      } catch (error) {
        console.error('❌ Erro ao ajustar estoque:', error);
        toast({
          title: "Erro ao ajustar estoque",
          description: "Não foi possível alterar a quantidade.",
          variant: "destructive",
        });
        return;
      }
    }

    setCartItems(items =>
      items.map(item =>
        item.product.id === productId
          ? {
              ...item,
              quantity,
              totalPrice: item.unitPrice * quantity,
              product: {
                ...item.product,
                // Atualizar estoque local para pedidos de crediário
                stock: orderType === 'credit' ? (item.product.stock || 0) - quantityDiff : item.product.stock
              }
            }
          : item
      )
    );
  };

  const removeFromCart = async (productId: string) => {
    const itemToRemove = cartItems.find(item => item.product.id === productId);
    if (!itemToRemove) return;
    
    // 🎯 NOVO FLUXO: Para pedidos de crediário, devolver estoque quando remover
    if (orderType === 'credit') {
      try {
        const newStock = (itemToRemove.product.stock || 0) + itemToRemove.quantity;
        
        console.log(`🔄 Devolvendo estoque: ${itemToRemove.product.name} (${itemToRemove.product.stock} → ${newStock})`);
        
        // Devolver estoque na API
        await apiRequest("PUT", `/api/admin/products/${productId}`, {
          stock: newStock
        });
        
        // Invalidar queries para atualizar
        queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        
        console.log(`✅ Estoque devolvido: ${itemToRemove.product.name}`);
        
        toast({
          title: "Produto removido",
          description: `${itemToRemove.product.name} removido (estoque devolvido)`,
        });
      } catch (error) {
        console.error('❌ Erro ao devolver estoque:', error);
        toast({
          title: "Erro ao devolver estoque",
          description: "Produto removido, mas houve erro ao devolver estoque.",
          variant: "destructive",
        });
      }
    }
    
    setCartItems(items => items.filter(item => item.product.id !== productId));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // 🎯 NOVO FILTRO: Para crediário, mostrar produtos no carrinho mesmo com estoque 0
  const filteredProducts = products?.filter(product => {
    const isActive = product.active;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (orderType === 'credit') {
      // Para crediário: mostrar se tem estoque OU se já está no carrinho
      const isInCart = cartItems.some(item => item.product.id === product.id);
      const hasStock = (product.stock || 0) > 0;
      return isActive && matchesSearch && (hasStock || isInCart);
    } else {
      // Para pedidos à vista: regra normal (apenas com estoque)
      const hasStock = (product.stock || 0) > 0;
      return isActive && matchesSearch && hasStock;
    }
  }) || [];

  const canProceed = cartItems.length > 0 && (
    orderType === 'cash' ? 
      (paymentMethod && customerData.name.trim() !== '') : 
      selectedCustomer
  );

  const handleSubmit = async () => {
    if (!canProceed) return;

    setIsSubmitting(true);

    const orderData = {
      customerId: orderType === 'credit' ? selectedCustomer?.id : null,
      customerName: orderType === 'cash' ? customerData.name : selectedCustomer?.name,
      customerPhone: orderType === 'cash' ? customerData.phone : selectedCustomer?.phone,
      subtotal: subtotal,
      total: subtotal,
      paymentMethod: orderType === 'cash' ? paymentMethod : 'credit',
      status: 'pending',
      paymentStatus: orderType === 'cash' ? 'pending' : 'pending',
      notes,
      items: cartItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        productPrice: item.unitPrice,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
    };

    createOrderMutation.mutate(orderData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {orderType === 'cash' ? (
              <>
                <DollarSign className="h-5 w-5 text-green-600" />
                <span>Novo Pedido à Vista</span>
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 text-blue-600" />
                <span>Novo Pedido Crediário</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {orderType === 'cash' ? 
              'Criar um novo pedido com pagamento à vista (dinheiro, cartão ou PIX)' :
              'Criar um novo pedido para crediário ou adicionar a uma conta existente'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="products" className="flex items-center space-x-2">
                <Package className="h-4 w-4" />
                <span>Produtos</span>
                {cartItems.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {totalItems}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="customer" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>{orderType === 'cash' ? 'Cliente' : 'Conta'}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="review" 
                className="flex items-center space-x-2"
                disabled={!canProceed}
              >
                <ClipboardList className="h-4 w-4" />
                <span>Finalizar</span>
              </TabsTrigger>
            </TabsList>

            {/* Aba de Produtos */}
            <TabsContent value="products" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lista de Produtos */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Buscar produtos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {productsLoading ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Carregando produtos...</p>
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">Nenhum produto encontrado</p>
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <Card key={product.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-4">
                              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                {product.images && product.images.length > 0 ? (
                                  <img 
                                    src={product.images[0]} 
                                    alt={product.name}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <Package className="h-8 w-8 text-gray-400" />
                                )}
                              </div>
                              
                              <div className="flex-1">
                                <h4 className="font-medium">{product.name}</h4>
                                <p className="text-sm text-gray-500 mb-2">
                                  Estoque: {product.stock} unidades
                                  {product.stock === 0 && cartItems.some(item => item.product.id === product.id) && (
                                    <span className="text-orange-600 font-medium ml-2">(Já no carrinho)</span>
                                  )}
                                </p>
                                <div className="flex items-center justify-between">
                                  <p className="font-semibold text-lg text-petrol-700">
                                    {formatCurrency(parseFloat(product.price.toString()))}
                                  </p>
                                  <Button
                                    size="sm"
                                    onClick={() => addToCart(product)}
                                    className="bg-petrol-600 hover:bg-petrol-700"
                                    disabled={product.stock === 0 && !cartItems.some(item => item.product.id === product.id)}
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    {product.stock === 0 && cartItems.some(item => item.product.id === product.id) ? 'Adicionar +' : 'Adicionar'}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>

                {/* Carrinho */}
                <div className="space-y-4">
                  <Card className="border-petrol-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center justify-between text-petrol-700">
                        <div className="flex items-center space-x-2">
                          <ShoppingCart className="h-5 w-5" />
                          <span>Carrinho</span>
                        </div>
                        <Badge variant="outline" className="text-petrol-600 border-petrol-300">
                          {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {cartItems.length === 0 ? (
                        <div className="text-center py-8">
                          <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                          <p className="text-gray-500">Nenhum produto adicionado</p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {cartItems.map((item) => (
                              <div key={item.product.id} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm truncate">{item.product.name}</h4>
                                  <p className="text-xs text-gray-500">
                                    {formatCurrency(item.unitPrice)} cada
                                  </p>
                                </div>

                                <div className="flex items-center space-x-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 w-6 p-0"
                                    onClick={() => updateQuantity(item.product.id, Math.max(0, item.quantity - 1))}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  
                                  <span className="font-medium text-sm min-w-[1.5rem] text-center">
                                    {item.quantity}
                                  </span>
                                  
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 w-6 p-0"
                                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                    disabled={(item.product.stock || 0) <= item.quantity}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => removeFromCart(item.product.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>

                          <div className="border-t pt-4 space-y-2">
                            <div className="flex justify-between items-center text-lg font-bold text-petrol-700">
                              <span>Total:</span>
                              <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <Button 
                              onClick={() => setActiveTab("customer")}
                              className="w-full bg-petrol-600 hover:bg-petrol-700"
                              disabled={cartItems.length === 0}
                            >
                              Continuar
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Aba de Cliente/Conta */}
            <TabsContent value="customer" className="space-y-6">
              {orderType === 'cash' ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Dados do Cliente</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="customerName">Nome Completo</Label>
                        <Input
                          id="customerName"
                          value={customerData.name}
                          onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                          placeholder="Nome do cliente"
                        />
                      </div>
                      <div>
                        <Label htmlFor="customerPhone">Telefone</Label>
                        <Input
                          id="customerPhone"
                          value={customerData.phone}
                          onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                          placeholder="(xx) xxxxx-xxxx"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Método de Pagamento *</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o método" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Dinheiro</SelectItem>
                          <SelectItem value="card">Cartão</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CreditCard className="h-5 w-5" />
                      <span>Selecionar Cliente</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {customersLoading ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Carregando clientes...</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {customers?.map((customer) => (
                            <Card 
                              key={customer.id} 
                              className={`cursor-pointer transition-all ${
                                selectedCustomer?.id === customer.id 
                                  ? 'border-petrol-500 bg-petrol-50' 
                                  : 'hover:shadow-md'
                              }`}
                              onClick={() => setSelectedCustomer(customer)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium">{customer.name}</h4>
                                    <p className="text-sm text-gray-500">
                                      {customer.phone && (
                                        <span className="flex items-center">
                                          <Phone className="h-3 w-3 mr-1" />
                                          {customer.phone}
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  {selectedCustomer?.id === customer.id && (
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        
                        {/* Botão para criar novo cliente */}
                        <div className="border-t pt-4">
                          <Button
                            variant="outline"
                            onClick={() => setIsCustomerModalOpen(true)}
                            className="w-full border-dashed border-petrol-300 text-petrol-600 hover:border-petrol-500 hover:text-petrol-800 hover:bg-petrol-50"
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Criar Novo Cliente
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Aba de Finalização */}
            <TabsContent value="review" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <ClipboardList className="h-5 w-5" />
                        <span>Resumo do Pedido</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Cliente:</h4>
                        <p className="text-sm text-gray-600">
                          {orderType === 'cash' ? customerData.name : selectedCustomer?.name}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium">Itens do Pedido:</h4>
                        <div className="space-y-2">
                          {cartItems.map((item) => (
                            <div key={item.product.id} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.product.name}</span>
                              <span>{formatCurrency(item.totalPrice)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center text-lg font-bold">
                          <span>Total:</span>
                          <span>{formatCurrency(subtotal)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Observações</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Observações sobre o pedido (opcional)"
                        rows={4}
                      />
                    </CardContent>
                  </Card>

                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      className="flex-1 bg-petrol-600 hover:bg-petrol-700"
                      disabled={!canProceed || isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Criando...
                        </>
                      ) : (
                        'Finalizar Pedido'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
      
      {/* Modal de Cliente */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onCustomerCreated={handleCustomerCreated}
      />
    </Dialog>
  );
}