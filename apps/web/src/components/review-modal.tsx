import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, X } from "lucide-react";
import { ReviewForm, ReviewList } from "@/components/review-system";
import type { Product } from "@shared/schema";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

export default function ReviewModal({ isOpen, onClose, product }: ReviewModalProps) {
  const [activeTab, setActiveTab] = useState<'read' | 'write'>('read');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden" aria-describedby="review-modal-description">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-gold-500" />
              Avaliações - {product.name}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <Button
              variant={activeTab === 'read' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('read')}
              className="rounded-full"
            >
              Ver Avaliações
            </Button>
            <Button
              variant={activeTab === 'write' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('write')}
              className="rounded-full"
            >
              Deixar Avaliação
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden" id="review-modal-description">
          {/* Product Info */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg mb-6">
            <img
              src={product.images?.[0] || "https://images.unsplash.com/photo-1586495777744-4413f21062fa"}
              alt={product.name}
              className="w-16 h-16 object-cover rounded-lg"
            />
            <div>
              <h3 className="font-semibold text-gray-900">{product.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-bold text-gold-500">
                  R$ {parseFloat(product.price).toFixed(2).replace('.', ',')}
                </span>
                {product.rating && parseFloat(product.rating) > 0 && (
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-gold-400 fill-current" />
                    <span className="text-sm text-gray-600 ml-1">
                      {parseFloat(product.rating).toFixed(1)}
                    </span>
                    {product.reviewCount && product.reviewCount > 0 && (
                      <span className="text-sm text-gray-500 ml-1">
                        ({product.reviewCount} avaliações)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[60vh]">
            {activeTab === 'read' ? (
              <div className="space-y-6">
                <ReviewList productId={product.id} />
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Deixe sua avaliação</h3>
                <ReviewForm 
                  productId={product.id} 
                  productName={product.name}
                  onReviewSubmitted={() => {
                    setActiveTab('read'); // Muda para aba de leitura após enviar
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}