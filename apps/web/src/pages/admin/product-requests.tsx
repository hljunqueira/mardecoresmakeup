import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminSidebar from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye,
  Trash2,
  Phone
} from "lucide-react";
import type { ProductRequest } from "@shared/schema";

interface ProductRequestWithActions extends ProductRequest {
  actions?: {
    onUpdateStatus: (id: string, status: string, notes?: string) => void;
    onDelete: (id: string) => void;
  };
}

const STATUS_CONFIG = {
  pending: {
    label: "Pendente",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock
  },
  contacted: {
    label: "Contatado",
    color: "bg-blue-100 text-blue-800", 
    icon: MessageCircle
  },
  resolved: {
    label: "Resolvido",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle
  },
  cancelled: {
    label: "Cancelado",
    color: "bg-red-100 text-red-800",
    icon: XCircle
  }
};

function ProductRequestCard({ request, onUpdateStatus, onDelete }: {
  request: ProductRequest;
  onUpdateStatus: (id: string, status: string, notes?: string) => void;
  onDelete: (id: string) => void;
}) {
  const [selectedStatus, setSelectedStatus] = useState(request.status || "pending");
  const [notes, setNotes] = useState(request.notes || "");
  const [showDetails, setShowDetails] = useState(false);

  const statusConfig = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  const handleUpdateStatus = () => {
    onUpdateStatus(request.id, selectedStatus, notes);
    setShowDetails(false);
  };

  const handleWhatsAppClick = () => {
    // Remover caracteres não numéricos do telefone
    const cleanPhone = request.phone.replace(/\D/g, '');
    
    // Adicionar código do Brasil se necessário
    const phone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    // Criar mensagem personalizada
    const message = `Olá ${request.customerName}! Vi que você solicitou informações sobre "${request.productName}". Como posso te ajudar?`;
    
    // Abrir WhatsApp
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    // Se ainda não foi marcado como contatado, marcar automaticamente
    if (request.status === 'pending') {
      onUpdateStatus(request.id, 'contacted', notes);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon className="h-4 w-4" />
              <Badge className={statusConfig.color}>
                {statusConfig.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {format(new Date(request.createdAt || new Date()), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
            
            <h3 className="font-semibold text-lg mb-1">{request.customerName}</h3>
            <p className="text-muted-foreground mb-2">
              <strong>Produto:</strong> {request.productName}
            </p>
            <p className="text-muted-foreground mb-3">
              <strong>WhatsApp:</strong> {request.phone}
            </p>
            
            {request.notes && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm">
                  <strong>Observações:</strong> {request.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-3 border-t">
          <Button
            onClick={handleWhatsAppClick}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <Phone className="h-4 w-4 mr-2" />
            Abrir WhatsApp
          </Button>
          
          <Dialog open={showDetails} onOpenChange={setShowDetails}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Gerenciar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gerenciar Solicitação</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="contacted">Contatado</SelectItem>
                      <SelectItem value="resolved">Resolvido</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Observações</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Adicione observações sobre esta solicitação..."
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleUpdateStatus} className="flex-1">
                    Salvar Alterações
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      onDelete(request.id);
                      setShowDetails(false);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProductRequests() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar solicitações
  const { data: requests, isLoading } = useQuery<ProductRequest[]>({
    queryKey: ["/api/admin/product-requests"],
  });

  // Mutation para atualizar status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const response = await fetch(`/api/admin/product-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar solicitação");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/product-requests"] });
      toast({
        title: "Solicitação atualizada!",
        description: "O status da solicitação foi atualizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar solicitação",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/product-requests/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao deletar solicitação");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/product-requests"] });
      toast({
        title: "Solicitação deletada!",
        description: "A solicitação foi removida com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao deletar solicitação",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    },
  });

  const handleUpdateStatus = (id: string, status: string, notes?: string) => {
    updateStatusMutation.mutate({ id, status, notes });
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja deletar esta solicitação?")) {
      deleteMutation.mutate(id);
    }
  };

  // Agrupar por status
  const groupedRequests = requests?.reduce((acc, request) => {
    const status = request.status || "pending";
    if (!acc[status]) acc[status] = [];
    acc[status].push(request);
    return acc;
  }, {} as Record<string, ProductRequest[]>) || {};

  const stats = {
    total: requests?.length || 0,
    pending: groupedRequests.pending?.length || 0,
    contacted: groupedRequests.contacted?.length || 0,
    resolved: groupedRequests.resolved?.length || 0,
  };

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-64 overflow-auto bg-white">
        <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Solicitações de Produtos
          </h1>
          <p className="text-gray-600">
            Gerencie as solicitações de produtos dos clientes
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Contatados</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.contacted}</p>
                </div>
                <MessageCircle className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Resolvidos</p>
                  <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Solicitações */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-petrol-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando solicitações...</p>
          </div>
        ) : !requests?.length ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma solicitação encontrada</h3>
              <p className="text-muted-foreground">
                As solicitações de produtos aparecerão aqui quando os clientes usarem o formulário.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const statusRequests = groupedRequests[status] || [];
              if (statusRequests.length === 0) return null;

              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-4">
                    <config.icon className="h-5 w-5" />
                    <h2 className="text-xl font-semibold">{config.label}</h2>
                    <Badge variant="secondary">{statusRequests.length}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {statusRequests.map((request) => (
                      <ProductRequestCard
                        key={request.id}
                        request={request}
                        onUpdateStatus={handleUpdateStatus}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}