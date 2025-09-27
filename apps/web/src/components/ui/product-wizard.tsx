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
import { CATEGORIES, BRAZILIAN_BRANDS, PRODUCT_TAGS } from "@/lib/constants";
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
    const currentImages = form.getValues("images") || [];
    
    if (!currentImages.includes(imageUrl)) {
      const newImages = [...currentImages, imageUrl];
      form.setValue("images", newImages, { shouldValidate: true });
      
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
  };

  const toggleTag = (tag: string) => {
    const currentTags = form.getValues("tags") || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    form.setValue("tags", newTags, { shouldValidate: true });
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
                            <SelectValue placeholder="Selecione uma marca brasileira" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BRAZILIAN_BRANDS.map((brand) => (
                            <SelectItem key={brand} value={brand}>
                              <div className="flex items-center space-x-2">
                                <span>{brand}</span>
                                {["Vivai", "Ruby Rose", "Natura", "Avon", "Océane"].includes(brand) && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700">Popular</Badge>
                                )}
                              </div>
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
                      <FormLabel>Nome da Marca</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Digite o nome da marca" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Seção 2: Preços e Estoque */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
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
                      <FormLabel>Preço Original</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="39.90" type="number" step="0.01" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Para produtos em promoção</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {calculateMargin() && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2">
                    <Calculator className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Desconto calculado: {calculateMargin()}%
                    </span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Economia de {formatCurrency((parseFloat(form.watch("originalPrice") || "0") - parseFloat(form.watch("price") || "0")).toString())}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estoque Atual *</FormLabel>
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
                  name="minStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estoque Mínimo</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          placeholder="5"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Alerta de estoque baixo</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Seção 3: Descrição e Imagens */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                <span>Descrição e Imagens</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição do Produto</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Descreva as características, benefícios e modo de uso do produto..."
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imagens do Produto</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <ImageUpload
                          value={field.value}
                          onChange={field.onChange}
                          maxImages={5}
                          productId={editingProduct?.id}
                        />
                        
                        <div className="flex justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsImageSearchOpen(true)}
                            className="w-full max-w-sm border-dashed border-2 border-blue-300 hover:border-blue-500 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Search className="h-4 w-4 mr-2" />
                            Buscar na Internet
                          </Button>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags/Palavras-chave</FormLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {PRODUCT_TAGS.map((tag) => {
                        const isSelected = field.value?.includes(tag);
                        return (
                          <Badge
                            key={tag}
                            variant={isSelected ? "default" : "outline"}
                            className={`cursor-pointer transition-colors ${
                              isSelected 
                                ? "bg-petrol-500 hover:bg-petrol-600" 
                                : "hover:bg-petrol-50 hover:border-petrol-300"
                            }`}
                            onClick={() => toggleTag(tag)}
                          >
                            {tag}
                          </Badge>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Clique nas tags para adicionar ou remover
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Seção 4: Configurações Finais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
                <span>Configurações Finais</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="featured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Produto em Destaque
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Aparecerá na página principal
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tenDeal"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 border-orange-200 bg-orange-50">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base text-orange-800">
                          🔥 Tudo por R$ 10
                        </FormLabel>
                        <p className="text-sm text-orange-600">
                          Produto fará parte da promoção "Tudo por 10"
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Visível na Loja
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Produto disponível para venda
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex items-center"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={isLoading}
              className="bg-petrol-500 hover:bg-petrol-600 flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingProduct ? "Atualizar Produto" : "Criar Produto"}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Modal de busca de imagens */}
      <ImageSearch
        isOpen={isImageSearchOpen}
        onClose={() => setIsImageSearchOpen(false)}
        onImageSelect={handleImageSelect}
      />
    </div>
  );
}
