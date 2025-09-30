import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AdminSidebar from "@/components/layout/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Tag, Percent, DollarSign, Calendar } from "lucide-react";
import type { Coupon } from "@shared/schema";

const couponSchema = z.object({
  code: z.string().min(1, "Código é obrigatório").transform(val => val.toUpperCase()),
  type: z.enum(["percentage", "fixed"], { required_error: "Tipo é obrigatório" }),
  value: z.string().min(1, "Valor é obrigatório"),
  active: z.boolean().default(true),
  expiresAt: z.string().optional(),
  usageLimit: z.number().min(1).optional(),
});

type CouponForm = z.infer<typeof couponSchema>;

export default function AdminCoupons() {
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const { isAuthenticated } = useAdminAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, setLocation]);

  const { data: coupons, isLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/admin/coupons"],
    enabled: isAuthenticated,
  });

  const form = useForm<CouponForm>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: "",
      type: "percentage",
      value: "",
      active: true,
      expiresAt: "",
      usageLimit: undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CouponForm) => {
      const payload = {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
      };
      const response = await apiRequest("POST", "/api/admin/coupons", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      toast({
        title: "Cupom criado!",
        description: "O cupom foi adicionado com sucesso.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar cupom",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CouponForm }) => {
      const payload = {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
      };
      const response = await apiRequest("PUT", `/api/admin/coupons/${id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      toast({
        title: "Cupom atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
      setIsDialogOpen(false);
      setEditingCoupon(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar cupom",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/coupons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      toast({
        title: "Cupom excluído!",
        description: "O cupom foi removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir cupom",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CouponForm) => {
    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    form.reset({
      code: coupon.code,
      type: coupon.type as "percentage" | "fixed",
      value: coupon.value,
      active: coupon.active || false,
      expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split('T')[0] : "",
      usageLimit: coupon.usageLimit || undefined,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este cupom?")) {
      deleteMutation.mutate(id);
    }
  };

  const formatValue = (type: string, value: string) => {
    if (type === "percentage") {
      return `${value}%`;
    } else {
      return `R$ ${parseFloat(value).toFixed(2).replace('.', ',')}`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const isExpired = (dateString?: string) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-64 overflow-auto">
        <div className="p-6 lg:p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-petrol-500 dark:text-gold-500 mb-2">
                Cupons
              </h1>
              <p className="text-muted-foreground">
                Gerencie seus cupons de desconto
              </p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-petrol-500 hover:bg-petrol-600 text-white"
                  onClick={() => {
                    setEditingCoupon(null);
                    form.reset();
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Cupom
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md" aria-describedby="coupon-form-description">
                <DialogHeader>
                  <DialogTitle>
                    {editingCoupon ? "Editar Cupom" : "Novo Cupom"}
                  </DialogTitle>
                  <DialogDescription id="coupon-form-description">
                    {editingCoupon ? "Modifique as informações do cupom de desconto" : "Crie um novo cupom de desconto"}
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código do Cupom</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="DESCONTO10" className="uppercase" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Tipo de desconto" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="percentage">Porcentagem</SelectItem>
                                <SelectItem value="fixed">Valor Fixo</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder={form.watch("type") === "percentage" ? "10" : "50.00"} 
                                type="number" 
                                step="0.01" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="expiresAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Expiração (opcional)</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="usageLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Limite de Uso (opcional)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              placeholder="Sem limite"
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="active"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange} 
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-medium">
                            Cupom ativo
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsDialogOpen(false);
                          setEditingCoupon(null);
                          form.reset();
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createMutation.isPending || updateMutation.isPending}
                        className="bg-petrol-500 hover:bg-petrol-600"
                      >
                        {(createMutation.isPending || updateMutation.isPending) ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Salvando...
                          </div>
                        ) : (
                          editingCoupon ? "Atualizar" : "Criar"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Coupons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex space-x-2 mt-4">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              coupons?.map((coupon) => (
                <Card key={coupon.id} className="relative group hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-bold text-petrol-500 dark:text-gold-500 flex items-center">
                        <Tag className="h-5 w-5 mr-2" />
                        {coupon.code}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        {coupon.active ? (
                          <Badge className="bg-green-500 text-white">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                        {coupon.expiresAt && isExpired(coupon.expiresAt) && (
                          <Badge variant="destructive">Expirado</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        {coupon.type === "percentage" ? (
                          <Percent className="h-5 w-5 text-gold-500" />
                        ) : (
                          <DollarSign className="h-5 w-5 text-gold-500" />
                        )}
                        <span className="text-2xl font-bold text-gold-500">
                          {formatValue(coupon.type, coupon.value)}
                        </span>
                      </div>
                      
                      {coupon.expiresAt && (
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Expira em: {formatDate(coupon.expiresAt)}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Usado: {coupon.usedCount || 0} vez(es)</span>
                        {coupon.usageLimit && (
                          <span>Limite: {coupon.usageLimit}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEdit(coupon)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(coupon.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {coupons?.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Tag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                Nenhum cupom encontrado
              </h3>
              <p className="text-muted-foreground mb-4">
                Comece criando seu primeiro cupom de desconto.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
