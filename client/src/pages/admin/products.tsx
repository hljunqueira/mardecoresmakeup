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
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Package, Star } from "lucide-react";
import type { Product, InsertProduct } from "@shared/schema";
import { CATEGORIES, PRODUCT_TAGS } from "@/lib/constants";

const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  price: z.string().min(1, "Preço é obrigatório"),
  originalPrice: z.string().optional(),
  stock: z.number().min(0, "Estoque deve ser positivo").default(0),
  images: z.array(z.string()).default([]),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
});

type ProductForm = z.infer<typeof productSchema>;

export default function AdminProducts() {
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { isAuthenticated } = useAdminAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, setLocation]);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
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
      images: [],
      category: "",
      tags: [],
      featured: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      const response = await apiRequest("POST", "/api/admin/products", data);
      return response.json();
    },
    onSuccess: () => {
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
      const response = await apiRequest("PUT", `/api/admin/products/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
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
      images: product.images || [],
      category: product.category || "",
      tags: product.tags || [],
      featured: product.featured || false,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      deleteMutation.mutate(id);
    }
  };

  const formatPrice = (price: string) => {
    return `R$ ${parseFloat(price).toFixed(2).replace('.', ',')}`;
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-64 overflow-auto">
        <div className="p-6 lg:p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-petrol-500 dark:text-gold-500 mb-2">
                Produtos
              </h1>
              <p className="text-muted-foreground">
                Gerencie seu catálogo de produtos
              </p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-petrol-500 hover:bg-petrol-600 text-white"
                  onClick={() => {
                    setEditingProduct(null);
                    form.reset();
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Produto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? "Editar Produto" : "Novo Produto"}
                  </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Nome do Produto</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Nome do produto" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preço</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="29.90" type="number" step="0.01" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="originalPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preço Original (opcional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="39.90" type="number" step="0.01" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="stock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estoque</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                placeholder="0"
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoria</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {CATEGORIES.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Descrição do produto" rows={3} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="featured"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange} 
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-medium">
                            Produto em destaque
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsDialogOpen(false);
                          setEditingProduct(null);
                          form.reset();
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createMutation.isPending || updateMutation.isPending}
                        className="bg-petrol-500 hover:bg-petrol-600"
                      >
                        {(createMutation.isPending || updateMutation.isPending) ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Salvando...
                          </div>
                        ) : (
                          editingProduct ? "Atualizar" : "Criar"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
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
              products?.map((product) => (
                <Card key={product.id} className="group hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="relative">
                      <img 
                        src={product.images?.[0] || "https://images.unsplash.com/photo-1586495777744-4413f21062fa"} 
                        alt={product.name}
                        className="w-full h-48 object-cover rounded-t-lg" 
                      />
                      {product.featured && (
                        <Badge className="absolute top-2 left-2 bg-gold-500 text-white">
                          <Star className="h-3 w-3 mr-1" />
                          Destaque
                        </Badge>
                      )}
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
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <h3 className="font-semibold text-foreground mb-2 truncate">
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
                        
                        {product.rating && (
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-gold-400 fill-current" />
                            <span className="text-sm text-muted-foreground ml-1">
                              {product.rating}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{product.category}</span>
                        <span>{product.stock} em estoque</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {products?.length === 0 && !isLoading && (
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
    </div>
  );
}
