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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Package, DollarSign, CreditCard, User, UserPlus } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Product, Customer } from "@shared/schema";

interface StockReductionConfirmProps {
  isOpen: boolean;
  onConfirm: () => void;
  onAddToCredit: (customerId: string, paymentDate: string) => void;
  onCreateCustomerAndCredit: (customerData: { name: string; email: string; phone: string }, paymentDate: string) => void;
  onCancel: () => void;
  isLoading: boolean;
  product: Product | null;
  quantitySold: number;
  newStock: number;
}

export function StockReductionConfirm({
  isOpen,
  onConfirm,
  onAddToCredit,
  onCreateCustomerAndCredit,
  onCancel,
  isLoading,
  product,
  quantitySold,
  newStock,
}: StockReductionConfirmProps) {
  const [selectedMode, setSelectedMode] = useState<'sale' | 'credit'>('credit');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState<boolean>(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Query para buscar clientes
  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/admin/customers"],
  });

  // Buscar clientes (sem filtro de busca)
  const filteredCustomers = customers || [];

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedMode('credit');
      setSelectedCustomerId('');
      setPaymentDate('');
      setShowNewCustomerForm(false);
      setNewCustomerData({ name: '', email: '', phone: '' });
      // Set default payment date to next month
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setPaymentDate(nextMonth.toISOString().split('T')[0]);
    }
  }, [isOpen]);

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

  const handleConfirmCredit = () => {
    if (showNewCustomerForm) {
      // Criar novo cliente e adicionar ao crediário automaticamente
      if (newCustomerData.name && newCustomerData.email && paymentDate) {
        onCreateCustomerAndCredit(newCustomerData, paymentDate);
      }
    } else {
      // Adicionar ao cliente existente
      if (selectedCustomerId && paymentDate) {
        onAddToCredit(selectedCustomerId, paymentDate);
      }
    }
  };

  const handleNewCustomerClick = () => {
    setShowNewCustomerForm(true);
    setSelectedCustomerId('');
  };

  const handleBackToSearch = () => {
    setShowNewCustomerForm(false);
    setNewCustomerData({ name: '', email: '', phone: '' });
  };

  const canConfirmCredit = showNewCustomerForm 
    ? (newCustomerData.name && newCustomerData.email && paymentDate)
    : (selectedCustomerId && paymentDate);
  const canConfirmSale = selectedMode === 'sale';

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="stock-reduction-description">
        <DialogHeader className="text-center pb-2">
          <div className="flex items-center justify-center space-x-3 mb-1">
            <div className="w-7 h-7 bg-gradient-to-br from-petrol-500 to-petrol-600 rounded-lg flex items-center justify-center">
              <Package className="h-3 w-3 text-white" />
            </div>
            <DialogTitle className="text-base font-bold text-gray-900">
              {product.name.toUpperCase()}
            </DialogTitle>
          </div>
          <DialogDescription id="stock-reduction-description" className="text-xs text-gray-600">
            Estoque: {previousStock} → {newStock} • Vendido: {quantitySold} • Total: {formatCurrency(totalAmount)}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          {/* Seção de Seleção de Modo */}
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <DollarSign className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-sm text-gray-800">Como processar esta venda?</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Opção Crediário - Priorizada */}
              <div 
                className={`border-2 rounded-lg p-2 cursor-pointer transition-all duration-200 ${
                  selectedMode === 'credit' 
                    ? 'border-petrol-500 bg-gradient-to-r from-petrol-50 to-blue-50' 
                    : 'border-gray-200 hover:border-petrol-300 bg-white'
                }`}
                onClick={() => setSelectedMode('credit')}
              >
                <div className="flex items-start space-x-2">
                  <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                    selectedMode === 'credit' 
                      ? 'border-petrol-500 bg-petrol-500' 
                      : 'border-gray-300'
                  }`}>
                    {selectedMode === 'credit' && (
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-1 mb-1">
                      <CreditCard className="h-3 w-3 text-petrol-600" />
                      <span className="font-bold text-xs text-petrol-800">Crediário</span>
                      <span className="bg-petrol-100 text-petrol-800 text-xs px-1 py-0.5 rounded font-medium">
                        ★
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">
                      Adiciona à conta do cliente
                    </p>
                    <div className="text-xs font-bold text-petrol-700">
                      {formatCurrency(totalAmount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Opção Venda à Vista */}
              <div 
                className={`border-2 rounded-lg p-2 cursor-pointer transition-all duration-200 ${
                  selectedMode === 'sale' 
                    ? 'border-green-500 bg-gradient-to-r from-green-50 to-emerald-50' 
                    : 'border-gray-200 hover:border-green-300 bg-white'
                }`}
                onClick={() => setSelectedMode('sale')}
              >
                <div className="flex items-start space-x-2">
                  <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                    selectedMode === 'sale' 
                      ? 'border-green-500 bg-green-500' 
                      : 'border-gray-300'
                  }`}>
                    {selectedMode === 'sale' && (
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-1 mb-1">
                      <DollarSign className="h-3 w-3 text-green-600" />
                      <span className="font-bold text-xs text-green-800">Venda à Vista</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">
                      Pagamento imediato
                    </p>
                    <div className="text-xs font-bold text-green-700">
                      {formatCurrency(totalAmount)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Formulário para Crediário */}
          {selectedMode === 'credit' && (
            <div className="bg-gradient-to-r from-petrol-50 to-blue-50 p-3 rounded-lg border border-petrol-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-petrol-600" />
                  <span className="font-medium text-sm text-petrol-800">
                    {showNewCustomerForm ? 'Criar Novo Cliente' : 'Selecionar Cliente'}
                  </span>
                </div>
                {showNewCustomerForm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToSearch}
                    className="text-xs h-6 px-2 text-petrol-600 hover:text-petrol-800"
                  >
                    ← Voltar
                  </Button>
                )}
              </div>
              
              {!showNewCustomerForm ? (
                <div className="grid grid-cols-3 gap-3">
                  {/* Coluna 1 - Seleção de Cliente */}
                  <div className="space-y-2">
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCustomers.length === 0 ? (
                          <SelectItem value="" disabled>
                            Carregando...
                          </SelectItem>
                        ) : (
                          filteredCustomers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              <div>
                                <div className="font-medium text-xs">{customer.name}</div>
                                <div className="text-xs text-gray-500">{customer.email}</div>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    
                    {/* Botão Criar Novo Cliente */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNewCustomerClick}
                      className="w-full h-8 text-xs border-dashed border-petrol-300 text-petrol-600 hover:border-petrol-500 hover:text-petrol-800 hover:bg-petrol-50"
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Criar Novo Cliente
                    </Button>
                  </div>

                  {/* Coluna 2 - Data de Pagamento */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 block">
                      Data de Pagamento
                    </label>
                    <Input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Coluna 3 - Preview da Conta */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 block">
                      Preview da Conta
                    </label>
                    {selectedCustomerId ? (
                      <div className="bg-white p-2 rounded border border-petrol-300 h-8 flex items-center">
                        <div className="text-xs flex-1">
                          <div className="font-medium text-petrol-700 truncate">
                            {filteredCustomers.find(c => c.id === selectedCustomerId)?.name}
                          </div>
                        </div>
                        <div className="text-xs font-bold text-petrol-700">
                          {formatCurrency(totalAmount)}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-100 p-2 rounded border h-8 flex items-center justify-center">
                        <span className="text-xs text-gray-500">Selecione um cliente</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Formulário de Novo Cliente */
                <div className="grid grid-cols-3 gap-3">
                  {/* Coluna 1 - Dados do Cliente */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 block">
                      Nome Completo *
                    </label>
                    <Input
                      placeholder="Nome do cliente"
                      value={newCustomerData.name}
                      onChange={(e) => setNewCustomerData(prev => ({ ...prev, name: e.target.value }))}
                      className="h-8 text-xs"
                    />
                    
                    <label className="text-xs font-medium text-gray-700 block">
                      Email *
                    </label>
                    <Input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={newCustomerData.email}
                      onChange={(e) => setNewCustomerData(prev => ({ ...prev, email: e.target.value }))}
                      className="h-8 text-xs"
                    />
                    
                    <label className="text-xs font-medium text-gray-700 block">
                      Telefone (opcional)
                    </label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={newCustomerData.phone}
                      onChange={(e) => setNewCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Coluna 2 - Data de Pagamento */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 block">
                      Data de Pagamento
                    </label>
                    <Input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Coluna 3 - Preview da Nova Conta */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 block">
                      Preview da Nova Conta
                    </label>
                    {newCustomerData.name ? (
                      <div className="bg-white p-2 rounded border border-petrol-300 h-16 flex flex-col justify-center">
                        <div className="text-xs">
                          <div className="font-medium text-petrol-700 truncate">
                            {newCustomerData.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {newCustomerData.email}
                          </div>
                          <div className="text-xs font-bold text-petrol-700 mt-1">
                            {formatCurrency(totalAmount)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-100 p-2 rounded border h-16 flex items-center justify-center">
                        <span className="text-xs text-gray-500 text-center">Preencha os dados</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row space-x-2 pt-2 border-t">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 border-gray-300 hover:border-gray-400 text-gray-700 h-8 text-xs"
          >
            Cancelar
          </Button>
          
          {selectedMode === 'credit' ? (
            <Button
              onClick={handleConfirmCredit}
              disabled={isLoading || !canConfirmCredit}
              className="flex-1 bg-gradient-to-r from-petrol-600 to-petrol-700 hover:from-petrol-700 hover:to-petrol-800 text-white font-medium h-8 text-xs"
            >
              {isLoading ? (
                <div className="flex items-center space-x-1">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  <span>Processando...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <CreditCard className="h-3 w-3" />
                  <span>{showNewCustomerForm ? 'Criar Cliente e Crediário' : 'Adicionar ao Crediário'}</span>
                </div>
              )}
            </Button>
          ) : (
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium h-8 text-xs"
            >
              {isLoading ? (
                <div className="flex items-center space-x-1">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  <span>Processando...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <DollarSign className="h-3 w-3" />
                  <span>Confirmar Venda à Vista</span>
                </div>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}