import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
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
  CheckCircle2,
  ClipboardList,
  Calculator
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

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface NewCreditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewCreditAccountModal({ isOpen, onClose }: NewCreditAccountModalProps) {
  const [activeTab, setActiveTab] = useState("products");
  const [searchTerm, setSearchTerm] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [installments, setInstallments] = useState(1);
  const [paymentFrequency, setPaymentFrequency] = useState<"weekly" | "monthly">("monthly");
  const [nextPaymentDate, setNextPaymentDate] = useState("");
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
    enabled: isOpen,
  });

  // Mutation para criar conta de crediário
  const createCreditAccountMutation = useMutation({
    mutationFn: async (accountData: any) => {
      const response = await fetch("/api/admin/credit-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountData),
      });
      if (!response.ok) throw new Error("Erro ao criar conta de crediário");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Conta de crediário criada com sucesso!",
        description: "A conta foi registrada no sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-accounts"] });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar conta de crediário",
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

  const handleClose = () => {
    setActiveTab("products");
    setSearchTerm("");
    setCartItems([]);
    setSelectedCustomer(null);
    setInstallments(1);
    setPaymentFrequency("monthly");
    setNextPaymentDate("");
    setNotes("");
    setIsSubmitting(false);
    setIsCustomerModalOpen(false);
    onClose();
  };

  const handleCustomerCreated = (newCustomer: Customer) => {
    setSelectedCustomer(newCustomer);
  };

  const addToCart = (product: Product) => {
    const existingItem = cartItems.find(item => item.product.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity < (product.stock || 0)) {
        updateQuantity(product.id, existingItem.quantity + 1);
      } else {
        toast({
          title: "Estoque insuficiente",
          description: `Máximo disponível: ${product.stock}`,
          variant: "destructive",
        });
      }
    } else {
      const unitPrice = parseFloat(product.price.toString());
      const newItem: CartItem = {
        product,
        quantity: 1,
        unitPrice,
        totalPrice: unitPrice,
      };
      setCartItems([...cartItems, newItem]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity === 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems(items =>
      items.map(item =>
        item.product.id === productId
          ? {
              ...item,
              quantity,
              totalPrice: item.unitPrice * quantity,
            }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCartItems(items => items.filter(item => item.product.id !== productId));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const installmentValue = installments > 0 ? subtotal / installments : 0;

  const filteredProducts = products?.filter(product =>
    product.active &&
    (product.stock || 0) > 0 &&
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const canProceed = cartItems.length > 0 && selectedCustomer;

  const handleSubmit = async () => {
    if (!canProceed) return;

    setIsSubmitting(true);

    // Gerar número da conta
    const accountNumber = `CR${Date.now().toString().slice(-6)}`;

    const accountData = {
      customerId: selectedCustomer!.id,
      accountNumber,
      totalAmount: subtotal,
      paidAmount: 0,
      remainingAmount: subtotal,
      installments,
      installmentValue,
      paymentFrequency,
      nextPaymentDate: nextPaymentDate || undefined,
      status: 'active',
      notes: notes.trim() || undefined,
      items: cartItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
    };

    createCreditAccountMutation.mutate(accountData);
  };

  // Set default next payment date
  useEffect(() => {
    if (!nextPaymentDate) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + (paymentFrequency === 'weekly' ? 7 : 30));
      setNextPaymentDate(defaultDate.toISOString().split('T')[0]);
    }
  }, [paymentFrequency, nextPaymentDate]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <span>Nova Conta com Produtos</span>
          </DialogTitle>
          <DialogDescription>
            Criar uma nova conta de crediário adicionando produtos diretamente
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
                <span>Cliente</span>
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
                                </p>
                                <div className="flex items-center justify-between">
                                  <p className="font-semibold text-lg text-petrol-700">
                                    {formatCurrency(parseFloat(product.price.toString()))}
                                  </p>
                                  <Button
                                    size="sm"
                                    onClick={() => addToCart(product)}
                                    className="bg-petrol-600 hover:bg-petrol-700"
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Adicionar
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
                          <span>Produtos</span>
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

            {/* Aba de Cliente */}
            <TabsContent value="customer" className="space-y-6">
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
            </TabsContent>

            {/* Aba de Finalização */}
            <TabsContent value="review" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <ClipboardList className="h-5 w-5" />
                        <span>Resumo da Conta</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Cliente:</h4>
                        <p className="text-sm text-gray-600">{selectedCustomer?.name}</p>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium">Produtos:</h4>
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
                        {installments > 1 && (
                          <div className="flex justify-between items-center text-sm text-gray-600 mt-2">
                            <span>{installments}x de:</span>
                            <span>{formatCurrency(installmentValue)}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Calculator className="h-5 w-5" />
                        <span>Condições de Pagamento</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="installments">Parcelas</Label>
                          <Input
                            id="installments"
                            type="number"
                            min="1"
                            value={installments}
                            onChange={(e) => setInstallments(Math.max(1, parseInt(e.target.value) || 1))}
                          />
                        </div>
                        <div>
                          <Label>Frequência</Label>
                          <Select value={paymentFrequency} onValueChange={(value: "weekly" | "monthly") => setPaymentFrequency(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekly">Semanal</SelectItem>
                              <SelectItem value="monthly">Mensal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="nextPaymentDate">Primeiro Vencimento</Label>
                        <Input
                          id="nextPaymentDate"
                          type="date"
                          value={nextPaymentDate}
                          onChange={(e) => setNextPaymentDate(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="notes">Observações</Label>
                        <Textarea
                          id="notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Observações sobre a conta (opcional)"
                          rows={3}
                        />
                      </div>
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
                        'Criar Conta'
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