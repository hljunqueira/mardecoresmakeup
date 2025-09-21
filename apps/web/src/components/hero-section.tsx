import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import FlipWords from "@/components/ui/flip-words";
import SeloTransp from "@assets/selo (1).png";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white">

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left animate-slide-up">
            <img src={SeloTransp} alt="Selo Makeup Pro 2025" className="h-20 w-20 md:h-24 md:w-24 lg:h-28 lg:w-28 object-contain -mt-3 md:-mt-4 lg:-mt-6 mb-2 ml-24 md:ml-36 lg:ml-40" />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-petrol-700 mb-6 leading-tight tracking-tight">
              Sua beleza em {" "}
              <span className="bg-gradient-to-r from-petrol-500 via-petrol-500 to-gold-500 bg-clip-text text-transparent md:hover:[text-shadow:_0_0_1px_rgba(0,0,0,0.15)] transition-all">
                <FlipWords words={["cores vibrantes", "tons intensos", "acabamentos únicos"]} />
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0">
              Descubra nossa coleção exclusiva de maquiagens e cosméticos premium que realçam sua beleza natural.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/produtos">
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-petrol-600 via-petrol-500 to-gold-500 text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-[0_0_30px_rgba(212,175,55,0.45)]"
                >
                  Explorar Produtos
                </Button>
              </Link>
              <Link href="/colecoes">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-petrol-300 text-petrol-600 hover:bg-petrol-50 hover:text-petrol-700 px-8 py-4 rounded-full font-semibold transition-all duration-300 shadow-sm"
                >
                  Ver Coleções
                </Button>
              </Link>
            </div>
            {/* Métricas removidas conforme solicitado */}
          </div>

          <div className="relative animate-slide-up [animation-delay:0.2s]">
            {/* Card da imagem */}
            <div className="relative overflow-hidden rounded-3xl p-[2px] bg-gradient-to-br from-petrol-50 via-white to-gold-50 ring-1 ring-gray-200 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.35)]">
              <div className="rounded-[1.45rem] overflow-hidden bg-white">
                <img
                  src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80"
                  alt="Produtos de maquiagem elegantes organizados esteticamente"
                  className="w-full h-[360px] sm:h-[420px] lg:h-[520px] object-cover"
                />
              </div>
              {/* etiqueta removida */}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
