import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import HeroSection from "@/components/hero-section";
import ProductCard from "@/components/product-card";
import CollectionCard from "@/components/collection-card";
import FloatingWhatsApp from "@/components/floating-whatsapp";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product, Collection } from "@shared/schema";
import { Link } from "wouter";
import { BRAND_NAME } from "@/lib/constants";

export default function Home() {
  const { data: featuredProducts, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products/featured"],
  });

  const { data: collections, isLoading: collectionsLoading } = useQuery<Collection[]>({
    queryKey: ["/api/collections"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <HeroSection />

      {/* Featured Products Section */}
      <section className="py-20 bg-beige-50 dark:bg-petrol-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-3xl md:text-4xl font-bold text-petrol-500 dark:text-gold-500 mb-4">
              Produtos em Destaque
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Descubra nossa seleção especial de produtos com preços imperdíveis
            </p>
          </div>

          {/* Special Offer Banner */}
          <Card className="bg-gradient-to-r from-gold-500 to-gold-600 border-none rounded-2xl mb-12 animate-slide-up [animation-delay:0.1s]">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">🌟 Tudo por R$10 🌟</h3>
              <p className="text-gold-100 text-lg">Produtos selecionados com preço único especial</p>
            </CardContent>
          </Card>

          {/* Product Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
            {productsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
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
              ))
            ) : (
              featuredProducts?.map((product, index) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  className={`[animation-delay:${0.2 + index * 0.1}s]`}
                />
              ))
            )}
          </div>

          <div className="text-center">
            <Link href="/produtos">
              <Button size="lg" className="bg-petrol-500 hover:bg-petrol-600 text-white rounded-full font-semibold">
                Ver Todos os Produtos
                <i className="fas fa-arrow-right ml-2"></i>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Collections Section */}
      <section className="py-20 bg-white dark:bg-petrol-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-3xl md:text-4xl font-bold text-petrol-500 dark:text-gold-500 mb-4">
              Nossas Coleções
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Explore nossas coleções especiais criadas para diferentes momentos e estilos
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {collectionsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="rounded-3xl">
                  <Skeleton className="h-64 rounded-3xl" />
                </Card>
              ))
            ) : (
              collections?.slice(0, 3).map((collection, index) => (
                <CollectionCard 
                  key={collection.id} 
                  collection={collection}
                  className={`[animation-delay:${index * 0.1}s]`}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Brand Story Section */}
      <section className="py-20 bg-gradient-to-br from-petrol-500 via-petrol-600 to-petrol-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-40 h-40 bg-gold-500 rounded-full opacity-20 animate-float"></div>
          <div className="absolute bottom-10 left-10 w-32 h-32 bg-gold-400 rounded-full opacity-15 animate-float [animation-delay:3s]"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-up">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                {BRAND_NAME}
                <span className="text-gold-500 block">Nossa História</span>
              </h2>
              <p className="text-petrol-100 text-lg mb-6 leading-relaxed">
                Nascemos da paixão por realçar a beleza única de cada pessoa. Como um mar infinito de possibilidades, oferecemos uma paleta diversa de cores e texturas que celebram a individualidade.
              </p>
              <p className="text-petrol-100 text-lg mb-8 leading-relaxed">
                Cada produto é cuidadosamente selecionado para proporcionar qualidade premium e resultados excepcionais, porque acreditamos que toda pessoa merece se sentir radiante e confiante.
              </p>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gold-500 rounded-full flex items-center justify-center">
                  <i className="fas fa-award text-white"></i>
                </div>
                <div>
                  <h4 className="text-white font-semibold">Qualidade Premium</h4>
                  <p className="text-petrol-100 text-sm">Produtos testados e aprovados</p>
                </div>
              </div>
            </div>
            
            <div className="relative animate-slide-up [animation-delay:0.2s]">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 rounded-3xl p-8">
                <img 
                  src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=600&h=500" 
                  alt="Produtos de beleza organizados artisticamente" 
                  className="rounded-2xl shadow-2xl w-full h-auto" 
                />
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
