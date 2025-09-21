import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/constants";
import LogoTransp from "@assets/Logotranparente.png";
import { openWhatsApp } from "@/lib/whatsapp";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navigation = [
    { name: "Tudo por R$ 10", href: "/#tudo-por-10" },
    { name: "Produtos", href: "/produtos" },
  ];

  return (
    <header className={`sticky top-0 z-50 backdrop-blur-md ${isScrolled ? "bg-white/90 border-b shadow-sm" : "bg-white/70"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Esquerda: Logo + Navegação */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity" aria-label="Ir para a página inicial">
              <img src={LogoTransp} alt={BRAND_NAME} className="h-16 md:h-24 w-auto object-contain" />
            </Link>
            <nav className="hidden md:flex items-center space-x-6">
              {navigation.map((item) => {
                const active = location === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`font-medium transition-colors ${active ? "text-petrol-600 underline underline-offset-8" : "hover:text-gold-500"}`}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.name}
                    {item.name.includes("Tudo por R$ 10") && (
                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-gold-500 text-white align-middle">Promo</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Direita: Ações */}
          <div className="flex items-center space-x-3">

            <Button
              className="hidden md:inline-flex bg-green-500 hover:bg-green-600 text-white rounded-full"
              size="sm"
              onClick={() => openWhatsApp()}
              aria-label="Falar no WhatsApp"
            >
              <i className="fab fa-whatsapp"></i>
              <span className="ml-2">WhatsApp</span>
            </Button>

            {/* Admin removido do header; acesso via Links Rápidos no rodapé */}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden rounded-full hover:bg-beige-100"
              aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
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
        <div className="md:hidden fixed inset-0 bg-white z-40">
          <div className="px-4 pt-4 pb-6 space-y-1">

            {/* Mobile Navigation */}
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block px-3 py-3 rounded-md text-base font-medium hover:bg-beige-100 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}

            {/* Admin removido do menu mobile */}

            <div className="px-3 pt-2">
              <Button className="w-full bg-green-500 hover:bg-green-600 text-white rounded-full" onClick={() => { setIsMenuOpen(false); openWhatsApp(); }}>
                <i className="fab fa-whatsapp mr-2"></i>
                Falar no WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
