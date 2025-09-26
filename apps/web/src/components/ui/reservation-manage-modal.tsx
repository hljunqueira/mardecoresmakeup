import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Package, CheckCircle, RotateCcw, DollarSign, Trash2 } from "lucide-react";
import type { Product, Reservation } from "@shared/schema";

interface ReservationManageModalProps {
  isOpen: boolean;
  onConfirmSale: () => void;
  onReturnToStock: () => void;
  onDeleteReservation: () => void;
  onCancel: () => void;
  isLoading: boolean;
  product: Product | null;
  reservation: Reservation | null;
}

export function ReservationManageModal({
  isOpen,
  onConfirmSale,
  onReturnToStock,
  onDeleteReservation,
  onCancel,
  isLoading,
  product,
  reservation,
}: ReservationManageModalProps) {
  if (!product || !reservation) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateValue: string | Date) => {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    return date.toLocaleDateString('pt-BR');
  };

  const totalAmount = reservation.quantity * parseFloat(reservation.unitPrice.toString());
  const isPaymentOverdue = new Date(reservation.paymentDate) < new Date();

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md bg-white" aria-describedby="reservation-manage-description">
        <div className="bg-white p-6 rounded-lg">
          <DialogHeader className="space-y-3 mb-6">
            <div className="flex items-center justify-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="text-center">
              <DialogTitle className="text-xl font-semibold text-gray-900">Gerenciar Reserva</DialogTitle>
              <DialogDescription id="reservation-manage-description" className="text-sm text-gray-500 mt-1">
                Confirme a venda ou devolva o produto ao estoque
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-4 mb-6">
            {/* Informações do Produto */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-gray-900">{product.name}</span>
                </div>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-3 py-1">
                  Reservado
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Quantidade:</span>
                  <span className="font-semibold text-gray-900">{reservation.quantity} unidades</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Preço Unit.:</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(parseFloat(reservation.unitPrice.toString()))}</span>
                </div>
              </div>
            </div>

            {/* Informações do Cliente */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center space-x-3 mb-3">
                <User className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-gray-900">Dados da Reserva</span>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Cliente:</span>
                  <span className="font-semibold text-gray-900">{reservation.customerName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Data da Reserva:</span>
                  <span className="font-semibold text-gray-900">{(reservation as any).createdAt ? formatDate((reservation as any).createdAt) : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Pagamento Previsto:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">{formatDate(reservation.paymentDate)}</span>
                    {isPaymentOverdue && (
                      <Badge variant="destructive" className="text-xs px-2 py-1">
                        Atrasado
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Detalhes Financeiros */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center space-x-3 mb-3">
                <DollarSign className="h-5 w-5 text-orange-600" />
                <span className="font-semibold text-gray-900">Valor da Reserva</span>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Subtotal:</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="font-bold text-gray-800 text-base">Total a Receber:</span>
                  <span className="font-bold text-green-600 text-xl">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onDeleteReservation}
                disabled={isLoading}
                className="flex-1 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 bg-white"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
              
              <Button
                variant="outline"
                onClick={onReturnToStock}
                disabled={isLoading}
                className="flex-1 border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300 bg-white"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Devolver
              </Button>
            </div>
            
            <Button
              onClick={onConfirmSale}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isLoading ? "Processando..." : "Confirmar Venda"}
            </Button>
            
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="w-full bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}