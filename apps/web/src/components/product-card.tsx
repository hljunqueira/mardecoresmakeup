import { Star, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Product } from "@shared/schema";
import { openWhatsApp } from "@/lib/whatsapp";
import { Link } from "wouter";
import { useState } from "react";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export default function ProductCard({ product, className = "" }: ProductCardProps) {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  
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

  const handleImageClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsImageModalOpen(true);
  };

  return (
    <>
      <Card className={`product-card bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-slide-up group border ${className}`}>
        <div className="relative overflow-hidden rounded-t-2xl">
          <div className="relative cursor-pointer" onClick={handleImageClick}>
            <img 
              src={product.images?.[0] || "https://images.unsplash.com/photo-1586495777744-4413f21062fa"} 
              alt={product.name}
              className="w-full h-48 sm:h-52 md:h-48 object-cover group-hover:scale-110 transition-transform duration-300" 
            />
            {/* Click overlay */}
            <div 
              className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 hover:opacity-100"
              onClick={handleImageClick}
            >
              <div className="bg-white/90 rounded-full p-2 sm:p-3">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
              </div>
            </div>
          </div>
          
          {/* Background Overlay (Aceternity UI style) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-5 flex items-end justify-between p-3 backdrop-blur-sm pointer-events-none">
            <div className="absolute top-3 left-3 text-white/80 flex items-center gap-1 text-xs">
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clique para ampliar</span>
            </div>
            <div className="text-white/90 text-sm font-medium">
              <div className="text-xs uppercase tracking-wide">Preço</div>
              <div className="text-base sm:text-lg font-semibold">
                {`R$ ${parseFloat(String(product.price)).toFixed(2).replace('.', ',')}`}
              </div>
            </div>
            <Button
              onClick={handleWhatsAppClick}
              className="hidden lg:inline-flex bg-green-500 hover:bg-green-600 text-white rounded-full z-20 pointer-events-auto"
              size="sm"
            >
              <i className="fab fa-whatsapp mr-2"></i>
              <span className="hidden xl:inline">{parseFloat(String(product.price)) === 10 ? "Quero por R$ 10" : "Falar agora"}</span>
              <span className="xl:hidden">WhatsApp</span>
            </Button>
          </div>
          {product.featured && (
            <Badge className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-gold-500 text-white hover:bg-gold-600 text-xs">
              Destaque
            </Badge>
          )}
          {parseFloat(String(product.price)) === 10 && (
            <Badge className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-gold-500 text-white hover:bg-gold-600 z-20 text-xs">
              Promo R$ 10
            </Badge>
          )}
          {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
            <Badge variant="destructive" className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 text-xs">
              Oferta
            </Badge>
          )}
        </div>
        
        <CardContent className="product-card-content p-3 sm:p-4 space-y-2 sm:space-y-3">
          <Link href={`/produto/${product.id}`} className="block">
            <h4 className="product-card-title font-semibold text-petrol-700 mb-2 hover:text-gold-500 transition-colors line-clamp-2 text-sm sm:text-base">
              {product.name}
            </h4>
          </Link>
          
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <span className="product-card-price text-base sm:text-lg font-bold text-gold-500">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                <span className="text-xs sm:text-sm text-gray-500 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
            {product.rating && parseFloat(product.rating) > 0 && (
              <div className="flex items-center">
                <Star className="h-3 w-3 sm:h-4 sm:w-4 text-gold-400 fill-current" />
                <span className="text-gray-600 text-xs sm:text-sm ml-1">
                  {product.rating}
                </span>
              </div>
            )}
          </div>

          <Button 
            onClick={handleWhatsAppClick}
            className="product-card-button w-full bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all duration-200 font-medium py-2 sm:py-2.5 text-xs sm:text-sm touch-manipulation"
          >
            <i className="fab fa-whatsapp mr-1 sm:mr-2"></i>
            {parseFloat(String(product.price)) === 10 ? "Quero por R$ 10" : "Fale Conosco"}
          </Button>
        </CardContent>
      </Card>
      
      {/* Image Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[95vh] p-0 overflow-hidden bg-black border-0" aria-describedby="product-image-description">
          <DialogHeader className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsImageModalOpen(false)}
              className="rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm h-8 w-8 sm:h-10 sm:w-10"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="relative w-full h-full flex items-center justify-center bg-black min-h-[50vh] sm:min-h-[60vh]">
            <img
              src={product.images?.[0] || "https://images.unsplash.com/photo-1586495777744-4413f21062fa"}
              alt={product.name}
              className="max-w-full max-h-[95vh] object-contain"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 sm:p-6">
              <h3 className="text-white font-semibold text-base sm:text-lg mb-2 line-clamp-2">{product.name}</h3>
              <div className="flex items-center justify-between text-white/80 flex-wrap gap-2" id="product-image-description">
                <span className="text-lg sm:text-2xl font-bold text-gold-400">
                  {formatPrice(product.price)}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
