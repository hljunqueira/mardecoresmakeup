import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Star, Send, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';

interface ReviewFormProps {
  productId: string;
  productName: string;
  onReviewSubmitted?: () => void;
}

interface Review {
  id: string;
  rating: number;
  title?: string;
  comment?: string;
  customerName?: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

export function ReviewForm({ productId, productName, onReviewSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [comment, setComment] = useState('');
  const [recommendation, setRecommendation] = useState<'sim' | 'nao' | ''>('');
  const queryClient = useQueryClient();

  const submitReviewMutation = useMutation({
    mutationFn: async (reviewData: any) => {
      // Criar a avaliação diretamente, sem criar cliente
      const response = await apiRequest('POST', `/api/products/${productId}/reviews`, {
        customerName: customerName,
        customerPhone: customerPhone || null,
        rating,
        comment: comment || null,
        recommendation: recommendation || null,
        isVerifiedPurchase: false
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao enviar avaliação');
      }
      return response.json();
    },
    onSuccess: () => {
      // Limpar formulário
      setRating(0);
      setComment('');
      setCustomerName('');
      setCustomerPhone('');
      setRecommendation('');
      
      // Invalidar queries para atualizar as avaliações
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/reviews`] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      // Mensagem mais descontraída
      alert('🎉 Sua avaliação foi enviada com sucesso! \n😊 Obrigado por compartilhar sua experiência conosco!');
      
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    },
    onError: (error) => {
      alert('Erro ao enviar avaliação. Tente novamente.');
      console.error('Erro ao enviar avaliação:', error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      alert('Por favor, selecione uma nota de 1 a 5 estrelas');
      return;
    }
    
    if (!customerName.trim()) {
      alert('Por favor, informe seu nome');
      return;
    }

    if (!recommendation) {
      alert('Por favor, informe se você recomendaria este produto');
      return;
    }

    submitReviewMutation.mutate({
      rating,
      comment,
      customerName,
      customerPhone,
      recommendation
    });
  };

  const renderStars = (isInteractive = false) => {
    return Array.from({ length: 5 }, (_, i) => {
      const starValue = i + 1;
      const isActive = isInteractive 
        ? (hoveredRating || rating) >= starValue
        : rating >= starValue;
      
      return (
        <Star
          key={i}
          className={`h-8 w-8 cursor-pointer transition-colors ${
            isActive ? 'text-yellow-400 fill-current' : 'text-gray-300 hover:text-yellow-200'
          }`}
          onClick={() => isInteractive && setRating(starValue)}
          onMouseEnter={() => isInteractive && setHoveredRating(starValue)}
          onMouseLeave={() => isInteractive && setHoveredRating(0)}
        />
      );
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-lg">
          <Star className="h-5 w-5 text-yellow-400 mr-2" />
          Avalie este produto
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rating com estrelas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sua nota para este produto *
            </label>
            <div className="flex items-center space-x-1">
              {renderStars(true)}
              <span className="ml-3 text-sm text-gray-600">
                {rating > 0 ? `${rating}/5 estrela${rating > 1 ? 's' : ''}` : 'Clique nas estrelas'}
              </span>
            </div>
          </div>

          {/* Nome do cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seu nome *
            </label>
            <Input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Como você gostaria de aparecer na avaliação"
              required
            />
          </div>

          {/* Telefone (opcional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seu telefone (opcional)
            </label>
            <Input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>

          {/* Comentário sobre o produto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              O que você achou do produto?
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Conte sua experiência com o produto, qualidade, entrega, etc."
              rows={3}
              maxLength={300}
            />
            <p className="text-xs text-gray-500 mt-1">
              {comment.length}/300 caracteres
            </p>
          </div>

          {/* Recomendação */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Você recomendaria este produto? *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="recommendation"
                  value="sim"
                  checked={recommendation === 'sim'}
                  onChange={(e) => setRecommendation(e.target.value as 'sim')}
                  className="mr-2"
                />
                <span className="text-green-600 font-medium">👍 Sim, recomendo!</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="recommendation"
                  value="nao"
                  checked={recommendation === 'nao'}
                  onChange={(e) => setRecommendation(e.target.value as 'nao')}
                  className="mr-2"
                />
                <span className="text-red-600 font-medium">👎 Não recomendo</span>
              </label>
            </div>
          </div>

          {/* Botão de envio */}
          <Button 
            type="submit" 
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
            disabled={submitReviewMutation.isPending || rating === 0}
          >
            {submitReviewMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Avaliação
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Sua avaliação será analisada antes de ser publicada
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

// Componente para exibir avaliações existentes
interface ReviewListProps {
  productId: string;
}

export function ReviewList({ productId }: ReviewListProps) {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: [`/api/products/${productId}/reviews`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/products/${productId}/reviews`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      return response.json();
    }
  });

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Ainda não há avaliações para este produto</p>
          <p className="text-sm text-gray-400 mt-1">Seja o primeiro a avaliar!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Avaliações dos Clientes ({reviews.length})</h3>
      {reviews.map((review: Review) => (
        <Card key={review.id}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  {renderStars(review.rating)}
                  <span className="text-sm font-medium ml-2">{review.rating}/5</span>
                </div>
                {review.isVerifiedPurchase && (
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    Compra Verificada
                  </Badge>
                )}
              </div>
              <span className="text-sm text-gray-500">
                {formatDate(review.createdAt)}
              </span>
            </div>
            
            {review.title && (
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                {review.title}
                {review.title.includes('👍') && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Recomenda
                  </span>
                )}
                {review.title.includes('👎') && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                    Não Recomenda
                  </span>
                )}
              </h4>
            )}
            
            {review.comment && (
              <p className="text-gray-700 mb-3">{review.comment}</p>
            )}
            
            <div className="flex items-center text-sm text-gray-500">
              <User className="h-4 w-4 mr-1" />
              <span>{review.customerName || 'Cliente Anônimo'}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}