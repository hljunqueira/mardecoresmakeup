import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, DollarSign } from "lucide-react";
import type { Product } from "@shared/schema";

interface StockReductionConfirmProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  product: Product | null;
  quantitySold: number;
  newStock: number;
}

export function StockReductionConfirm({
  isOpen,
  onConfirm,
  onCancel,
  isLoading,
  product,
  quantitySold,
  newStock,
}: StockReductionConfirmProps) {
  if (!product) return null;

  const unitPrice = parseFloat(product.price);
  const totalAmount = quantitySold * unitPrice;
  const previousStock = product.stock || 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md" aria-describedby="stock-reduction-description">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">Confirmar Redução de Estoque</DialogTitle>
              <DialogDescription id="stock-reduction-description" className="text-sm text-muted-foreground">
                Esta ação registrará automaticamente uma venda
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
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
                <span className="text-gray-600">Novo Estoque:</span>
                <span className="ml-2 font-semibold text-petrol-700">{newStock} unidades</span>
              </div>
            </div>
          </div>

          {/* Detalhes da Venda */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 backdrop-blur-sm rounded-lg p-4 border border-green-200/50">
            <div className="flex items-center space-x-3 mb-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-800">Venda a ser Registrada</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Quantidade vendida:</span>
                <span className="font-semibold">{quantitySold} unidades</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Preço unitário:</span>
                <span className="font-semibold">{formatCurrency(unitPrice)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-green-200">
                <span className="font-semibold text-green-700">Total da venda:</span>
                <span className="font-bold text-green-700 text-lg">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Aviso */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 backdrop-blur-sm border border-blue-200/50 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              💡 <strong>Esta ação irá:</strong>
            </p>
            <ul className="mt-2 text-xs text-blue-700 space-y-1 ml-4">
              <li>• Reduzir o estoque de {previousStock} para {newStock} unidades</li>
              <li>• Registrar uma transação de receita de {formatCurrency(totalAmount)}</li>
              <li>• Atualizar automaticamente seu saldo financeiro</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="space-x-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {isLoading ? "Processando..." : "Confirmar Venda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}