import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Package, 
  Layers, 
  Tag, 
  DollarSign, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { BRAND_NAME } from "@/lib/constants";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Produtos", href: "/admin/produtos", icon: Package },
  { name: "Coleções", href: "/admin/colecoes", icon: Layers },
  { name: "Cupons", href: "/admin/cupons", icon: Tag },
  { name: "Financeiro", href: "/admin/financeiro", icon: DollarSign },
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
      <div className="flex items-center space-x-3 p-6 border-b border-border">
        <div className="w-10 h-10 bg-petrol-500 rounded-lg flex items-center justify-center">
          <span className="text-gold-500 font-bold text-xl">M</span>
        </div>
        <span className="text-xl font-bold text-petrol-500 dark:text-gold-500">
          {BRAND_NAME}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <a
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                  isActive
                    ? "bg-petrol-500 text-white"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </a>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-border">
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
