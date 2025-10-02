import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";
import { ImageSearch } from "@/components/ui/image-search-simple";
import { Calculator, Search, Save, X } from "lucide-react";
import { CATEGORIES, BRAZILIAN_BRANDS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

// Schema de validação
const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  brand: z.string().min(1, "Marca é obrigatória"),
  customBrand: z.string().optional(),
  price: z.string().min(1, "Preço é obrigatório"),
  originalPrice: z.string().optional(),
  stock: z.number().min(0, "Estoque deve ser positivo").default(0),
  minStock: z.number().min(0, "Estoque mínimo deve ser positivo").default(5),
  description: z.string().optional(),
  images: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
  tenDeal: z.boolean().default(false),
});

type ProductForm = z.infer<typeof productSchema>;

interface ProductFormProps {
  onSubmit: (data: ProductForm) => void;
  onCancel: () => void;
  isLoading?: boolean;
  editingProduct?: any;
}

export function ProductWizard({ onSubmit, onCancel, isLoading = false, editingProduct }: ProductFormProps) {
  const [isImageSearchOpen, setIsImageSearchOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: editingProduct?.name || "",
      category: editingProduct?.category || "",
      brand: editingProduct?.brand || "",
      customBrand: "",
      price: editingProduct?.price || "",
      originalPrice: editingProduct?.originalPrice || "",
      stock: editingProduct?.stock || 0,
      minStock: editingProduct?.minStock || 5,
      description: editingProduct?.description || "",
      images: editingProduct?.images || [],
      tags: editingProduct?.tags || [],
      featured: editingProduct?.featured || false,
      active: editingProduct?.active ?? true,
      tenDeal: editingProduct?.tenDeal || false,
    },
  });

  const handleFormSubmit = (data: ProductForm) => {
    console.log('📝 SUBMIT do formulário acionado:', {
      productName: data.name,
      imagesCount: data.images?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    // Se a marca for "Outra", usar a marca customizada
    if (data.brand === "Outra" && data.customBrand) {
      data.brand = data.customBrand;
    }
    
    onSubmit(data);
  };

  const formatCurrency = (value: string) => {
    if (!value) return "";
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  const calculateMargin = () => {
    const price = parseFloat(form.watch("price") || "0");
    const originalPrice = parseFloat(form.watch("originalPrice") || "0");
    
    if (price && originalPrice && originalPrice > price) {
      const margin = ((originalPrice - price) / originalPrice) * 100;
      return margin.toFixed(1);
    }
    return null;
  };

  const handleImageSelect = (imageUrl: string) => {
    console.log('🖼️ Imagem selecionada:', imageUrl);
    const currentImages = form.getValues("images") || [];
    
    if (!currentImages.includes(imageUrl)) {
      const newImages = [...currentImages, imageUrl];
      form.setValue("images", newImages, { 
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });
      
      console.log('✅ Imagens atualizadas:', newImages);
      
      toast({
        title: "Imagem adicionada!",
        description: "A imagem foi adicionada ao produto.",
      });
    } else {
      toast({
        title: "Imagem já existe",
        description: "Esta imagem já foi adicionada ao produto.",
      });
    }
    
    setIsImageSearchOpen(false);
    console.log('🔒 Modal de busca fechado');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-petrol-500 dark:text-gold-500">
          {editingProduct ? "Editar Produto" : "Novo Produto"}
        </h2>
        <p className="text-muted-foreground">
          Preencha todas as informações do produto
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          
          {/* Seção 1: Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="bg-petrol-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                <span>Informações Básicas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Produto *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Batom Matte Ruby Rose" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              <div className="flex items-center space-x-2">
                                <span>{category}</span>
                                {category === "Cabelo" && <Badge variant="secondary" className="text-xs">Novo</Badge>}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma marca" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BRAZILIAN_BRANDS.map((brand) => (
                            <SelectItem key={brand} value={brand}>
                              {brand}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("brand") === "Outra" && (
                <FormField
                  control={form.control}
                  name="customBrand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Marca Personalizada *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Digite o nome da marca" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Descreva as características e benefícios do produto..." 
                        className="min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Seção 2: Preços e Estoque */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="bg-petrol-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                <span>Preços e Estoque</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço de Venda *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                          <Input 
                            {...field} 
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            className="pl-8"
                          />
                        </div>
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
                      <FormLabel>Preço Original</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                          <Input 
                            {...field} 
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            className="pl-8"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {calculateMargin() && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Calculator className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Margem de desconto: {calculateMargin()}%
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estoque Atual</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          min="0"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estoque Mínimo</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          min="0"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          placeholder="5"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Seção 3: Imagens */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="bg-petrol-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                <span>Imagens do Produto</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload de Imagens</FormLabel>
                    <FormControl>
                      <ImageUpload
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">ou</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsImageSearchOpen(true);
                  }}
                  className="flex items-center space-x-2"
                >
                  <Search className="h-4 w-4" />
                  <span>Buscar Imagens Online</span>
                </Button>
              </div>

              {/* Busca de Imagens Online */}
              <ImageSearch
                isOpen={isImageSearchOpen}
                onImageSelect={handleImageSelect}
                onClose={() => setIsImageSearchOpen(false)}
                searchQuery={form.watch("name")}
              />
            </CardContent>
          </Card>

          {/* Seção 4: Configurações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="bg-petrol-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
                <span>Configurações</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
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
                      <FormLabel className="text-sm">Produto em Destaque</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm">Produto Ativo</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tenDeal"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm">Tudo por R$ 10</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-petrol-500 hover:bg-petrol-600"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Salvando..." : editingProduct ? "Atualizar Produto" : "Criar Produto"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}