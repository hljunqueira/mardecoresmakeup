import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Package,
  Calculator
} from "lucide-react";
import type { Product } from "@shared/schema";

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderCartProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onAddProducts: () => void;
}

export function OrderCart({ 
  items, 
  onUpdateQuantity, 
  onRemoveItem, 
  onAddProducts 
}: OrderCartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Card className="border-petrol-200">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-petrol-700">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5" />
            <span>Carrinho de Compras</span>
          </div>
          <Badge variant="outline" className="text-petrol-600 border-petrol-300">
            {totalItems} {totalItems === 1 ? 'item' : 'itens'}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-4">Nenhum produto adicionado</p>
            <Button 
              onClick={onAddProducts}
              variant="outline"
              className="border-petrol-300 text-petrol-700 hover:bg-petrol-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Produtos
            </Button>
          </div>
        ) : (
          <>
            {/* Lista de Itens */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {items.map((item) => (
                <div 
                  key={item.product.id} 
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border"
                >
                  {/* Imagem do Produto */}
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    {item.product.images && item.product.images.length > 0 ? (
                      <img 
                        src={item.product.images[0]} 
                        alt={item.product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Package className="h-6 w-6 text-gray-400" />
                    )}
                  </div>

                  {/* Informações do Produto */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{item.product.name}</h4>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(item.unitPrice)} cada
                    </p>
                  </div>

                  {/* Controles de Quantidade */}
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => onUpdateQuantity(item.product.id, Math.max(0, item.quantity - 1))}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    
                    <span className="font-medium text-sm min-w-[2rem] text-center">
                      {item.quantity}
                    </span>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                      disabled={(item.product.stock || 0) <= item.quantity}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Preço Total */}
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCurrency(item.totalPrice)}</p>
                  </div>

                  {/* Botão Remover */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onRemoveItem(item.product.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Botão Adicionar Mais Produtos */}
            <div className="border-t pt-4">
              <Button 
                onClick={onAddProducts}
                variant="outline"
                className="w-full border-petrol-300 text-petrol-700 hover:bg-petrol-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Mais Produtos
              </Button>
            </div>

            {/* Resumo de Valores */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total de itens:</span>
                <span className="font-medium">{totalItems}</span>
              </div>
              
              <div className="flex justify-between items-center text-lg font-bold border-t pt-2 text-petrol-700">
                <span>Total:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}