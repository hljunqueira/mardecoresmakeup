import { useEffect, useState } from "react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import AdminSidebar from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmation } from "@/components/ui/delete-confirmation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Package, Star, AlertTriangle, Eye, EyeOff, Search, Minus } from "lucide-react";
import type { Product, InsertProduct } from "@shared/schema";
import { CATEGORIES, BRAZILIAN_BRANDS, PRODUCT_TAGS } from "@/lib/constants";
import { ProductWizard } from "@/components/ui/product-wizard";

type ProductForm = z.infer<typeof productSchema>;

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

export default function AdminProductsSimplified() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showInactive, setShowInactive] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const { isAuthenticated } = useAdminAuth();
  const { toast } = useToast();

  // Mutation para atualizar estoque diretamente (apenas controle físico)
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
      const cleanedData = {
        ...data,
        originalPrice: data.originalPrice && data.originalPrice.trim() !== '' ? data.originalPrice : undefined,
        price: data.price && data.price.trim() !== '' ? data.price : '0',
      };
      
      const response = await apiRequest("POST", "/api/admin/products", cleanedData);
      const product = await response.json();
      
      // Salvar metadados das imagens se existirem
      if (data.images && data.images.length > 0 && product.id) {
        for (let i = 0; i < data.images.length; i++) {
          try {
            await fetch(`/api/admin/products/${product.id}/images`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
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
      const cleanedData = {
        ...data,
        originalPrice: data.originalPrice && data.originalPrice.trim() !== '' ? data.originalPrice : undefined,
        price: data.price && data.price.trim() !== '' ? data.price : '0',
      };
      
      const response = await apiRequest("PUT", `/api/admin/products/${id}`, cleanedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Produto atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
      setIsDialogOpen(false);
      setEditingProduct(null);
      form.reset();
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
      await apiRequest("DELETE", `/api/admin/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
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

  // Funções de controle de estoque físico (sem modal de venda)
  const handleStockDecrease = (product: Product) => {
    const currentStock = product.stock || 0;
    if (currentStock > 0) {
      updateStockMutation.mutate({ 
        productId: product.id, 
        newStock: currentStock - 1 
      });
    }
  };

  const handleStockIncrease = (product: Product) => {
    const currentStock = product.stock || 0;
    updateStockMutation.mutate({ 
      productId: product.id, 
      newStock: currentStock + 1 
    });
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      originalPrice: product.originalPrice?.toString() || "",
      stock: product.stock || 0,
      minStock: product.minStock || 5,
      images: product.images || [],
      category: product.category || "",
      brand: product.brand || "",
      customBrand: "",
      tags: product.tags || [],
      featured: product.featured || false,
      active: product.active !== false,
      tenDeal: product.tenDeal || false,
    });
    setIsDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteProduct) {
      deleteMutation.mutate(deleteProduct.id);
      setDeleteProduct(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  };

  const filteredProducts = products?.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    const matchesActive = showInactive || product.active !== false;
    
    return matchesSearch && matchesCategory && matchesActive;
  }) || [];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-64 overflow-auto">
        <div className="p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8 flex justify-between items-start">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-petrol-700 flex items-center">
                <Package className="h-10 w-10 mr-3 text-petrol-600" />
                Gestão de Produtos
              </h1>
              <p className="text-lg text-petrol-600">
                Controle de estoque e catálogo de produtos
              </p>
            </div>
            <Button 
              onClick={() => {
                setEditingProduct(null);
                form.reset();
                setIsDialogOpen(true);
              }}
              className="bg-petrol-600 hover:bg-petrol-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar produtos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="sm:w-48">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas</SelectItem>
                      {CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant={showInactive ? "default" : "outline"}
                  onClick={() => setShowInactive(!showInactive)}
                  className="sm:w-auto w-full"
                >
                  {showInactive ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                  {showInactive ? "Todos" : "Apenas Ativos"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Product Wizard Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Editar Produto" : "Novo Produto"}
                </DialogTitle>
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

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-0">
                    <Skeleton className="h-48 w-full rounded-t-lg" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              filteredProducts.map((product) => {
                const isLowStock = (product.stock || 0) <= (product.minStock || 5);
                const isOutOfStock = (product.stock || 0) === 0;
                
                return (
                  <Card key={product.id} className={`hover:shadow-lg transition-shadow ${!product.active ? 'opacity-60' : ''}`}>
                    <CardContent className="p-0">
                      {/* Product Image */}
                      <div className="relative">
                        {product.images && product.images.length > 0 ? (
                          <img 
                            src={product.images[0]} 
                            alt={product.name}
                            className="w-full h-48 object-cover rounded-t-lg"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                            <Package className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                        
                        {/* Status Badges */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          {product.featured && (
                            <Badge className="bg-yellow-500 text-white">
                              <Star className="h-3 w-3 mr-1" />
                              Destaque
                            </Badge>
                          )}
                          {product.tenDeal && (
                            <Badge className="bg-green-500 text-white">
                              10 Reais
                            </Badge>
                          )}
                          {!product.active && (
                            <Badge variant="secondary">
                              Inativo
                            </Badge>
                          )}
                        </div>
                        
                        {/* Stock Alert */}
                        {isOutOfStock && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-red-500 text-white">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Sem Estoque
                            </Badge>
                          </div>
                        )}
                        {isLowStock && !isOutOfStock && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-yellow-500 text-white">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Baixo
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="p-4 space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg line-clamp-2">{product.name}</h3>
                          {product.brand && (
                            <p className="text-sm text-gray-500">{product.brand}</p>
                          )}
                        </div>
                        
                        {/* Price */}
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-petrol-700">
                            {formatCurrency(product.price)}
                          </span>
                          {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price.toString()) && (
                            <span className="text-sm text-gray-500 line-through">
                              {formatCurrency(product.originalPrice)}
                            </span>
                          )}
                        </div>
                        
                        {/* Stock Control - SIMPLIFIED (only physical control) */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium">Estoque:</span>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() => handleStockDecrease(product)}
                              disabled={isOutOfStock || updateStockMutation.isPending}
                              title="Reduzir estoque físico"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            
                            <span className={`font-bold text-lg min-w-[3rem] text-center ${
                              isOutOfStock ? 'text-red-600' : 
                              isLowStock ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {product.stock || 0}
                            </span>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() => handleStockIncrease(product)}
                              disabled={updateStockMutation.isPending}
                              title="Aumentar estoque físico"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(product)}
                            className="flex-1"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setDeleteProduct(product);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {filteredProducts.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                Nenhum produto encontrado
              </h3>
              <p className="text-muted-foreground mb-4">
                Comece adicionando seu primeiro produto.
              </p>
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