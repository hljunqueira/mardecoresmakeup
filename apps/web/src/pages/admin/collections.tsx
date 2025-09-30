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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, BadgePercent, Star } from "lucide-react";
import type { Collection, Product } from "@shared/schema";

const collectionSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  image: z.string().optional(),
  products: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
});

type CollectionForm = z.infer<typeof collectionSchema>;

export default function AdminCollections() {
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const { isAuthenticated } = useAdminAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, setLocation]);

  const { data: collections, isLoading } = useQuery<Collection[]>({
    queryKey: ["/api/collections"],
    enabled: isAuthenticated,
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: isAuthenticated,
  });

  const form = useForm<CollectionForm>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: "",
      description: "",
      image: "",
      products: [],
      featured: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CollectionForm) => {
      const response = await apiRequest("POST", "/api/admin/collections", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      toast({
        title: "Coleção criada!",
        description: "A coleção foi adicionada com sucesso.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar coleção",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CollectionForm }) => {
      const response = await apiRequest("PUT", `/api/admin/collections/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      toast({
        title: "Coleção atualizada!",
        description: "As alterações foram salvas com sucesso.",
      });
      setIsDialogOpen(false);
      setEditingCollection(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar coleção",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/collections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      toast({
        title: "Coleção excluída!",
        description: "A coleção foi removida com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir coleção",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CollectionForm) => {
    if (editingCollection) {
      updateMutation.mutate({ id: editingCollection.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (collection: Collection) => {
    setEditingCollection(collection);
    form.reset({
      name: collection.name,
      description: collection.description || "",
      image: collection.image || "",
      products: collection.products || [],
      featured: collection.featured || false,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta coleção?")) {
      deleteMutation.mutate(id);
    }
  };

  const getProductsInCollection = (productIds: string[]) => {
    if (!products) return [];
    return products.filter(product => productIds.includes(product.id));
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
                Tudo por R$ 10
              </h1>
              <p className="text-muted-foreground">
                Marque produtos que entram na promoção de R$ 10
              </p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-petrol-500 hover:bg-petrol-600 text-white"
                  onClick={() => {
                    setEditingCollection(null);
                    form.reset();
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Lista
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="collection-form-description">
                <DialogHeader>
                  <DialogTitle>
                    {editingCollection ? "Editar Lista" : "Nova Lista"}
                  </DialogTitle>
                  <DialogDescription id="collection-form-description">
                    {editingCollection ? "Modifique os produtos da lista" : "Crie uma nova lista de produtos para promoção"}
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Lista</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Nome da coleção" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Descrição da coleção" rows={3} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="image"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL da Imagem (opcional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://exemplo.com/imagem.jpg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="products"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Produtos na Lista</FormLabel>
                          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-4">
                            {products?.map((product) => (
                              <div key={product.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={product.id}
                                  checked={field.value.includes(product.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([...field.value, product.id]);
                                    } else {
                                      field.onChange(field.value.filter(id => id !== product.id));
                                    }
                                  }}
                                />
                                <label 
                                  htmlFor={product.id} 
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {product.name}
                                </label>
                              </div>
                            ))}
                          </div>
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
                            Coleção em destaque
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
                          setEditingCollection(null);
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
                          editingCollection ? "Atualizar" : "Criar"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Lists Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-0">
                    <Skeleton className="h-48 rounded-t-lg" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-full" />
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
              collections?.map((collection) => (
                <Card key={collection.id} className="group hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="relative">
                      <img 
                        src={collection.image || "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2"} 
                        alt={collection.name}
                        className="w-full h-48 object-cover rounded-t-lg" 
                      />
                      {collection.featured && (
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
                          onClick={() => handleEdit(collection)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8"
                          onClick={() => handleDelete(collection.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <h3 className="font-semibold text-foreground mb-2">
                        {collection.name}
                      </h3>
                      
                      {collection.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {collection.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                          {getProductsInCollection(collection.products || []).length} produtos a R$ 10
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {getProductsInCollection(collection.products || []).slice(0, 3).map((product) => (
                            <Badge key={product.id} variant="outline" className="text-xs">
                              {product.name.split(' ')[0]}
                            </Badge>
                          ))}
                          {getProductsInCollection(collection.products || []).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{getProductsInCollection(collection.products || []).length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {collections?.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <BadgePercent className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                Nenhuma lista encontrada
              </h3>
              <p className="text-muted-foreground mb-4">
                Comece criando sua primeira lista da promoção de R$ 10.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
