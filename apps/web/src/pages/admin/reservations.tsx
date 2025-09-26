import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AdminSidebar from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useStockUpdate } from "@/hooks/use-stock-update";
import { ReservationManageModal } from "@/components/ui/reservation-manage-modal";
import { 
  Calendar,
  Search,
  Filter,
  Package,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Eye,
  MoreHorizontal,
  TrendingUp,
  DollarSign,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product, Reservation } from "@shared/schema";

export default function AdminReservations() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { isAuthenticated } = useAdminAuth();
  const { 
    isReservationManageDialogOpen,
    currentReservation,
    openReservationManageDialog,
    confirmReservationSale,
    returnReservationToStock,
    deleteReservation,
    cancelReservationManage,
    isLoading: isStockUpdateLoading
  } = useStockUpdate();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, setLocation]);

  const { data: reservations, isLoading: reservationsLoading, refetch: refetchReservations } = useQuery<Reservation[]>({
    queryKey: ["/api/admin/reservations"],
    enabled: isAuthenticated,
  });

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
    enabled: isAuthenticated,
  });

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Ativa</Badge>;
      case 'sold':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Vendida</Badge>;
      case 'returned':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Devolvida</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'sold':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'returned':
        return <RefreshCw className="h-4 w-4 text-gray-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  // Filtrar reservas
  const filteredReservations = reservations?.filter(reservation => {
    const product = products?.find(p => p.id === reservation.productId);
    const matchesSearch = reservation.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  // Estatísticas
  const totalReservations = reservations?.length || 0;
  const activeReservations = reservations?.filter(r => r.status === 'active').length || 0;
  const soldReservations = reservations?.filter(r => r.status === 'sold').length || 0;
  const totalReservedValue = reservations?.reduce((sum, r) => {
    if (r.status === 'active') {
      return sum + (r.quantity * parseFloat(r.unitPrice.toString()));
    }
    return sum;
  }, 0) || 0;

  const handleOpenReservationDialog = (reservation: Reservation) => {
    const product = products?.find(p => p.id === reservation.productId);
    if (product) {
      openReservationManageDialog(product, reservation);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-64 overflow-auto bg-white">
        <div className="p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8 flex justify-between items-start">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-petrol-700 flex items-center">
                <Calendar className="h-10 w-10 mr-3 text-petrol-600" />
                Reservas
              </h1>
              <p className="text-lg text-petrol-600">
                Gerencie reservas de produtos e controle de pagamentos
              </p>
            </div>
            <Button 
              onClick={() => refetchReservations()}
              className="bg-petrol-700 hover:bg-petrol-800 text-white flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Atualizar</span>
            </Button>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total de Reservas</p>
                    <p className="text-3xl font-bold text-white">{totalReservations}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-sm font-medium">Reservas Ativas</p>
                    <p className="text-3xl font-bold text-white">{activeReservations}</p>
                  </div>
                  <Clock className="h-8 w-8 text-amber-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Vendas Confirmadas</p>
                    <p className="text-3xl font-bold text-white">{soldReservations}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium">Valor Reservado</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(totalReservedValue)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-emerald-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card className="mb-8 shadow-sm border-petrol-200">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar por cliente ou produto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-petrol-200 focus:border-petrol-400"
                    />
                  </div>
                </div>
                <div className="sm:w-48">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="border-petrol-200 focus:border-petrol-400">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="active">Ativas</SelectItem>
                      <SelectItem value="sold">Vendidas</SelectItem>
                      <SelectItem value="returned">Devolvidas</SelectItem>
                      <SelectItem value="cancelled">Canceladas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Reservas */}
          <Card className="shadow-lg border-petrol-100">
            <CardHeader>
              <CardTitle className="text-petrol-700 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Lista de Reservas ({filteredReservations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reservationsLoading || productsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                      <Skeleton className="w-20 h-8" />
                      <Skeleton className="w-24 h-8" />
                    </div>
                  ))}
                </div>
              ) : filteredReservations.length === 0 ? (
                <div className="text-center py-16">
                  <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-medium text-gray-600 mb-2">
                    {searchTerm || statusFilter !== 'all' ? 'Nenhuma reserva encontrada' : 'Nenhuma reserva ainda'}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Tente ajustar os filtros de busca'
                      : 'As reservas aparecerão aqui quando forem criadas'
                    }
                  </p>
                  {!searchTerm && statusFilter === 'all' && (
                    <Button
                      onClick={() => setLocation("/admin/produtos")}
                      className="bg-petrol-600 hover:bg-petrol-700"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Gerenciar Produtos
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReservations.map((reservation) => {
                    const product = products?.find(p => p.id === reservation.productId);
                    const totalValue = reservation.quantity * parseFloat(reservation.unitPrice.toString());
                    
                    return (
                      <div key={reservation.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <div className="w-12 h-12 bg-petrol-100 rounded-full flex items-center justify-center">
                              {getStatusIcon(reservation.status || 'active')}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {reservation.customerName}
                                </h3>
                                {getStatusBadge(reservation.status || 'active')}
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <Package className="h-4 w-4" />
                                    <span className="font-medium">{product?.name || 'Produto não encontrado'}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-gray-500">Quantidade:</span>
                                    <span className="font-medium">{reservation.quantity}x</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-gray-500">Valor unitário:</span>
                                    <span className="font-medium">{formatCurrency(reservation.unitPrice)}</span>
                                  </div>
                                </div>
                                
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4" />
                                    <span className="text-gray-500">Pagamento previsto:</span>
                                    <span className="font-medium">{formatDate(reservation.paymentDate)}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4" />
                                    <span className="text-gray-500">Criada em:</span>
                                    <span className="font-medium">{reservation.createdAt ? formatDateTime(reservation.createdAt) : 'N/A'}</span>
                                  </div>
                                  {reservation.completedAt && (
                                    <div className="flex items-center space-x-2">
                                      <CheckCircle2 className="h-4 w-4" />
                                      <span className="text-gray-500">Finalizada em:</span>
                                      <span className="font-medium">{formatDateTime(reservation.completedAt)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {reservation.notes && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                                  <p className="text-sm text-gray-600">
                                    <strong>Observações:</strong> {reservation.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 ml-4">
                            <div className="text-right">
                              <p className="text-lg font-bold text-petrol-700">
                                {formatCurrency(totalValue)}
                              </p>
                              <p className="text-sm text-gray-500">Total</p>
                            </div>
                            
                            {reservation.status === 'active' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleOpenReservationDialog(reservation)}
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Confirmar Venda
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleOpenReservationDialog(reservation)}
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Devolver ao Estoque
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleOpenReservationDialog(reservation)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir Reserva
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Reservation Management Modal */}
      <ReservationManageModal
        isOpen={isReservationManageDialogOpen}
        onConfirmSale={confirmReservationSale}
        onReturnToStock={returnReservationToStock}
        onDeleteReservation={deleteReservation}
        onCancel={cancelReservationManage}
        isLoading={isStockUpdateLoading}
        product={currentReservation?.product || null}
        reservation={currentReservation?.reservation || null}
      />
    </div>
  );
}