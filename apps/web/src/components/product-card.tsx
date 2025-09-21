import { Star, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@shared/schema";
import { openWhatsApp } from "@/lib/whatsapp";
import { Link } from "wouter";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export default function ProductCard({ product, className = "" }: ProductCardProps) {
  const handleWhatsAppClick = () => {
    const isTenDeal = parseFloat(String(product.price)) === 10;
    const msg = isTenDeal
      ? `Olá! Quero o produto por R$ 10: ${product.name}`
      : undefined;
    openWhatsApp(product.name, msg);
  };

  const formatPrice = (price: string) => {
    return `R$ ${parseFloat(price).toFixed(2).replace('.', ',')}`;
  };

  return (
    <Card className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-slide-up group border ${className}`}>
      <div className="relative overflow-hidden rounded-t-2xl">
        <Link href={`/produto/${product.id}`}>
          <img 
            src={product.images?.[0] || "https://images.unsplash.com/photo-1586495777744-4413f21062fa"} 
            alt={product.name}
            className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300" 
          />
        </Link>
        {/* Background Overlay (Aceternity UI style) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex items-end justify-between p-3 backdrop-blur-sm">
          <div className="absolute top-3 left-3 text-white/80 flex items-center gap-1 text-xs">
            <Search className="h-3.5 w-3.5" />
            <span>Ver detalhes</span>
          </div>
          <div className="text-white/90 text-sm font-medium">
            <div className="text-xs uppercase tracking-wide">Preço</div>
            <div className="text-lg font-semibold">
              {`R$ ${parseFloat(String(product.price)).toFixed(2).replace('.', ',')}`}
            </div>
          </div>
          <Button
            onClick={handleWhatsAppClick}
            className="hidden md:inline-flex bg-green-500 hover:bg-green-600 text-white rounded-full z-20"
            size="sm"
          >
            <i className="fab fa-whatsapp mr-2"></i>
            {parseFloat(String(product.price)) === 10 ? "Quero por R$ 10" : "Falar agora"}
          </Button>
        </div>
        {product.featured && (
          <Badge className="absolute top-3 left-3 bg-gold-500 text-white hover:bg-gold-600">
            Destaque
          </Badge>
        )}
        {parseFloat(String(product.price)) === 10 && (
          <Badge className="absolute top-3 right-3 bg-gold-500 text-white hover:bg-gold-600 z-20">
            Promo R$ 10
          </Badge>
        )}
        {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
          <Badge variant="destructive" className="absolute top-3 right-3 z-20">
            Oferta
          </Badge>
        )}
      </div>
      
      <CardContent className="p-4">
        <Link href={`/produto/${product.id}`} className="block">
          <h4 className="font-semibold text-petrol-700 mb-2 hover:text-gold-500 transition-colors">
            {product.name}
          </h4>
        </Link>
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-gold-500">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
              <span className="text-sm text-gray-500 line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          {product.rating && parseFloat(product.rating) > 0 && (
            <div className="flex items-center">
              <Star className="h-4 w-4 text-gold-400 fill-current" />
              <span className="text-gray-600 text-sm ml-1">
                {product.rating}
              </span>
            </div>
          )}
        </div>

        <Button 
          onClick={handleWhatsAppClick}
          className="md:hidden w-full bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors duration-200 font-medium"
        >
          <i className="fab fa-whatsapp mr-2"></i>
          {parseFloat(String(product.price)) === 10 ? "Quero por R$ 10" : "Fale Conosco"}
        </Button>
      </CardContent>
    </Card>
  );
}
