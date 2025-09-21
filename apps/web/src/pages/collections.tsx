import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import CollectionCard from "@/components/collection-card";
import FloatingWhatsApp from "@/components/floating-whatsapp";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Collection } from "@shared/schema";

export default function Collections() {
  const { data: collections, isLoading } = useQuery<Collection[]>({
    queryKey: ["/api/collections"],
  });

  return (
    <div className="min-h-screen bg-white text-petrol-700">
      <Header />
      
      {/* Page Header */}
      <section className="bg-beige-50 py-16 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-petrol-700 mb-4">
            Nossas Coleções
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Explore nossas coleções especiais criadas para diferentes momentos e estilos
          </p>
        </div>
      </section>

      {/* Collections Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="rounded-3xl">
                  <Skeleton className="h-64 rounded-3xl" />
                </Card>
              ))}
            </div>
          ) : collections?.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-2xl font-bold text-muted-foreground mb-2">
                  Nenhuma coleção encontrada
                </h3>
                <p className="text-muted-foreground">
                  Estamos trabalhando em novas coleções incríveis. Volte em breve!
                </p>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {collections?.map((collection, index) => (
                <CollectionCard 
                  key={collection.id} 
                  collection={collection}
                  className={`animate-slide-up [animation-delay:${index * 0.1}s]`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
