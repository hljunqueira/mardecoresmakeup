import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { apiRequest } from "@/lib/queryClient";
import { BRAND_NAME } from "@/lib/constants";
import { Eye, EyeOff, User, Lock } from "lucide-react";

const loginSchema = z.object({
  username: z.string().email("Digite um email válido"),
  password: z.string().min(1, "Digite sua senha"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { login } = useAdminAuth();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("POST", "/api/admin/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      login(data.user);
      toast({
        title: "Login realizado com sucesso!",
        description: "Redirecionando para o painel admin...",
      });
      setLocation("/admin");
    },
    onError: (error) => {
      toast({
        title: "Erro no login",
        description: error.message || "Credenciais inválidas",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-petrol-500 via-petrol-600 to-petrol-700 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gold-500 rounded-full opacity-20 animate-float"></div>
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-gold-400 rounded-full opacity-15 animate-float [animation-delay:2s]"></div>
        <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-gold-600 rounded-full opacity-25 animate-float [animation-delay:4s]"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 bg-white/95 dark:bg-petrol-800/95 backdrop-blur-sm border-white/20">
        <CardHeader className="text-center pb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-petrol-500 rounded-lg flex items-center justify-center">
              <span className="text-gold-500 font-bold text-xl">M</span>
            </div>
            <span className="text-2xl font-bold text-petrol-500 dark:text-gold-500">
              {BRAND_NAME}
            </span>
          </div>
          <CardTitle className="text-2xl font-bold text-petrol-500 dark:text-gold-500">
            Painel Administrativo
          </CardTitle>
          <p className="text-muted-foreground">
            Faça login para acessar o painel de controle
          </p>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="admin@mardecores.com"
                          className="pl-10 rounded-xl border-gray-300 dark:border-petrol-600"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Digite sua senha"
                          className="pl-10 pr-10 rounded-xl border-gray-300 dark:border-petrol-600"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-petrol-500 hover:bg-petrol-600 text-white rounded-xl py-3 font-semibold transition-all duration-300 transform hover:scale-105"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Entrando...
                  </div>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Credenciais de teste: admin@mardecores.com / admin123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
