import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Package, 
  DollarSign, 
  BarChart3,
  LogOut,
  Menu,
  X,
  Home,
  CreditCard,
  MessageCircle,
  Users,
  FileText
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { BRAND_NAME } from "@/lib/constants";
import LogoTransp from "@assets/Logotranparente.png";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Produtos", href: "/admin/produtos", icon: Package },
  { name: "Crediário", href: "/admin/reservas", icon: CreditCard },
  { name: "Solicitações", href: "/admin/solicitacoes", icon: MessageCircle },
  { name: "Financeiro", href: "/admin/financeiro", icon: DollarSign },
  { name: "Relatórios", href: "/admin/relatorios", icon: BarChart3 },
];

export default function AdminSidebar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { logout } = useAdminAuth();

  const handleLogout = () => {
    logout();
    window.location.href = "/admin/login";
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-center p-6 border-b border-border">
        <img src={LogoTransp} alt={BRAND_NAME} className="h-20 w-auto object-contain" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 cursor-pointer ${
                  isActive
                    ? "bg-petrol-500 text-white"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Logout e Voltar ao Site */}
      <div className="p-4 border-t border-border space-y-2">
        <Link href="/">
          <div className="flex items-center space-x-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-200 cursor-pointer">
            <Home className="h-5 w-5" />
            <span className="font-medium">Voltar ao Site</span>
          </div>
        </Link>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sair
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative flex flex-col w-64 bg-background border-r border-border shadow-xl">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-background border-r border-border">
        <SidebarContent />
      </div>
    </>
  );
}
