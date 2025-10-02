import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AdminSidebar from "@/components/layout/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUpload } from "@/components/ui/image-upload";
import { ImageSearch } from "@/components/ui/image-search-simple";
import { DeleteConfirmation } from "@/components/ui/delete-confirmation";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useStockUpdate } from "@/hooks/use-stock-update";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Package, Star, AlertTriangle, Eye, EyeOff, Search, Minus } from "lucide-react";
import type { Product, InsertProduct } from "@shared/schema";
import { CATEGORIES, BRAZILIAN_BRANDS, PRODUCT_TAGS } from "@/lib/constants";
import { ProductWizard } from "@/components/ui/product-wizard";

const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  price: z.string().min(1, "Preço é obrigatório"),
  originalPrice: z.string().optional(),
  stock: z.number().min(0, "Estoque deve ser positivo").default(0),
  minStock: z.number().min(0, "Estoque mínimo deve ser positivo").default(5),
  images: z.array(z.string()).default([]),
  category: z.string().optional(),
  brand: z.string().optional(),
  customBrand: z.string().optional(),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
  tenDeal: z.boolean().default(false),
});

type ProductForm = z.infer<typeof productSchema>;

export default function AdminProducts() {
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImageSearchOpen, setIsImageSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastEditedProductId, setLastEditedProductId] = useState<string | null>(null);
  const { isAuthenticated } = useAdminAuth();
  const { toast } = useToast();

  // Mutation para atualizar estoque diretamente (incremento)
  const updateStockMutation = useMutation({
    mutationFn: async ({ productId, newStock }: { productId: string; newStock: number }) => {
      const response = await apiRequest("PUT", `/api/admin/products/${productId}`, {
        stock: newStock
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Estoque atualizado!",
        description: "O estoque foi modificado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar estoque",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    },
  });

  // Mutation para alternar visibilidade do produto (toggle active)
  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ productId, newActiveStatus }: { productId: string; newActiveStatus: boolean }) => {
      const response = await apiRequest("PUT", `/api/admin/products/${productId}`, {
        active: newActiveStatus
      });
      return response.json();
    },
    onSuccess: (updatedProduct) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: updatedProduct.active ? "Produto visível!" : "Produto oculto!",
        description: updatedProduct.active 
          ? "O produto agora está visível na loja." 
          : "O produto foi ocultado da loja.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao alterar visibilidade",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, setLocation]);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
    enabled: isAuthenticated,
  });

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      originalPrice: "",
      stock: 0,
      minStock: 5,
      images: [],
      category: "",
      brand: "",
      customBrand: "",
      tags: [],
      featured: false,
      active: true,
      tenDeal: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      // Limpar campos numéricos vazios antes de enviar
      const cleanedData = {
        ...data,
        originalPrice: data.originalPrice && data.originalPrice.trim() !== '' ? data.originalPrice : undefined,
        price: data.price && data.price.trim() !== '' ? data.price : '0',
      };
      
      // Primeiro criar o produto
      const response = await apiRequest("POST", "/api/admin/products", cleanedData);
      const product = await response.json();
      
      // Se há imagens, salvar os metadados no banco
      if (data.images && data.images.length > 0 && product.id) {
        for (let i = 0; i < data.images.length; i++) {
          try {
            await fetch(`/api/admin/products/${product.id}/images`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url: data.images[i],
                altText: `Imagem ${i + 1} do produto`,
                isPrimary: i === 0,
                sortOrder: i,
              }),
            });
          } catch (error) {
            console.warn(`Erro ao salvar metadados da imagem ${i + 1}:`, error);
          }
        }
      }
      
      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] }); // Invalida cache público também
      toast({
        title: "Produto criado!",
        description: "O produto foi adicionado com sucesso.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductForm }) => {
      // Limpar campos numéricos vazios antes de enviar
      const cleanedData = {
        ...data,
        originalPrice: data.originalPrice && data.originalPrice.trim() !== '' ? data.originalPrice : undefined,
        price: data.price && data.price.trim() !== '' ? data.price : '0',
      };
      
      const response = await apiRequest("PUT", `/api/admin/products/${id}`, cleanedData);
      return response.json();
    },
    onSuccess: (updatedProduct) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] }); // Invalida cache público também
      
      // Armazenar o ID do produto editado para manter posição
      setLastEditedProductId(updatedProduct.id);
      
      toast({
        title: "Produto atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
      setIsDialogOpen(false);
      setEditingProduct(null);
      form.reset();
      
      // Scroll para o produto editado após um breve delay
      setTimeout(() => {
        const productElement = document.getElementById(`product-${updatedProduct.id}`);
        if (productElement) {
          productElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/products/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.message || 'Erro ao deletar produto');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] }); // Invalida cache público também
      toast({
        title: "Produto excluído!",
        description: "O produto foi removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProductForm) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      description: product.description || "",
      price: product.price,
      originalPrice: product.originalPrice || "",
      stock: product.stock || 0,
      minStock: product.minStock || 5,
      images: product.images || [],
      category: product.category || "",
      brand: product.brand || "",
      tags: product.tags || [],
      featured: product.featured || false,
      active: product.active ?? true,
      tenDeal: (product as any).tenDeal || false,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (product: Product) => {
    setDeleteProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteProduct) {
      deleteMutation.mutate(deleteProduct.id);
      setIsDeleteDialogOpen(false);
      setDeleteProduct(null);
    }
  };

  const formatPrice = (price: string) => {
    return `R$ ${parseFloat(price).toFixed(2).replace('.', ',')}`;
  };

  const handleImageSelect = (imageUrl: string) => {
    const currentImages = form.getValues("images") || [];
    
    if (!currentImages.includes(imageUrl)) {
      const newImages = [...currentImages, imageUrl];
      
      // Atualizar valor no formulário
      form.setValue("images", newImages, { 
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });
      
      // Forçar revalidação e atualização do estado
      form.trigger("images");
      
      // Aguardar um ciclo de render antes de mostrar o toast
      setTimeout(() => {
        toast({
          title: "Imagem adicionada!",
          description: "A imagem da internet foi adicionada ao preview do produto.",
        });
      }, 100);
      
    } else {
      toast({
        title: "Imagem já existe",
        description: "Esta imagem já foi adicionada ao produto.",
        variant: "default",
      });
    }
    
    setIsImageSearchOpen(false);
  };

  if (!isAuthenticated) {
    return null;
  }

  // Remove all StockReductionConfirm modals and replace stock reduction logic
  const handleStockDecrease = (product: Product) => {
    const currentStock = product.stock || 0;
    if (currentStock > 0) {
      updateStockMutation.mutate({ 
        productId: product.id, 
        newStock: currentStock - 1 
      });
    }
  };

  // Função para filtrar produtos baseado no termo de busca
  const filteredProducts = products?.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleToggleVisibility = (product: Product) => {
    toggleVisibilityMutation.mutate({ productId: product.id, newActiveStatus: !product.active });
  };

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-64 overflow-auto">
        <div className="p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-petrol-500 dark:text-gold-500 mb-4">
                Produtos
              </h1>
              <p className="text-muted-foreground mb-2">
                Gerencie seu catálogo de produtos
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full lg:w-auto">
              {/* Campo de Busca */}
              <div className="relative flex-1 lg:flex-none lg:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 w-full"
                />
              </div>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-petrol-500 hover:bg-petrol-600 text-white w-full sm:w-auto"
                    onClick={() => {
                      setEditingProduct(null);
                      form.reset();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Produto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto" aria-describedby="product-form-description">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduct ? "Editar Produto" : "Novo Produto"}
                    </DialogTitle>
                    <div id="product-form-description" className="text-sm text-muted-foreground">
                      {editingProduct ? "Siga as etapas para modificar as informações do produto" : "Siga as etapas para criar um novo produto"}
                    </div>
                  </DialogHeader>
                  
                  <ProductWizard
                    onSubmit={(data) => {
                      if (editingProduct) {
                        updateMutation.mutate({ id: editingProduct.id, data });
                      } else {
                        createMutation.mutate(data);
                      }
                    }}
                    onCancel={() => {
                      setIsDialogOpen(false);
                      setEditingProduct(null);
                      form.reset();
                    }}
                    isLoading={createMutation.isPending || updateMutation.isPending}
                    editingProduct={editingProduct}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-0">
                    <Skeleton className="h-48 rounded-t-lg" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <div className="flex space-x-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              filteredProducts?.map((product) => {
                const isLowStock = (product.stock || 0) <= (product.minStock || 5);
                const isOutOfStock = (product.stock || 0) === 0;
                const isInactive = !product.active;
                const isLastEdited = lastEditedProductId === product.id;
                
                return (
                <Card 
                  key={product.id} 
                  id={`product-${product.id}`}
                  className={`group hover:shadow-lg transition-all duration-300 ${
                    isInactive ? 'opacity-60 border-gray-300' : ''
                  } ${
                    isLastEdited ? 'ring-2 ring-petrol-500 shadow-lg' : ''
                  }`}
                >
                  <CardContent className="p-0">
                    <div className="relative">
                      <img 
                        src={product.images?.[0] || "https://images.unsplash.com/photo-1586495777744-4413f21062fa"} 
                        alt={product.name}
                        className={`w-full h-48 object-cover rounded-t-lg ${
                          isInactive ? 'grayscale' : ''
                        }`} 
                      />
                      
                      {/* Badges de status */}
                      <div className="absolute top-2 left-2 space-y-1">
                        {product.featured && (
                          <Badge className="bg-gold-500 text-white">
                            <Star className="h-3 w-3 mr-1" />
                            Destaque
                          </Badge>
                        )}
                        
                        {isOutOfStock && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Sem Estoque
                          </Badge>
                        )}
                        
                        {isInactive && (
                          <Badge 
                            variant="outline" 
                            className="bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleVisibility(product);
                            }}
                            title="Clique para tornar visível"
                          >
                            <EyeOff className="h-3 w-3 mr-1" />
                            Oculto
                          </Badge>
                        )}
                        
                        {product.active && (
                          <Badge 
                            variant="outline" 
                            className="bg-green-100 text-green-700 cursor-pointer hover:bg-green-200 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleVisibility(product);
                            }}
                            title="Clique para ocultar"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Visível
                          </Badge>
                        )}
                      </div>
                      
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity space-y-1">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8"
                          onClick={() => handleDelete(product)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <h3 
                        className={`font-semibold mb-2 truncate cursor-help ${
                          isInactive ? 'text-gray-500' : 'text-foreground'
                        }`}
                        title={product.name}
                      >
                        {product.name}
                      </h3>
                      
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold text-gold-500">
                            {formatPrice(product.price)}
                          </span>
                          {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                            <span className="text-sm text-muted-foreground line-through">
                              {formatPrice(product.originalPrice)}
                            </span>
                          )}
                        </div>
                        
                        {product.rating && parseFloat(product.rating) > 0 ? (
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 text-gold-400 fill-current" />
                            <span className="text-sm font-medium text-gold-600">
                              {parseFloat(product.rating).toFixed(1)}
                            </span>
                            {product.reviewCount && product.reviewCount > 0 && (
                              <span className="text-xs text-muted-foreground">
                                ({product.reviewCount} aval.)
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 text-gray-300" />
                            <span className="text-xs text-muted-foreground">
                              Sem avaliações
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                        <span>{product.category}</span>
                      </div>
                      
                      {/* Indicador de estoque mínimo */}
                      <div className="text-xs text-gray-500 mb-3">
                        Estoque mínimo: {product.minStock || 5}
                      </div>
                      
                      {/* Controles de Estoque */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Controle de Estoque</span>
                          <Badge variant={isOutOfStock ? "destructive" : isLowStock ? "secondary" : "default"} className="text-xs">
                            {product.stock || 0} unidades
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-center gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-full bg-white border-petrol-300 text-petrol-700 hover:bg-white hover:border-petrol-500 hover:text-petrol-800 transition-colors dark:bg-white dark:border-petrol-400 dark:text-petrol-700 dark:hover:bg-white dark:hover:border-petrol-600"
                            onClick={() => {
                              handleStockDecrease(product);
                            }}
                            disabled={(product.stock || 0) <= 0 || updateStockMutation.isPending}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          
                          <span className="font-bold text-lg text-petrol-700 min-w-[3rem] text-center px-2 py-1 bg-white rounded-lg border border-petrol-300">
                            {product.stock || 0}
                          </span>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-full bg-white border-petrol-300 text-petrol-700 hover:bg-white hover:border-petrol-500 hover:text-petrol-800 transition-colors dark:bg-white dark:border-petrol-400 dark:text-petrol-700 dark:hover:bg-white dark:hover:border-petrol-600"
                            onClick={() => {
                              const currentStock = product.stock || 0;
                              updateStockMutation.mutate({
                                productId: product.id,
                                newStock: currentStock + 1
                              });
                            }}
                            disabled={updateStockMutation.isPending}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {updateStockMutation.isPending && (
                          <div className="flex items-center justify-center mt-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-petrol-500"></div>
                            <span className="text-xs text-gray-500 ml-2">Atualizando...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })
            )}
          </div>

          {filteredProducts?.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? `Nenhum produto corresponde à busca "${searchTerm}".`
                  : 'Comece adicionando seu primeiro produto.'
                }
              </p>
              {searchTerm && (
                <Button
                  variant="outline"
                  onClick={() => setSearchTerm('')}
                  className="mt-2"
                >
                  Limpar busca
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmation
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDelete}
        title={deleteProduct?.name || ""}
        description="Todas as imagens e dados relacionados também serão removidos permanentemente."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
