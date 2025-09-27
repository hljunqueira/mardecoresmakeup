import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import ProductCard from "@/components/product-card";
import FloatingWhatsApp from "@/components/floating-whatsapp";
import ProductRequestBanner from "@/components/product-request-banner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import type { Product } from "@shared/schema";
import { CATEGORIES } from "@/lib/constants";

export default function Products() {
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("default");

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Filter and sort products
  const filteredProducts = products?.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory && product.active;
  });

  const sortedProducts = filteredProducts?.sort((a, b) => {
    // Primeiro ordenar por tipo: produtos normais primeiro, depois "Tudo por 10"
    const aTenDeal = (a as any).tenDeal || false;
    const bTenDeal = (b as any).tenDeal || false;
    
    if (aTenDeal !== bTenDeal) {
      return aTenDeal ? 1 : -1; // Produtos normais primeiro (tenDeal=false vem antes)
    }
    
    // Dentro do mesmo tipo, aplicar ordenação secundária
    switch (sortBy) {
      case "price-low":
        return parseFloat(a.price) - parseFloat(b.price);
      case "price-high":
        return parseFloat(b.price) - parseFloat(a.price);
      case "rating":
        return parseFloat(b.rating || "0") - parseFloat(a.rating || "0");
      case "featured":
        const aFeatured = a.featured || false;
        const bFeatured = b.featured || false;
        if (aFeatured !== bFeatured) {
          return bFeatured ? 1 : -1; // Produtos em destaque primeiro
        }
        return parseFloat(b.price) - parseFloat(a.price); // Por preço decrescente
      default:
        // Para ordenação padrão, dentro dos produtos normais ordenar por preço decrescente
        if (!aTenDeal && !bTenDeal) {
          return parseFloat(b.price) - parseFloat(a.price);
        }
        return a.name.localeCompare(b.name);
    }
  });

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSortBy("default");
  };

  return (
    <div className="min-h-screen bg-white text-petrol-700">
      <Header />
      
      {/* Page Header */}
      <section className="bg-beige-50 py-16 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-petrol-700 mb-4">
            Nossos Produtos
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Descubra nossa coleção completa de maquiagens e cosméticos premium
          </p>
        </div>
      </section>

      {/* Filters Section */}
      <section className="bg-white py-8 sticky top-16 z-40 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full lg:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Recomendados</SelectItem>
                <SelectItem value="featured">Destaques Primeiro</SelectItem>
                <SelectItem value="name">Nome A-Z</SelectItem>
                <SelectItem value="price-low">Menor Preço</SelectItem>
                <SelectItem value="price-high">Maior Preço</SelectItem>
                <SelectItem value="rating">Melhor Avaliação</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>

          {/* Active Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            {searchQuery && (
              <Badge variant="secondary" className="px-3 py-1">
                Busca: "{searchQuery}"
                <button
                  onClick={() => setSearchQuery("")}
                  className="ml-2 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            {selectedCategory !== "all" && (
              <Badge variant="secondary" className="px-3 py-1">
                Categoria: {selectedCategory}
                <button
                  onClick={() => setSelectedCategory("all")}
                  className="ml-2 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 10 }).map((_, i) => (
                <Card key={i} className="rounded-2xl">
                  <CardContent className="p-0">
                    <Skeleton className="h-48 rounded-t-2xl" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-8 w-full rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sortedProducts?.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-bold text-muted-foreground mb-2">
                  Nenhum produto encontrado
                </h3>
                <p className="text-muted-foreground mb-4">
                  Tente ajustar os filtros ou buscar por outros termos.
                </p>
                <Button onClick={clearFilters}>Limpar Filtros</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <p className="text-muted-foreground">
                  {sortedProducts?.length} produto(s) encontrado(s)
                </p>
              </div>
              
              {(() => {
                // Separar produtos normais dos "Tudo por 10"
                const normalProducts = sortedProducts?.filter(p => !(p as any).tenDeal) || [];
                const tenDealProducts = sortedProducts?.filter(p => (p as any).tenDeal) || [];
                
                return (
                  <>
                    {/* Produtos Normais */}
                    {normalProducts.length > 0 && (
                      <>
                        <div className="mb-8">
                          <h2 className="text-2xl font-bold text-petrol-700 mb-6 flex items-center">
                            ✨ Produtos Premium
                            <Badge variant="outline" className="ml-3 text-xs">
                              {normalProducts.length} itens
                            </Badge>
                          </h2>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {normalProducts.map((product) => (
                              <ProductCard key={product.id} product={product} />
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Produtos Tudo por 10 */}
                    {tenDealProducts.length > 0 && (
                      <>
                        {normalProducts.length > 0 && (
                          <div className="my-12 border-t border-orange-200">
                            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-6 -mt-3">
                              <div className="text-center">
                                <h2 className="text-3xl font-bold text-orange-800 mb-2">
                                  🔥 Tudo por R$ 10
                                </h2>
                                <p className="text-orange-600">
                                  Aproveite nossa promoção especial com preços fixos!
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="mb-8">
                          {normalProducts.length === 0 && (
                            <h2 className="text-2xl font-bold text-orange-800 mb-6 flex items-center">
                              🔥 Tudo por R$ 10
                              <Badge variant="outline" className="ml-3 text-xs bg-orange-100 text-orange-700">
                                {tenDealProducts.length} itens
                              </Badge>
                            </h2>
                          )}
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {tenDealProducts.map((product) => (
                              <ProductCard key={product.id} product={product} />
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>
      </section>

      {/* Solicitação de Produtos */}
      <ProductRequestBanner />

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
