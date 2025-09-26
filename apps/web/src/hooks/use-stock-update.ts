import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

interface StockUpdateData {
  productId: string;
  newStock: number;
  previousStock: number;
  reason?: string;
}

interface SaleTransactionData {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

interface SaleReversalData {
  transactionId: string;
  productId: string;
  quantity: number;
  reason: string;
}

export function useStockUpdate() {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isRevertDialogOpen, setIsRevertDialogOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{
    product: Product;
    newStock: number;
    quantitySold: number;
  } | null>(null);
  const [pendingRevert, setPendingRevert] = useState<{
    product: Product;
    transaction: any;
    quantity: number;
  } | null>(null);
  const { toast } = useToast();

  const createSaleTransactionMutation = useMutation({
    mutationFn: async (saleData: SaleTransactionData) => {
      const transactionData = {
        type: 'income' as const,
        amount: saleData.totalAmount.toString(),
        description: `Venda - ${saleData.productName} (${saleData.quantity}x)`,
        category: 'Vendas',
        status: 'completed',
        metadata: {
          productId: saleData.productId,
          productName: saleData.productName,
          quantity: saleData.quantity,
          unitPrice: saleData.unitPrice,
          type: 'product_sale',
          reversible: true
        }
      };
      
      const response = await apiRequest("POST", "/api/admin/transactions", transactionData);
      return response.json();
    },
    onSuccess: () => {
      // Invalidar caches relacionados a transações e relatórios
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/financial/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
    },
  });

  const revertSaleMutation = useMutation({
    mutationFn: async (revertData: SaleReversalData) => {
      // 1. Criar transação de estorno (negativa)
      const estornoData = {
        type: 'expense' as const,
        amount: Math.abs(parseFloat(revertData.reason)).toString(),
        description: `Estorno - ${pendingRevert?.product.name} (${revertData.quantity}x)`,
        category: 'Estornos',
        status: 'completed',
        metadata: {
          originalTransactionId: revertData.transactionId,
          productId: revertData.productId,
          quantity: revertData.quantity,
          type: 'sale_reversal'
        }
      };
      
      const response = await apiRequest("POST", "/api/admin/transactions", estornoData);
      return response.json();
    },
    onSuccess: () => {
      // Invalidar caches relacionados a transações e relatórios
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/financial/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: async (data: StockUpdateData) => {
      const response = await apiRequest("PUT", `/api/admin/products/${data.productId}`, {
        stock: data.newStock
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/financial/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
    },
  });

  const handleStockReduction = (product: Product, newStock: number) => {
    const previousStock = product.stock || 0;
    
    if (newStock >= previousStock) {
      // Se não é uma redução, atualiza diretamente
      updateStockMutation.mutate({
        productId: product.id,
        newStock,
        previousStock,
        reason: 'manual_adjustment'
      });
      return;
    }

    // Se é uma redução, mostra confirmação
    const quantitySold = previousStock - newStock;
    setPendingUpdate({
      product,
      newStock,
      quantitySold
    });
    setIsConfirmDialogOpen(true);
  };

  const confirmStockReduction = async () => {
    if (!pendingUpdate) return;

    const { product, newStock, quantitySold } = pendingUpdate;
    const unitPrice = parseFloat(product.price);
    const totalAmount = quantitySold * unitPrice;

    try {
      // 1. Atualizar estoque
      await updateStockMutation.mutateAsync({
        productId: product.id,
        newStock,
        previousStock: product.stock || 0,
        reason: 'sale'
      });

      // 2. Criar transação de venda
      const transaction = await createSaleTransactionMutation.mutateAsync({
        productId: product.id,
        productName: product.name,
        quantity: quantitySold,
        unitPrice,
        totalAmount
      });

      toast({
        title: "Venda registrada!",
        description: `${quantitySold}x ${product.name} por ${new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(totalAmount)}. Acesse 'Financeiro' para reverter se necessário.`,
        duration: 8000,
      });

      setIsConfirmDialogOpen(false);
      setPendingUpdate(null);
    } catch (error) {
      toast({
        title: "Erro ao registrar venda",
        description: "Ocorreu um erro ao registrar a venda. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const cancelStockReduction = () => {
    setIsConfirmDialogOpen(false);
    setPendingUpdate(null);
  };

  const handleRevertSale = (product: Product, transaction: any, quantity: number) => {
    setPendingRevert({
      product,
      transaction,
      quantity
    });
    setIsRevertDialogOpen(true);
  };

  const confirmSaleReversal = async () => {
    if (!pendingRevert) return;

    const { product, transaction, quantity } = pendingRevert;
    const totalAmount = parseFloat(transaction.amount);

    try {
      // 1. Reverter estoque (adicionar de volta)
      const currentStock = product.stock || 0;
      await updateStockMutation.mutateAsync({
        productId: product.id,
        newStock: currentStock + quantity,
        previousStock: currentStock,
        reason: 'sale_reversal'
      });

      // 2. Criar transação de estorno
      await revertSaleMutation.mutateAsync({
        transactionId: transaction.id,
        productId: product.id,
        quantity,
        reason: totalAmount.toString()
      });

      toast({
        title: "Venda revertida!",
        description: `Estoque de ${product.name} foi restaurado e valor de ${new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(totalAmount)} foi estornado.`,
      });

      setIsRevertDialogOpen(false);
      setPendingRevert(null);
    } catch (error) {
      toast({
        title: "Erro ao reverter venda",
        description: "Ocorreu um erro ao reverter a venda. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const cancelSaleReversal = () => {
    setIsRevertDialogOpen(false);
    setPendingRevert(null);
  };

  return {
    isConfirmDialogOpen,
    isRevertDialogOpen,
    pendingUpdate,
    pendingRevert,
    handleStockReduction,
    confirmStockReduction,
    cancelStockReduction,
    handleRevertSale,
    confirmSaleReversal,
    cancelSaleReversal,
    isLoading: updateStockMutation.isPending || createSaleTransactionMutation.isPending || revertSaleMutation.isPending,
  };
}