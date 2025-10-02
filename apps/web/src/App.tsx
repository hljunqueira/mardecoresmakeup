import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Products from "@/pages/products";
import Collections from "@/pages/collections";
import ProductDetail from "@/pages/product-detail";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminProducts from "@/pages/admin/products";
import AdminOrders from "@/pages/admin/orders";
import AdminCrediario from "@/pages/admin/crediario";
import AdminCollections from "@/pages/admin/collections";
import AdminCoupons from "@/pages/admin/coupons";
import AdminFinancial from "@/pages/admin/financial";
import AdminReports from "@/pages/admin/reports";
import AdminProductRequests from "@/pages/admin/product-requests";
import AdminReviews from "@/pages/admin/reviews";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/produtos" component={Products} />
      <Route path="/colecoes" component={Collections} />
      <Route path="/produto/:id" component={ProductDetail} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/produtos" component={AdminProducts} />
      <Route path="/admin/pedidos" component={AdminOrders} />
      <Route path="/admin/crediario" component={AdminCrediario} />
      <Route path="/admin/colecoes" component={AdminCollections} />
      <Route path="/admin/cupons" component={AdminCoupons} />
      <Route path="/admin/financeiro" component={AdminFinancial} />
      <Route path="/admin/relatorios" component={AdminReports} />
      <Route path="/admin/solicitacoes" component={AdminProductRequests} />
      <Route path="/admin/avaliacoes" component={AdminReviews} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
