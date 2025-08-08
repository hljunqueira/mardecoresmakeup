import { useState } from "react";
import { Link } from "wouter";
import { Search, Menu, X, Moon, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/hooks/use-theme";
import { BRAND_NAME } from "@/lib/constants";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { theme, toggleTheme } = useTheme();

  const navigation = [
    { name: "Início", href: "/" },
    { name: "Produtos", href: "/produtos" },
    { name: "Coleções", href: "/colecoes" },
    { name: "Contato", href: "/contato" },
  ];

  return (
    <header className="sticky top-0 z-50 glass-effect border-b border-border/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-petrol-500 rounded-lg flex items-center justify-center">
                <span className="text-gold-500 font-bold text-xl">M</span>
              </div>
              <span className="text-xl font-bold text-petrol-500 dark:text-gold-500">
                {BRAND_NAME}
              </span>
            </a>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link key={item.name} href={item.href}>
                <a className="hover:text-gold-500 transition-colors duration-200 font-medium">
                  {item.name}
                </a>
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            {/* Search - Desktop */}
            <div className="hidden sm:flex items-center bg-beige-100 dark:bg-petrol-800 rounded-full px-4 py-2">
              <Search className="h-4 w-4 text-muted-foreground mr-2" />
              <Input
                type="text"
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-sm outline-none w-40 lg:w-48 p-0 h-auto focus-visible:ring-0"
              />
            </div>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full hover:bg-beige-100 dark:hover:bg-petrol-800"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>

            {/* Admin Login */}
            <Link href="/admin/login">
              <Button
                variant="default"
                size="sm"
                className="hidden md:flex items-center space-x-2 bg-petrol-500 hover:bg-petrol-600 text-white rounded-full"
              >
                <User className="h-4 w-4" />
                <span>Admin</span>
              </Button>
            </Link>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden rounded-full hover:bg-beige-100 dark:hover:bg-petrol-800"
            >
              {isMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-background border-t border-border/20">
            {/* Mobile Search */}
            <div className="px-3 py-2">
              <div className="flex items-center bg-beige-100 dark:bg-petrol-800 rounded-full px-4 py-2">
                <Search className="h-4 w-4 text-muted-foreground mr-2" />
                <Input
                  type="text"
                  placeholder="Buscar produtos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-sm outline-none flex-1 p-0 h-auto focus-visible:ring-0"
                />
              </div>
            </div>

            {/* Mobile Navigation */}
            {navigation.map((item) => (
              <Link key={item.name} href={item.href}>
                <a
                  className="block px-3 py-2 rounded-md text-base font-medium hover:bg-beige-100 dark:hover:bg-petrol-800 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </a>
              </Link>
            ))}

            {/* Mobile Admin Login */}
            <Link href="/admin/login">
              <a
                className="block px-3 py-2 rounded-md text-base font-medium text-petrol-500 dark:text-gold-500 hover:bg-beige-100 dark:hover:bg-petrol-800 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Admin
              </a>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
