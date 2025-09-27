import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import ProductCard from "@/components/product-card";
import FloatingWhatsApp from "@/components/floating-whatsapp";
import ProductRequestBanner from "@/components/product-request-banner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";
import { Link } from "wouter";
 

export default function Home() {
  
  const { data: products, isLoading: productsLoading, error: productsError } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnMount: true,
  });

  // Coleções removidas da Home

  // Usar os mesmos produtos para ambas as seções
  const allProducts = products;

  // Debug log
  console.log('🏠 Home - Produtos carregados:', {
    products: products?.length || 0,
    loading: productsLoading,
    error: productsError?.message,
    data: products
  });

  return (
    <div className="min-h-screen bg-white text-petrol-700">
      <Header />
      
      {/* Hero removido: página foca em Tudo por R$ 10 e Produtos */}

      {/* Tudo por R$ 10 (primeiro) */}
      <section id="tudo-por-10" className="py-14 bg-white scroll-mt-24 border-b border-beige-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-slide-up">
            <h1 className="text-3xl md:text-4xl font-bold text-petrol-600 mb-2">
              Tudo por R$ 10
              <span className="ml-3 align-middle text-[11px] px-2 py-0.5 rounded-full bg-gold-500 text-white">Promo</span>
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">Itens selecionados com preço fixo para você economizar.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
            {allProducts
              ?.filter((p) => {
                const value = parseFloat(String(p.price));
                return !isNaN(value) && value === 10;
              })
              .map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
          </div>

          {(!allProducts || allProducts.filter((p) => parseFloat(String(p.price)) === 10).length === 0) && (
            <div className="text-center text-gray-600">
              Em breve adicionaremos itens nesta oferta. Fique de olho!
            </div>
          )}

          <p className="text-xs text-gray-400 text-center mt-6">Somente itens selecionados. Valor final confirmado no WhatsApp.</p>
        </div>
      </section>

      {/* Produtos (depois) */}
      <section className="py-14 bg-beige-50 border-b border-beige-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-3xl md:text-4xl font-bold text-petrol-600 mb-4">Produtos</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">Confira os itens disponíveis no catálogo.</p>
          </div>

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
            ) : products?.length ? (
              products.slice(0, 8).map((product, index) => (
                <ProductCard key={product.id} product={product} className={`[animation-delay:${0.2 + index * 0.1}s]`} />
              ))
            ) : productsError ? (
              <div className="col-span-full text-center text-red-600">
                Erro ao carregar produtos: {productsError.message}
              </div>
            ) : (
              <div className="col-span-full text-center text-gray-600">Nenhum produto no catálogo no momento.</div>
            )}
          </div>

          <div className="text-center">
            <Link href="/produtos">
              <Button size="lg" className="bg-gradient-to-r from-petrol-600 via-petrol-500 to-gold-500 text-white rounded-full font-semibold hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] transition-all">
                Ver mais produtos
                <i className="fas fa-arrow-right ml-2"></i>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Seção de Coleções removida */}

      {/* Seção Sobre/História removida */}

      {/* Newsletter removida */}

      {/* Solicitação de Produtos */}
      <ProductRequestBanner />

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
