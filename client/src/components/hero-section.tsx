import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-petrol-500 via-petrol-600 to-petrol-700">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gold-500 rounded-full opacity-20 animate-float"></div>
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-gold-400 rounded-full opacity-15 animate-float [animation-delay:2s]"></div>
        <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-gold-600 rounded-full opacity-25 animate-float [animation-delay:4s]"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left animate-slide-up">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Sua beleza em{" "}
              <span className="text-gold-500">cores vibrantes</span>
            </h1>
            <p className="text-xl text-petrol-100 mb-8 max-w-lg mx-auto lg:mx-0">
              Descubra nossa coleção exclusiva de maquiagens e cosméticos premium que realçam sua beleza natural.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/produtos">
                <Button 
                  size="lg"
                  className="bg-gold-500 hover:bg-gold-600 text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  Explorar Produtos
                </Button>
              </Link>
              <Link href="/colecoes">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-white text-white hover:bg-white hover:text-petrol-500 px-8 py-4 rounded-full font-semibold transition-all duration-300"
                >
                  Ver Coleções
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative animate-slide-up [animation-delay:0.2s]">
            <div className="relative bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
              <img 
                src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600" 
                alt="Produtos de maquiagem elegantes organizados esteticamente" 
                className="rounded-2xl shadow-2xl w-full h-auto" 
              />
              <div className="absolute -bottom-4 -right-4 bg-gold-500 text-white px-6 py-3 rounded-full font-bold shadow-lg">
                Novidade!
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
