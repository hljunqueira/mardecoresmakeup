import { Star } from "lucide-react";
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
    openWhatsApp(product.name);
  };

  const formatPrice = (price: string) => {
    return `R$ ${parseFloat(price).toFixed(2).replace('.', ',')}`;
  };

  return (
    <Card className={`bg-white dark:bg-petrol-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-slide-up group ${className}`}>
      <div className="relative overflow-hidden rounded-t-2xl">
        <Link href={`/produto/${product.id}`}>
          <a>
            <img 
              src={product.images?.[0] || "https://images.unsplash.com/photo-1586495777744-4413f21062fa"} 
              alt={product.name}
              className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300" 
            />
          </a>
        </Link>
        {product.featured && (
          <Badge className="absolute top-3 left-3 bg-gold-500 text-white hover:bg-gold-600">
            Destaque
          </Badge>
        )}
        {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
          <Badge variant="destructive" className="absolute top-3 right-3">
            Oferta
          </Badge>
        )}
      </div>
      
      <CardContent className="p-4">
        <Link href={`/produto/${product.id}`}>
          <a>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2 hover:text-gold-500 transition-colors">
              {product.name}
            </h4>
          </a>
        </Link>
        
        <div className="flex items-center justify-between mb-3">
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
          {product.rating && parseFloat(product.rating) > 0 && (
            <div className="flex items-center">
              <Star className="h-4 w-4 text-gold-400 fill-current" />
              <span className="text-gray-600 dark:text-gray-300 text-sm ml-1">
                {product.rating}
              </span>
            </div>
          )}
        </div>

        <Button 
          onClick={handleWhatsAppClick}
          className="w-full bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors duration-200 font-medium"
        >
          <i className="fab fa-whatsapp mr-2"></i>
          Fale Conosco
        </Button>
      </CardContent>
    </Card>
  );
}
