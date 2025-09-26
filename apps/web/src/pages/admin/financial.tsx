import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AdminSidebar from "@/components/layout/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeleteConfirmation } from "@/components/ui/delete-confirmation";
import { SaleReversalConfirm } from "@/components/ui/sale-reversal-confirm";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useStockUpdate } from "@/hooks/use-stock-update";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Building, 
  Calendar,
  Users,
  RotateCcw,
  Package
} from "lucide-react";
import type { FinancialTransaction, Supplier } from "@shared/schema";

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  balance: number;
  pendingReceivables: number;
  pendingPayables: number;
  totalTransactions: number;
}

const transactionSchema = z.object({
  type: z.enum(["income", "expense"], { required_error: "Tipo é obrigatório" }),
  category: z.string().min(1, "Categoria é obrigatória"),
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.string().min(1, "Valor é obrigatório"),
  date: z.string().optional(),
  status: z.string().default("pending"),
  dueDate: z.string().optional(),
});

const supplierSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type TransactionForm = z.infer<typeof transactionSchema>;
type SupplierForm = z.infer<typeof supplierSchema>;

export default function AdminFinancial() {
  const [, setLocation] = useLocation();
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);
  const [deleteTransaction, setDeleteTransaction] = useState<FinancialTransaction | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteTransactionDialogOpen, setIsDeleteTransactionDialogOpen] = useState(false);
  const { isAuthenticated } = useAdminAuth();
  const { toast } = useToast();
  const {
    isRevertDialogOpen,
    pendingRevert,
    handleRevertSale,
    confirmSaleReversal,
    cancelSaleReversal,
    isLoading: isRevertLoading,
  } = useStockUpdate();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, setLocation]);

  const { data: financialSummary, isLoading: summaryLoading } = useQuery<FinancialSummary>({
    queryKey: ["/api/admin/financial/summary"],
    enabled: isAuthenticated,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<FinancialTransaction[]>({
    queryKey: ["/api/admin/transactions"],
    enabled: isAuthenticated,
  });

  const { data: suppliers, isLoading: suppliersLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/admin/suppliers"],
    enabled: isAuthenticated,
  });

  const transactionForm = useForm<TransactionForm>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "income",
      category: "",
      description: "",
      amount: "",
      date: "",
      status: "pending",
      dueDate: "",
    },
  });

  const supplierForm = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    },
  });

  // Transaction mutations
  const createTransactionMutation = useMutation({
    mutationFn: async (data: TransactionForm) => {
      const payload = {
        ...data,
        date: data.date ? new Date(data.date).toISOString() : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      };
      const response = await apiRequest("POST", "/api/admin/transactions", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/financial/summary"] });
      toast({
        title: "Transação criada!",
        description: "A transação foi adicionada com sucesso.",
      });
      setIsTransactionDialogOpen(false);
      transactionForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar transação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TransactionForm }) => {
      const payload = {
        ...data,
        date: data.date ? new Date(data.date).toISOString() : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      };
      const response = await apiRequest("PUT", `/api/admin/transactions/${id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/financial/summary"] });
      toast({
        title: "Transação atualizada!",
        description: "As alterações foram salvas com sucesso.",
      });
      setIsTransactionDialogOpen(false);
      setEditingTransaction(null);
      transactionForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar transação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/financial/summary"] });
      toast({
        title: "Transação excluída!",
        description: "A transação foi removida com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir transação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Supplier mutations
  const createSupplierMutation = useMutation({
    mutationFn: async (data: SupplierForm) => {
      const response = await apiRequest("POST", "/api/admin/suppliers", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/suppliers"] });
      toast({
        title: "Fornecedor criado!",
        description: "O fornecedor foi adicionado com sucesso.",
      });
      setIsSupplierDialogOpen(false);
      supplierForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar fornecedor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SupplierForm }) => {
      const response = await apiRequest("PUT", `/api/admin/suppliers/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/suppliers"] });
      toast({
        title: "Fornecedor atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
      setIsSupplierDialogOpen(false);
      setEditingSupplier(null);
      supplierForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar fornecedor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/suppliers"] });
      toast({
        title: "Fornecedor excluído!",
        description: "O fornecedor foi removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir fornecedor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handlers
  const onSubmitTransaction = (data: TransactionForm) => {
    if (editingTransaction) {
      updateTransactionMutation.mutate({ id: editingTransaction.id, data });
    } else {
      createTransactionMutation.mutate(data);
    }
  };

  const onSubmitSupplier = (data: SupplierForm) => {
    if (editingSupplier) {
      updateSupplierMutation.mutate({ id: editingSupplier.id, data });
    } else {
      createSupplierMutation.mutate(data);
    }
  };

  const handleEditTransaction = (transaction: FinancialTransaction) => {
    setEditingTransaction(transaction);
    transactionForm.reset({
      type: transaction.type as "income" | "expense",
      category: transaction.category,
      description: transaction.description,
      amount: transaction.amount,
      date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : "",
      status: transaction.status || "pending",
      dueDate: transaction.dueDate ? new Date(transaction.dueDate).toISOString().split('T')[0] : "",
    });
    setIsTransactionDialogOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    supplierForm.reset({
      name: supplier.name,
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      notes: supplier.notes || "",
    });
    setIsSupplierDialogOpen(true);
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    setDeleteSupplier(supplier);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteTransaction = (transaction: FinancialTransaction) => {
    setDeleteTransaction(transaction);
    setIsDeleteTransactionDialogOpen(true);
  };

  const confirmDeleteSupplier = () => {
    if (deleteSupplier) {
      deleteSupplierMutation.mutate(deleteSupplier.id);
      setIsDeleteDialogOpen(false);
      setDeleteSupplier(null);
    }
  };

  const confirmDeleteTransaction = () => {
    if (deleteTransaction) {
      deleteTransactionMutation.mutate(deleteTransaction.id);
      setIsDeleteTransactionDialogOpen(false);
      setDeleteTransaction(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!date || isNaN(dateObj.getTime())) return 'N/A';
    return dateObj.toLocaleDateString('pt-BR');
  };

  const getTransactionIcon = (transaction: FinancialTransaction) => {
    if (transaction.type === 'income') {
      // Verificar se é uma venda de reserva
      if (transaction.metadata && typeof transaction.metadata === 'object') {
        const metadata = transaction.metadata as any;
        if (metadata.type === 'reservation_sale') {
          return <Calendar className="h-5 w-5 text-green-600" />;
        }
      }
      return <TrendingUp className="h-5 w-5 text-green-600" />;
    }
    return <TrendingDown className="h-5 w-5 text-red-600" />;
  };

  const getTransactionBadge = (transaction: FinancialTransaction) => {
    if (transaction.metadata && typeof transaction.metadata === 'object') {
      const metadata = transaction.metadata as any;
      if (metadata.type === 'reservation_sale') {
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-xs">Reserva</Badge>;
      }
      if (metadata.type === 'product_sale') {
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">Venda</Badge>;
      }
    }
    return null;
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-64 overflow-auto">
        <div className="p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-petrol-500 dark:text-gold-500 mb-2">
              Financeiro
            </h1>
            <p className="text-muted-foreground">
              Controle financeiro completo do seu negócio
            </p>
          </div>

          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-green-500 to-green-600 border-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Receitas</p>
                    {summaryLoading ? (
                      <Skeleton className="h-8 w-24 mt-2 bg-green-400/20" />
                    ) : (
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency(financialSummary?.totalRevenue || 0)}
                      </p>
                    )}
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-500 to-red-600 border-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm font-medium">Despesas</p>
                    {summaryLoading ? (
                      <Skeleton className="h-8 w-24 mt-2 bg-red-400/20" />
                    ) : (
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency(financialSummary?.totalExpenses || 0)}
                      </p>
                    )}
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">A Receber</p>
                    {summaryLoading ? (
                      <Skeleton className="h-8 w-24 mt-2 bg-blue-400/20" />
                    ) : (
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency(financialSummary?.pendingReceivables || 0)}
                      </p>
                    )}
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">A Pagar</p>
                    {summaryLoading ? (
                      <Skeleton className="h-8 w-24 mt-2 bg-purple-400/20" />
                    ) : (
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency(financialSummary?.pendingPayables || 0)}
                      </p>
                    )}
                  </div>
                  <Calendar className="h-8 w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="transactions" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transactions">Transações</TabsTrigger>
              <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
            </TabsList>

            {/* Transactions Tab */}
            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-petrol-500 dark:text-gold-500">
                      Transações Financeiras
                    </CardTitle>
                    <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          className="bg-petrol-500 hover:bg-petrol-600 text-white"
                          onClick={() => {
                            setEditingTransaction(null);
                            transactionForm.reset();
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Nova Transação
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>
                            {editingTransaction ? "Editar Transação" : "Nova Transação"}
                          </DialogTitle>
                        </DialogHeader>

                        <Form {...transactionForm}>
                          <form onSubmit={transactionForm.handleSubmit(onSubmitTransaction)} className="space-y-4">
                            <FormField
                              control={transactionForm.control}
                              name="type"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tipo</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Tipo de transação" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="income">Receita</SelectItem>
                                      <SelectItem value="expense">Despesa</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={transactionForm.control}
                              name="category"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Categoria</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Categoria" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="sale">Venda</SelectItem>
                                      <SelectItem value="supplier">Fornecedor</SelectItem>
                                      <SelectItem value="marketing">Marketing</SelectItem>
                                      <SelectItem value="operational">Operacional</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={transactionForm.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Descrição</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Descrição da transação" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={transactionForm.control}
                              name="amount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Valor</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="number" step="0.01" placeholder="0.00" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={transactionForm.control}
                              name="status"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Status</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Status" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="pending">Pendente</SelectItem>
                                      <SelectItem value="completed">Concluído</SelectItem>
                                      <SelectItem value="cancelled">Cancelado</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="flex justify-end space-x-2">
                              <Button type="button" variant="outline" onClick={() => setIsTransactionDialogOpen(false)}>
                                Cancelar
                              </Button>
                              <Button 
                                type="submit" 
                                disabled={createTransactionMutation.isPending || updateTransactionMutation.isPending}
                                className="bg-petrol-500 hover:bg-petrol-600"
                              >
                                {editingTransaction ? "Atualizar" : "Criar"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {transactionsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-33 w-16" />
                          </div>
                        </div>
                      ))
                    ) : transactions?.length === 0 ? (
                      <div className="text-center py-8">
                        <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Nenhuma transação encontrada</p>
                      </div>
                    ) : (
                      transactions?.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors group">
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              transaction.type === "income" ? "bg-green-100 dark:bg-green-900/20" : "bg-red-100 dark:bg-red-900/20"
                            }`}>
                              {getTransactionIcon(transaction)}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="font-medium">{transaction.description}</p>
                                {getTransactionBadge(transaction)}
                              </div>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <span>{transaction.category}</span>
                                <span>•</span>
                                <span>{formatDate(transaction.date || transaction.createdAt!)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className={`font-semibold ${
                                transaction.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                              }`}>
                                {transaction.type === "income" ? "+" : "-"}{formatCurrency(parseFloat(transaction.amount))}
                              </p>
                              <Badge variant={transaction.status === "completed" ? "default" : "secondary"}>
                                {transaction.status === "pending" ? "Pendente" : transaction.status === "completed" ? "Concluído" : "Cancelado"}
                              </Badge>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                              <Button size="icon" variant="ghost" onClick={() => handleEditTransaction(transaction)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => handleDeleteTransaction(transaction)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Suppliers Tab */}
            <TabsContent value="suppliers">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-petrol-500 dark:text-gold-500">
                      Fornecedores
                    </CardTitle>
                    <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          className="bg-petrol-500 hover:bg-petrol-600 text-white"
                          onClick={() => {
                            setEditingSupplier(null);
                            supplierForm.reset();
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Novo Fornecedor
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>
                            {editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}
                          </DialogTitle>
                        </DialogHeader>

                        <Form {...supplierForm}>
                          <form onSubmit={supplierForm.handleSubmit(onSubmitSupplier)} className="space-y-4">
                            <FormField
                              control={supplierForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nome</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Nome do fornecedor" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={supplierForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="email" placeholder="email@exemplo.com" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={supplierForm.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Telefone</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="(11) 99999-9999" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={supplierForm.control}
                              name="address"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Endereço</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} placeholder="Endereço completo" rows={2} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={supplierForm.control}
                              name="notes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Observações</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} placeholder="Notas adicionais" rows={2} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="flex justify-end space-x-2">
                              <Button type="button" variant="outline" onClick={() => setIsSupplierDialogOpen(false)}>
                                Cancelar
                              </Button>
                              <Button 
                                type="submit" 
                                disabled={createSupplierMutation.isPending || updateSupplierMutation.isPending}
                                className="bg-petrol-500 hover:bg-petrol-600"
                              >
                                {editingSupplier ? "Atualizar" : "Criar"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {suppliersLoading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i}>
                          <CardContent className="p-4">
                            <Skeleton className="h-6 w-3/4 mb-2" />
                            <Skeleton className="h-4 w-full mb-1" />
                            <Skeleton className="h-4 w-2/3" />
                          </CardContent>
                        </Card>
                      ))
                    ) : suppliers?.length === 0 ? (
                      <div className="col-span-full text-center py-8">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Nenhum fornecedor cadastrado</p>
                      </div>
                    ) : (
                      suppliers?.map((supplier) => (
                        <Card key={supplier.id} className="group hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-petrol-100 dark:bg-petrol-800 rounded-full flex items-center justify-center">
                                  <Building className="h-5 w-5 text-petrol-500 dark:text-gold-500" />
                                </div>
                                <div>
                                  <h3 className="font-semibold">{supplier.name}</h3>
                                </div>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                <Button size="icon" variant="ghost" onClick={() => handleEditSupplier(supplier)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  onClick={() => handleDeleteSupplier(supplier)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              {supplier.email && <p>{supplier.email}</p>}
                              {supplier.phone && <p>{supplier.phone}</p>}
                              {supplier.address && <p className="truncate">{supplier.address}</p>}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Delete Supplier Confirmation Modal */}
      <DeleteConfirmation
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteSupplier}
        title={deleteSupplier?.name || ""}
        description="Este fornecedor será removido permanentemente do sistema."
        isLoading={deleteSupplierMutation.isPending}
      />
      
      {/* Delete Transaction Confirmation Modal */}
      <DeleteConfirmation
        isOpen={isDeleteTransactionDialogOpen}
        onOpenChange={setIsDeleteTransactionDialogOpen}
        onConfirm={confirmDeleteTransaction}
        title={deleteTransaction?.description || ""}
        description={`Valor: ${deleteTransaction ? formatCurrency(parseFloat(deleteTransaction.amount)) : ''} • Esta transação será removida permanentemente dos registros financeiros.`}
        isLoading={deleteTransactionMutation.isPending}
      />
      
      {/* Sale Reversal Confirmation Modal */}
      <SaleReversalConfirm
        isOpen={isRevertDialogOpen}
        onConfirm={confirmSaleReversal}
        onCancel={cancelSaleReversal}
        isLoading={isRevertLoading}
        product={pendingRevert?.product || null}
        quantity={pendingRevert?.quantity || 0}
        transaction={pendingRevert?.transaction || null}
      />
    </div>
  );
}
