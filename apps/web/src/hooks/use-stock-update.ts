import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product, Reservation } from "@shared/schema";

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

interface ReservationData {
  productId: string;
  customerName: string;
  quantity: number;
  unitPrice: string; // Decimal fields use string in Drizzle
  paymentDate: Date; // Timestamp fields use Date
}

interface CreditAccountData {
  customerId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentDate: Date;
}

interface CreateCustomerAndCreditData {
  customerData: {
    name: string;
    phone: string;
  };
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentDate: Date;
}

interface SaleReversalData {
  transactionId: string;
  productId: string;
  quantity: number;
  reason: string;
}

export function useStockUpdate() {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isReservationDialogOpen, setIsReservationDialogOpen] = useState(false);
  const [isReservationManageDialogOpen, setIsReservationManageDialogOpen] = useState(false);
  const [isRevertDialogOpen, setIsRevertDialogOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{
    product: Product;
    newStock: number;
    quantitySold: number;
  } | null>(null);
  const [pendingReservation, setPendingReservation] = useState<{
    product: Product;
    newStock: number;
    quantity: number;
  } | null>(null);
  const [currentReservation, setCurrentReservation] = useState<{
    product: Product;
    reservation: Reservation;
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

  const createReservationMutation = useMutation({
    mutationFn: async (reservationData: ReservationData) => {
      const response = await apiRequest("POST", "/api/admin/reservations", reservationData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });

  const confirmReservationSaleMutation = useMutation({
    mutationFn: async ({ reservationId, productData }: { reservationId: string, productData: SaleTransactionData }) => {
      // 1. Criar transação de venda
      const transactionResponse = await apiRequest("POST", "/api/admin/transactions", {
        type: 'income' as const,
        amount: productData.totalAmount.toString(),
        description: `Venda - ${productData.productName} (${productData.quantity}x) - Reserva Confirmada`,
        category: 'Vendas',
        status: 'completed',
        metadata: {
          productId: productData.productId,
          productName: productData.productName,
          quantity: productData.quantity,
          unitPrice: productData.unitPrice,
          type: 'reservation_sale',
          reservationId: reservationId,
          reversible: true
        }
      });
      
      // 2. Marcar reserva como vendida
      const reservationResponse = await apiRequest("PUT", `/api/admin/reservations/${reservationId}`, {
        status: 'sold'
        // Removido completedAt para evitar erro de conversao de data
      });
      
      return { transaction: await transactionResponse.json(), reservation: await reservationResponse.json() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/financial/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reservations"] });
    },
  });

  const returnReservationToStockMutation = useMutation({
    mutationFn: async ({ reservationId, productId, quantity }: { reservationId: string, productId: string, quantity: number }) => {
      console.log('🔍 returnReservationToStockMutation - Dados recebidos:', { reservationId, productId, quantity });
      
      try {
        // 1. Devolver ao estoque
        console.log('📦 Buscando produto atual...');
        const currentProduct = await apiRequest("GET", `/api/admin/products/${productId}`);
        console.log('📦 Resposta do produto recebida, fazendo parsing JSON...');
        const productData = await currentProduct.json();
        const newStock = (productData.stock || 0) + quantity;
        
        console.log('📦 Produto atual:', productData);
        console.log('📊 Novo estoque calculado:', newStock);
        
        console.log('📦 Atualizando estoque do produto...');
        await apiRequest("PUT", `/api/admin/products/${productId}`, {
          stock: newStock
        });
        console.log('✅ Estoque atualizado com sucesso');
        
        // 2. Marcar reserva como devolvida
        console.log('🔄 Marcando reserva como devolvida...');
        const reservationResponse = await apiRequest("PUT", `/api/admin/reservations/${reservationId}`, {
          status: 'returned'
          // Removido completedAt para evitar erro de conversao de data
        });
        
        console.log('✅ Reserva marcada como devolvida');
        return await reservationResponse.json();
      } catch (error) {
        console.error('❌ Erro detalhado na mutation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('✅ returnReservationToStockMutation - Sucesso');
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reservations"] });
    },
    onError: (error) => {
      console.error('❌ returnReservationToStockMutation - Erro:', error);
    },
  });

  const deleteReservationMutation = useMutation({
    mutationFn: async ({ reservationId, productId, quantity }: { reservationId: string, productId: string, quantity: number }) => {
      console.log('🔍 deleteReservationMutation - Dados recebidos:', { reservationId, productId, quantity });
      
      try {
        // 1. Devolver ao estoque
        console.log('📦 Buscando produto atual...');
        const currentProduct = await apiRequest("GET", `/api/admin/products/${productId}`);
        console.log('📦 Resposta do produto recebida, fazendo parsing JSON...');
        const productData = await currentProduct.json();
        const newStock = (productData.stock || 0) + quantity;
        
        console.log('📦 Produto atual:', productData);
        console.log('📊 Novo estoque calculado:', newStock);
        
        console.log('📦 Atualizando estoque do produto...');
        await apiRequest("PUT", `/api/admin/products/${productId}`, {
          stock: newStock
        });
        console.log('✅ Estoque atualizado com sucesso');
        
        // 2. Deletar reserva completamente
        console.log('🗑️ Deletando reserva...');
        await apiRequest("DELETE", `/api/admin/reservations/${reservationId}`);
        
        console.log('✅ Reserva deletada completamente');
        return { success: true };
      } catch (error) {
        console.error('❌ Erro detalhado na mutation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('✅ deleteReservationMutation - Sucesso');
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reservations"] });
    },
    onError: (error) => {
      console.error('❌ deleteReservationMutation - Erro:', error);
    },
  });

  const addToCreditMutation = useMutation({
    mutationFn: async (creditData: CreditAccountData) => {
      console.log('💳 Adicionando produto ao crediário:', creditData);
      
      try {
        // 0. 📦 REDUZIR ESTOQUE PRIMEIRO (NOVO FLUXO)
        console.log('📦 Reduzindo estoque do produto antes de adicionar ao crediário...');
        const productResponse = await apiRequest("GET", `/api/admin/products/${creditData.productId}`);
        const product = await productResponse.json();
        
        const currentStock = product.stock || 0;
        const newStock = currentStock - creditData.quantity;
        
        console.log(`📦 Estoque de "${product.name}": ${currentStock} → ${newStock}`);
        
        if (newStock < 0) {
          throw new Error(`Estoque insuficiente para ${product.name}. Disponível: ${currentStock}, Solicitado: ${creditData.quantity}`);
        }
        
        // Atualizar estoque do produto
        await apiRequest("PUT", `/api/admin/products/${creditData.productId}`, {
          stock: newStock
        });
        
        console.log('✅ Estoque reduzido com sucesso');
        
        // 1. Buscar conta ativa do cliente ou criar nova
        const customerAccountsResponse = await apiRequest("GET", `/api/admin/customers/${creditData.customerId}/credit-accounts`);
        const customerAccounts = await customerAccountsResponse.json();
        
        let activeAccount = customerAccounts.find((account: any) => account.status === 'active');
        
        if (!activeAccount) {
          // Criar nova conta de crediário
          const accountResponse = await apiRequest("POST", "/api/admin/credit-accounts", {
            customerId: creditData.customerId,
            totalAmount: creditData.totalAmount,
            installments: 1,
            paymentFrequency: 'monthly',
            nextPaymentDate: creditData.paymentDate.toISOString().split('T')[0], // Converter Date para string YYYY-MM-DD
            notes: `Conta criada automaticamente - ${creditData.productName}`,
          });
          
          activeAccount = await accountResponse.json();
          console.log('✅ Nova conta de crediário criada:', activeAccount.id);
        } else {
          // Atualizar conta existente
          const newTotalAmount = parseFloat(activeAccount.totalAmount) + creditData.totalAmount;
          const newRemainingAmount = parseFloat(activeAccount.remainingAmount) + creditData.totalAmount;
          
          await apiRequest("PUT", `/api/admin/credit-accounts/${activeAccount.id}`, {
            totalAmount: newTotalAmount.toString(),
            remainingAmount: newRemainingAmount.toString(),
          });
          
          console.log('✅ Conta de crediário atualizada:', activeAccount.id);
        }
        
        // 2. Criar reserva vinculada à conta de crediário
        const reservationResponse = await apiRequest("POST", "/api/admin/reservations", {
          productId: creditData.productId,
          customerName: `Cliente ID: ${creditData.customerId}`,
          quantity: creditData.quantity,
          unitPrice: creditData.unitPrice.toString(),
          paymentDate: creditData.paymentDate.toISOString(), // Converter Date para string ISO
          type: 'credit_account',
          creditAccountId: activeAccount.id,
          customerId: creditData.customerId,
        });
        
        const reservation = await reservationResponse.json();
        console.log('✅ Reserva para crediário criada:', reservation.id);
        
        return {
          account: activeAccount,
          reservation,
          totalAmount: creditData.totalAmount,
          stockReduced: {
            productId: creditData.productId,
            productName: product.name,
            previousStock: currentStock,
            newStock: newStock,
            quantityReduced: creditData.quantity
          }
        };
      } catch (error) {
        console.error('❌ Erro ao adicionar ao crediário:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('🎆 Produto adicionado ao crediário com estoque reduzido:', data.stockReduced);
      
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
    },
  });

  const createCustomerAndCreditMutation = useMutation({
    mutationFn: async (data: CreateCustomerAndCreditData) => {
      console.log('👥 Criando cliente e adicionando ao crediário:', data);
      
      try {
        // 1. Criar novo cliente
        const customerResponse = await apiRequest("POST", "/api/admin/customers", {
          name: data.customerData.name,
          phone: data.customerData.phone || null,
        });
        
        const newCustomer = await customerResponse.json();
        console.log('✅ Cliente criado:', newCustomer);
        
        // 2. Criar conta de crediário para o novo cliente
        const accountResponse = await apiRequest("POST", "/api/admin/credit-accounts", {
          customerId: newCustomer.id,
          totalAmount: data.totalAmount,
          installments: 1,
          paymentFrequency: 'monthly',
          nextPaymentDate: data.paymentDate.toISOString().split('T')[0], // Converter Date para string YYYY-MM-DD
          notes: `Conta criada automaticamente - ${data.productName}`,
        });
        
        const creditAccount = await accountResponse.json();
        console.log('✅ Conta de crediário criada:', creditAccount);
        
        // 3. Adicionar produto à conta
        const productResponse = await apiRequest("POST", "/api/admin/credit-products", {
          creditAccountId: creditAccount.id,
          productId: data.productId,
          productName: data.productName,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          totalAmount: data.totalAmount,
          addedAt: new Date().toISOString(),
        });
        
        const creditProduct = await productResponse.json();
        console.log('✅ Produto adicionado ao crediário:', creditProduct);
        
        return { customer: newCustomer, account: creditAccount, product: creditProduct };
      } catch (error) {
        console.error('❌ Erro ao criar cliente e crediário:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-products"] });
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

  const openReservationDialog = () => {
    if (!pendingUpdate) return;
    
    setPendingReservation({
      product: pendingUpdate.product,
      newStock: pendingUpdate.newStock,
      quantity: pendingUpdate.quantitySold
    });
    setIsConfirmDialogOpen(false);
    setIsReservationDialogOpen(true);
  };

  const confirmReservation = async (customerName: string, paymentDate: string, quantity: number = 1) => {
    if (!pendingReservation) return;

    const { product, newStock } = pendingReservation;
    const unitPrice = parseFloat(product.price);

    try {
      // Calcular novo estoque baseado na quantidade selecionada
      const currentStock = product.stock || 0;
      const finalStock = currentStock - quantity;

      // 1. Atualizar estoque
      await updateStockMutation.mutateAsync({
        productId: product.id,
        newStock: finalStock,
        previousStock: currentStock,
        reason: 'reservation'
      });

      // 2. Criar reserva
      await createReservationMutation.mutateAsync({
        productId: product.id,
        customerName,
        quantity,
        unitPrice: unitPrice.toString(), // Decimal field expects string
        paymentDate: new Date(paymentDate) // Timestamp field expects Date - mantenha como Date aqui pois é diferente do credit account
      });

      toast({
        title: "Reserva criada!",
        description: `${quantity}x ${product.name} reservado para ${customerName}. Data de pagamento: ${new Date(paymentDate).toLocaleDateString('pt-BR')}.`,
        duration: 8000,
      });

      setIsReservationDialogOpen(false);
      setPendingReservation(null);
      setPendingUpdate(null);
    } catch (error) {
      toast({
        title: "Erro ao criar reserva",
        description: "Ocorreu um erro ao criar a reserva. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const cancelReservation = () => {
    setIsReservationDialogOpen(false);
    setPendingReservation(null);
    setIsConfirmDialogOpen(true); // Volta para o diálogo de confirmação
  };

  const openReservationManageDialog = (product: Product, reservation: Reservation) => {
    setCurrentReservation({ product, reservation });
    setIsReservationManageDialogOpen(true);
  };

  const confirmReservationSale = async () => {
    if (!currentReservation) return;

    const { product, reservation } = currentReservation;
    const totalAmount = reservation.quantity * parseFloat(reservation.unitPrice.toString());

    try {
      await confirmReservationSaleMutation.mutateAsync({
        reservationId: reservation.id,
        productData: {
          productId: product.id,
          productName: product.name,
          quantity: reservation.quantity,
          unitPrice: parseFloat(reservation.unitPrice.toString()),
          totalAmount
        }
      });

      toast({
        title: "Venda confirmada!",
        description: `Reserva de ${reservation.customerName} foi convertida em venda de ${new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(totalAmount)}.`,
      });

      setIsReservationManageDialogOpen(false);
      setCurrentReservation(null);
    } catch (error) {
      toast({
        title: "Erro ao confirmar venda",
        description: "Ocorreu um erro ao confirmar a venda da reserva. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const returnReservationToStock = async () => {
    if (!currentReservation) return;

    const { product, reservation } = currentReservation;
    console.log('🔄 returnReservationToStock - Iniciando:', { product: product.name, reservation: reservation.id, quantity: reservation.quantity });

    try {
      await returnReservationToStockMutation.mutateAsync({
        reservationId: reservation.id,
        productId: product.id,
        quantity: reservation.quantity
      });

      toast({
        title: "Produto devolvido ao estoque!",
        description: `${reservation.quantity}x ${product.name} foi devolvido ao estoque disponível.`,
      });

      setIsReservationManageDialogOpen(false);
      setCurrentReservation(null);
    } catch (error) {
      console.error('❌ returnReservationToStock - Erro capturado:', error);
      toast({
        title: "Erro ao devolver ao estoque",
        description: "Ocorreu um erro ao devolver o produto ao estoque. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const deleteReservation = async () => {
    if (!currentReservation) return;

    const { product, reservation } = currentReservation;
    console.log('🗑️ deleteReservation - Iniciando:', { product: product.name, reservation: reservation.id, quantity: reservation.quantity });

    try {
      await deleteReservationMutation.mutateAsync({
        reservationId: reservation.id,
        productId: product.id,
        quantity: reservation.quantity
      });

      toast({
        title: "Reserva excluída!",
        description: `Reserva de ${reservation.customerName} foi excluída e ${reservation.quantity}x ${product.name} foi devolvido ao estoque.`,
      });

      setIsReservationManageDialogOpen(false);
      setCurrentReservation(null);
    } catch (error) {
      console.error('❌ deleteReservation - Erro capturado:', error);
      toast({
        title: "Erro ao excluir reserva",
        description: "Ocorreu um erro ao excluir a reserva. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const cancelReservationManage = () => {
    setIsReservationManageDialogOpen(false);
    setCurrentReservation(null);
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

  const addToCredit = async (customerId: string, paymentDate: string) => {
    if (!pendingUpdate) return;

    const { product, newStock, quantitySold } = pendingUpdate;
    const unitPrice = parseFloat(product.price);
    const totalAmount = quantitySold * unitPrice;

    try {
      // 1. Atualizar estoque primeiro
      await updateStockMutation.mutateAsync({
        productId: product.id,
        newStock,
        previousStock: product.stock || 0,
        reason: 'credit_sale'
      });

      // 2. Adicionar produto ao crediário do cliente
      await addToCreditMutation.mutateAsync({
        customerId,
        productId: product.id,
        productName: product.name,
        quantity: quantitySold,
        unitPrice,
        totalAmount,
        paymentDate: new Date(paymentDate)
      });

      toast({
        title: "Produto adicionado ao crediário!",
        description: `${quantitySold}x ${product.name} adicionado à conta do cliente. Valor: ${new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(totalAmount)}.`,
        duration: 8000,
      });

      setIsConfirmDialogOpen(false);
      setPendingUpdate(null);
    } catch (error) {
      console.error('Erro ao adicionar ao crediário:', error);
      toast({
        title: "Erro ao adicionar ao crediário",
        description: "Ocorreu um erro ao adicionar o produto ao crediário. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const createCustomerAndCredit = async (customerData: { name: string; email: string; phone: string }, paymentDate: string) => {
    if (!pendingUpdate) return;

    const { product, newStock, quantitySold } = pendingUpdate;
    const unitPrice = parseFloat(product.price);
    const totalAmount = quantitySold * unitPrice;

    try {
      // 1. Atualizar estoque primeiro
      await updateStockMutation.mutateAsync({
        productId: product.id,
        newStock,
        previousStock: product.stock || 0,
        reason: 'credit_sale'
      });

      // 2. Criar cliente e adicionar ao crediário
      const result = await createCustomerAndCreditMutation.mutateAsync({
        customerData,
        productId: product.id,
        productName: product.name,
        quantity: quantitySold,
        unitPrice,
        totalAmount,
        paymentDate: new Date(paymentDate)
      });

      toast({
        title: "Cliente criado e produto adicionado ao crediário!",
        description: `Cliente ${customerData.name} criado. ${quantitySold}x ${product.name} adicionado ao crediário. Valor: ${new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(totalAmount)}.`,
        duration: 8000,
      });

      setIsConfirmDialogOpen(false);
      setPendingUpdate(null);
    } catch (error) {
      console.error('Erro ao criar cliente e crediário:', error);
      toast({
        title: "Erro ao criar cliente e crediário",
        description: "Ocorreu um erro ao criar o cliente e adicionar ao crediário. Tente novamente.",
        variant: "destructive",
      });
    }
  };
  return {
    // Dialogs de venda direta
    isConfirmDialogOpen,
    pendingUpdate,
    handleStockReduction,
    confirmStockReduction,
    cancelStockReduction,
    
    // Dialogs de reserva
    isReservationDialogOpen,
    pendingReservation,
    openReservationDialog,
    confirmReservation,
    cancelReservation,
    
    // Dialogs de gerenciamento de reserva
    isReservationManageDialogOpen,
    currentReservation,
    openReservationManageDialog,
    confirmReservationSale,
    returnReservationToStock,
    deleteReservation,
    cancelReservationManage,
    
    // Dialogs de reversão
    isRevertDialogOpen,
    pendingRevert,
    handleRevertSale,
    confirmSaleReversal,
    cancelSaleReversal,
    
    // Nova funcionalidade de crediário
    addToCredit,
    createCustomerAndCredit,
    
    // Estado de loading
    isLoading: updateStockMutation.isPending || 
               createSaleTransactionMutation.isPending || 
               createReservationMutation.isPending ||
               confirmReservationSaleMutation.isPending ||
               returnReservationToStockMutation.isPending ||
               deleteReservationMutation.isPending ||
               revertSaleMutation.isPending ||
               addToCreditMutation.isPending ||
               createCustomerAndCreditMutation.isPending,
  };
}