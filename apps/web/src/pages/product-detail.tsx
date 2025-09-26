import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import ProductCard from "@/components/product-card";
import FloatingWhatsApp from "@/components/floating-whatsapp";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, ArrowLeft, Share2 } from "lucide-react";
import type { Product } from "@shared/schema";
import { openWhatsApp } from "@/lib/whatsapp";
import { Link } from "wouter";
import { useState } from "react";

export default function ProductDetail() {
  const [match, params] = useRoute("/produto/:id");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: [`/api/products/${params?.id}`],
    enabled: !!params?.id,
  });

  const { data: relatedProducts, isLoading: relatedLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const filteredRelatedProducts = relatedProducts?.filter(
    (p) => p.id !== params?.id && p.category === product?.category
  ).slice(0, 4);

  const handleWhatsAppClick = () => {
    if (product) {
      openWhatsApp(product.name);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: product?.description || '',
          url: window.location.href,
        });
      } catch (error) {
        console.log("Error sharing:", error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const formatPrice = (price: string) => {
    return `R$ ${parseFloat(price).toFixed(2).replace('.', ',')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <Skeleton className="h-96 rounded-2xl mb-4" />
              <div className="flex space-x-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-20 rounded-lg" />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-12 w-full rounded-full" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="text-6xl mb-4">😞</div>
          <h1 className="text-3xl font-bold text-muted-foreground mb-2">
            Produto não encontrado
          </h1>
          <p className="text-muted-foreground mb-8">
            O produto que você está procurando não existe ou foi removido.
          </p>
          <Link href="/produtos">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar aos Produtos
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link href="/produtos">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar aos Produtos
          </Button>
        </Link>

        {/* Product Details */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Product Images */}
          <div>
            <div className="relative mb-4">
              <img 
                src={product.images?.[selectedImageIndex] || product.images?.[0] || "https://images.unsplash.com/photo-1586495777744-4413f21062fa"} 
                alt={product.name}
                className="w-full h-96 object-cover rounded-2xl shadow-lg" 
              />
              {product.featured && (
                <Badge className="absolute top-4 left-4 bg-gold-500 text-white">
                  Destaque
                </Badge>
              )}
              {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                <Badge variant="destructive" className="absolute top-4 right-4">
                  Oferta
                </Badge>
              )}
            </div>
            
            {/* Image Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="flex space-x-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`h-20 w-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImageIndex === index 
                        ? "border-gold-500" 
                        : "border-transparent hover:border-gray-300"
                    }`}
                  >
                    <img 
                      src={image} 
                      alt={`${product.name} - ${index + 1}`}
                      className="h-full w-full object-cover" 
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <div className="mb-4">
              {product.category && (
                <Badge variant="outline" className="mb-2">
                  {product.category}
                </Badge>
              )}
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {product.name}
              </h1>
            </div>

            <div className="flex items-center space-x-4 mb-6">
              <div className="flex items-center space-x-2">
                <span className="text-3xl font-bold text-gold-500">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                  <span className="text-xl text-muted-foreground line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>
              
              {product.rating && parseFloat(product.rating) > 0 && (
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-gold-400 fill-current" />
                  <span className="text-lg font-medium ml-1">
                    {product.rating}
                  </span>
                  {product.reviewCount && (
                    <span className="text-muted-foreground ml-1">
                      ({product.reviewCount} avaliações)
                    </span>
                  )}
                </div>
              )}
            </div>

            {product.description && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">Descrição</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {product.tags && product.tags.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={handleWhatsAppClick}
                size="lg"
                className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-full font-medium"
              >
                <i className="fab fa-whatsapp mr-2"></i>
                Fale Conosco
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={handleShare}
                className="rounded-full"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar
              </Button>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {filteredRelatedProducts && filteredRelatedProducts.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold text-foreground mb-8">
              Produtos Relacionados
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedLoading ? (
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
                filteredRelatedProducts.map((relatedProduct) => (
                  <ProductCard 
                    key={relatedProduct.id} 
                    product={relatedProduct} 
                  />
                ))
              )}
            </div>
          </section>
        )}
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
