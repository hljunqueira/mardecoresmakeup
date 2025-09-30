import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Eye, EyeOff, Star, MessageSquare, Calendar, User, Package, BarChart3 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import AdminSidebar from '@/components/layout/admin-sidebar';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ProductReview {
  id: string;
  productId: string;
  customerId: string;
  orderId?: string;
  rating: number;
  title?: string;
  comment?: string;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  createdAt: string;
  customerName?: string;
  customerEmail?: string;
  productName?: string;
}

export default function ReviewsPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAdminAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/admin/login');
    }
  }, [isAuthenticated, setLocation]);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/reviews');
      if (!response.ok) throw new Error('Failed to fetch reviews');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const response = await apiRequest('DELETE', `/api/admin/reviews/${reviewId}`);
      if (!response.ok) throw new Error('Failed to delete review');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast({
        title: "Avaliação deletada com sucesso!",
        description: "A avaliação foi removida permanentemente do sistema.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao deletar avaliação",
        description: "Não foi possível deletar a avaliação. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const toggleApprovalMutation = useMutation({
    mutationFn: async ({ reviewId, isApproved }: { reviewId: string; isApproved: boolean }) => {
      const response = await apiRequest('PATCH', `/api/admin/reviews/${reviewId}/approve`, { isApproved });
      if (!response.ok) throw new Error('Failed to update review approval');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
  });

  const handleDeleteReview = (reviewId: string) => {
    deleteReviewMutation.mutate(reviewId);
  };

  const handleToggleApproval = (review: ProductReview) => {
    toggleApprovalMutation.mutate({
      reviewId: review.id,
      isApproved: !review.isApproved
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminSidebar />
        <div className="lg:pl-64">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando avaliações...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const approvedReviews = reviews.filter((r: ProductReview) => r.isApproved);
  const pendingReviews = reviews.filter((r: ProductReview) => !r.isApproved);
  const verifiedPurchases = reviews.filter((r: ProductReview) => r.isVerifiedPurchase);
  const averageRating = approvedReviews.length > 0 
    ? (approvedReviews.reduce((sum: number, r: ProductReview) => sum + r.rating, 0) / approvedReviews.length).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="lg:pl-64">
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gerenciar Avaliações</h1>
            <p className="mt-2 text-sm text-gray-700">
              Gerencie as avaliações dos produtos e monitore a satisfação dos clientes
            </p>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Avaliações</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reviews.length}</div>
                <p className="text-xs text-muted-foreground">{approvedReviews.length} aprovadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Média Geral</CardTitle>
                <Star className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center">
                  {averageRating}
                  <Star className="h-5 w-5 text-yellow-400 fill-current ml-1" />
                </div>
                <p className="text-xs text-muted-foreground">De {approvedReviews.length} avaliações</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compras Verificadas</CardTitle>
                <Package className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{verifiedPurchases.length}</div>
                <p className="text-xs text-muted-foreground">
                  {reviews.length > 0 ? Math.round((verifiedPurchases.length / reviews.length) * 100) : 0}% do total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <Eye className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{pendingReviews.length}</div>
                <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Avaliações */}
          <Card>
            <CardHeader>
              <CardTitle>Todas as Avaliações</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {reviews.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhuma avaliação encontrada</p>
                  </div>
                ) : (
                  reviews.map((review: ProductReview) => (
                    <div key={review.id} className="px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="flex items-center space-x-1">
                              {renderStars(review.rating)}
                              <span className="text-sm font-medium">{review.rating}/5</span>
                            </div>
                            {review.isVerifiedPurchase && (
                              <Badge className="bg-green-100 text-green-800">Compra Verificada</Badge>
                            )}
                            <Badge className={review.isApproved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {review.isApproved ? 'Aprovada' : 'Reprovada'}
                            </Badge>
                          </div>
                          
                          {review.title && <h3 className="font-medium text-gray-900 mb-1">{review.title}</h3>}
                          {review.comment && <p className="text-gray-700 mb-2">{review.comment}</p>}
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>👤 {review.customerName || 'Cliente não identificado'}</span>
                            <span>📦 {review.productName || 'Produto não encontrado'}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleToggleApproval(review)}
                            className="p-2 rounded-full hover:bg-gray-100"
                            title={review.isApproved ? 'Reprovar' : 'Aprovar'}
                          >
                            {review.isApproved ? (
                              <EyeOff className="h-4 w-4 text-red-600" />
                            ) : (
                              <Eye className="h-4 w-4 text-green-600" />
                            )}
                          </button>
                          
                          {/* Botão de Delete com Confirmação */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                className="p-2 rounded-full hover:bg-red-50 text-red-600"
                                title="Deletar"
                                disabled={deleteReviewMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Exclusão da Avaliação</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja deletar esta avaliação?
                                  <br />
                                  <strong>Esta ação não pode ser desfeita.</strong>
                                  <br /><br />
                                  <span className="text-sm text-gray-600">
                                    Cliente: {review.customerName || 'Não identificado'}
                                    <br />
                                    Produto: {review.productName || 'Não encontrado'}
                                    <br />
                                    Nota: {review.rating}/5 estrelas
                                    {review.title && (
                                      <>
                                        <br />
                                        Título: "{review.title}"
                                      </>
                                    )}
                                  </span>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteReview(review.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Sim, Deletar Avaliação
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}