import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, User, Package, AlertCircle, Minus, Plus } from "lucide-react";
import type { Product } from "@shared/schema";

interface ReservationModalProps {
  isOpen: boolean;
  onReserve: (customerName: string, paymentDate: string, quantity: number) => void;
  onCancel: () => void;
  isLoading: boolean;
  product: Product | null;
  quantityReserved: number;
  newStock: number;
  maxQuantity?: number; // Quantidade máxima disponível para reserva
}

export function ReservationModal({
  isOpen,
  onReserve,
  onCancel,
  isLoading,
  product,
  quantityReserved,
  newStock,
  maxQuantity,
}: ReservationModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const previousStock = product.stock || 0;
  const availableQuantity = maxQuantity || quantityReserved;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customerName.trim() && paymentDate && quantity > 0) {
      onReserve(customerName.trim(), paymentDate, quantity);
      setCustomerName("");
      setPaymentDate("");
      setQuantity(1);
    }
  };

  const handleCancel = () => {
    setCustomerName("");
    setPaymentDate("");
    setQuantity(1);
    onCancel();
  };

  const increaseQuantity = () => {
    if (quantity < availableQuantity) {
      setQuantity(quantity + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md" aria-describedby="reservation-description">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">Nova Reserva</DialogTitle>
              <DialogDescription id="reservation-description" className="text-sm text-muted-foreground">
                Reserve produtos sem registrar venda ainda
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Informações do Produto */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 backdrop-blur-sm rounded-lg p-4 border border-gray-200/50">
            <div className="flex items-center space-x-3 mb-3">
              <Package className="h-5 w-5 text-petrol-600" />
              <span className="font-semibold text-petrol-800">{product.name}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Estoque Atual:</span>
                <span className="ml-2 font-semibold">{previousStock} unidades</span>
              </div>
              <div>
                <span className="text-gray-600">Disponível:</span>
                <span className="ml-2 font-semibold text-petrol-700">{availableQuantity} unidades</span>
              </div>
              <div>
                <span className="text-gray-600">Preço Unitário:</span>
                <span className="ml-2 font-semibold text-green-700">{new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(parseFloat(product.price))}</span>
              </div>
              <div>
                <span className="text-gray-600">Total:</span>
                <span className="ml-2 font-semibold text-blue-700">{new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(parseFloat(product.price) * quantity)}</span>
              </div>
            </div>
          </div>

          {/* Dados da Reserva */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity" className="flex items-center space-x-2">
                <Package className="h-4 w-4" />
                <span>Quantidade a Reservar</span>
              </Label>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={decreaseQuantity}
                  disabled={quantity <= 1}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    if (val >= 1 && val <= availableQuantity) {
                      setQuantity(val);
                    }
                  }}
                  min={1}
                  max={availableQuantity}
                  className="w-20 text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={increaseQuantity}
                  disabled={quantity >= availableQuantity}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  de {availableQuantity} disponíveis
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerName" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Nome do Cliente</span>
              </Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Digite o nome do cliente"
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDate" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Data Prevista de Pagamento</span>
              </Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-full"
              />
            </div>
          </div>

          {/* Aviso */}
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 backdrop-blur-sm border border-orange-200/50 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
              <div>
                <p className="text-sm text-orange-800 font-medium">
                  Esta reserva irá:
                </p>
                <ul className="mt-1 text-xs text-orange-700 space-y-1">
                  <li>• Reduzir o estoque disponível em {quantity} unidade{quantity > 1 ? 's' : ''}</li>
                  <li>• Não registrar transação financeira ainda</li>
                  <li>• Permitir confirmar venda ou devolver estoque depois</li>
                  <li>• Valor total da reserva: {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(parseFloat(product.price) * quantity)}</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter className="space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !customerName.trim() || !paymentDate || quantity < 1 || quantity > availableQuantity}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {isLoading ? "Processando..." : `Confirmar Reserva (${quantity}x)`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}