import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, DollarSign, RotateCcw } from "lucide-react";
import type { Product } from "@shared/schema";

interface SaleReversalConfirmProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  product: Product | null;
  quantity: number;
  transaction: any;
}

export function SaleReversalConfirm({
  isOpen,
  onConfirm,
  onCancel,
  isLoading,
  product,
  quantity,
  transaction,
}: SaleReversalConfirmProps) {
  if (!product || !transaction) return null;

  const totalAmount = parseFloat(transaction.amount);
  const currentStock = product.stock || 0;
  const newStock = currentStock + quantity;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md" aria-describedby="sale-reversal-description">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <RotateCcw className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">Reverter Venda</DialogTitle>
              <DialogDescription id="sale-reversal-description" className="text-sm text-muted-foreground">
                Esta ação irá estornar a venda e restaurar o estoque
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
                <span className="ml-2 font-semibold">{currentStock} unidades</span>
              </div>
              <div>
                <span className="text-gray-600">Após Reversão:</span>
                <span className="ml-2 font-semibold text-green-700">{newStock} unidades</span>
              </div>
            </div>
          </div>

          {/* Detalhes da Venda Original */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 backdrop-blur-sm rounded-lg p-4 border border-blue-200/50">
            <div className="flex items-center space-x-3 mb-3">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-800">Venda Original</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Quantidade vendida:</span>
                <span className="font-semibold">{quantity} unidades</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valor da venda:</span>
                <span className="font-semibold">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Data:</span>
                <span className="font-semibold">
                  {new Date(transaction.date || transaction.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>

          {/* Ações que serão executadas */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="font-semibold text-red-800">Esta ação irá:</span>
            </div>
            <ul className="text-xs text-red-700 space-y-1 ml-6">
              <li>• Adicionar {quantity} unidades de volta ao estoque</li>
              <li>• Criar um estorno de {formatCurrency(totalAmount)}</li>
              <li>• Reduzir o saldo financeiro em {formatCurrency(totalAmount)}</li>
              <li>• Registrar o motivo como "Venda não concluída"</li>
            </ul>
          </div>

          {/* Aviso importante */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Atenção:</strong> Esta ação não pode ser desfeita. 
              Certifique-se de que a venda realmente não foi concluída.
            </p>
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
            className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {isLoading ? "Processando..." : "Confirmar Reversão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}