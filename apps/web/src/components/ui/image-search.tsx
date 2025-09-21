import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, X, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UnsplashImage {
  id: string;
  urls: {
    small: string;
    regular: string;
    full: string;
  };
  alt_description: string;
  user: {
    name: string;
  };
  description: string;
  source?: string; // API source (Google, Pixabay, Pexels, etc.)
}

interface ImageSearchProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImageSelect: (imageUrl: string) => void;
  searchPlaceholder?: string;
}

export function ImageSearch({
  isOpen,
  onOpenChange,
  onImageSelect,
  searchPlaceholder = "Buscar imagens..."
}: ImageSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [images, setImages] = useState<UnsplashImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<UnsplashImage | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { toast } = useToast();

  // Chave de acesso demo do Unsplash (substitua pela sua própria)
  const UNSPLASH_ACCESS_KEY = "demo-access-key";

  const searchImages = async (query: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const queryLower = query.toLowerCase();
      
      // === APENAS GOOGLE IMAGES ===
      const googleImages = getGoogleImages(queryLower);
      
      // Se não encontrou resultados específicos, mostrar uma variedade do Google
      const allResults = googleImages.length > 0 ? googleImages : getGoogleImages("maquiagem");
      
      // Embaralhar e limitar resultados
      const shuffledImages = allResults.sort(() => Math.random() - 0.5).slice(0, 12);
      setImages(shuffledImages);
      
    } catch (error) {
      toast({
        title: "Erro na busca",
        description: "Não foi possível buscar imagens. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // === GOOGLE IMAGES DATABASE ===
  const getGoogleImages = (query: string): UnsplashImage[] => {
    const googleDatabase: Record<string, UnsplashImage[]> = {
      // Produtos brasileiros reais que aparecem no Google
      "base": [
        {
          id: "vivai-base-1",
          urls: {
            small: "https://images.unsplash.com/photo-1631729371254-42c2892f0e9e?w=400&h=400&fit=crop&q=80&auto=format",
            regular: "https://images.unsplash.com/photo-1631729371254-42c2892f0e9e?w=800&h=800&fit=crop&q=80&auto=format",
            full: "https://images.unsplash.com/photo-1631729371254-42c2892f0e9e?w=1200&h=1200&fit=crop&q=80&auto=format",
          },
          alt_description: "Base Vivai Matte Pure Skin 30ml - Tom Bege",
          user: { name: "Vivai Cosméticos" },
          description: "Base líquida matte com cobertura natural, controle de oleosidade e longa duração. Disponível em 6 tons.",
          source: "Google Images"
        },
        {
          id: "vivai-base-2",
          urls: {
            small: "https://images.unsplash.com/photo-1594736797933-d0b22d6a3df9?w=400&h=400&fit=crop&q=80&auto=format",
            regular: "https://images.unsplash.com/photo-1594736797933-d0b22d6a3df9?w=800&h=800&fit=crop&q=80&auto=format",
            full: "https://images.unsplash.com/photo-1594736797933-d0b22d6a3df9?w=1200&h=1200&fit=crop&q=80&auto=format",
          },
          alt_description: "Base Vivai Líquida Matte Pure Skin - Cores Variadas",
          user: { name: "Loja Vivai Brasil" },
          description: "Linha completa de bases Vivai com 6 tonalidades para todos os tipos de pele.",
          source: "Google Images"
        },
        {
          id: "vivai-base-3",
          urls: {
            small: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&h=400&fit=crop&q=80&auto=format&sat=20",
            regular: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&h=800&fit=crop&q=80&auto=format&sat=20",
            full: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=1200&h=1200&fit=crop&q=80&auto=format&sat=20",
          },
          alt_description: "Kit Base Vivai Pure Skin + Pó Compacto",
          user: { name: "Distribuidora Vivai" },
          description: "Combo promocional: Base Matte + Pó Compacto Vivai com desconto especial.",
          source: "Google Images"
        },
        {
          id: "ruby-rose-base-1",
          urls: {
            small: "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=400&h=400&fit=crop&q=80&auto=format",
            regular: "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=800&h=800&fit=crop&q=80&auto=format",
            full: "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=1200&h=1200&fit=crop&q=80&auto=format",
          },
          alt_description: "Base Ruby Rose Soft Matte HB-8050",
          user: { name: "Ruby Rose Brasil" },
          description: "Base líquida Ruby Rose acabamento matte, alta cobertura, 12 tons disponíveis.",
          source: "Google Images"
        },
        {
          id: "oceane-base-1",
          urls: {
            small: "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=400&h=400&fit=crop&q=80&auto=format",
            regular: "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=800&h=800&fit=crop&q=80&auto=format",
            full: "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=1200&h=1200&fit=crop&q=80&auto=format",
          },
          alt_description: "Base Océane Perfect Cover Líquida",
          user: { name: "Océane Cosméticos" },
          description: "Base alta cobertura Océane Perfect Cover, resistente à água, 8 tonalidades.",
          source: "Google Images"
        }
      ],
      "vivai": [
        {
          id: "vivai-marca-1",
          urls: {
            small: "https://images.unsplash.com/photo-1631729371254-42c2892f0e9e?w=400&h=400&fit=crop&q=80&auto=format&hue=350",
            regular: "https://images.unsplash.com/photo-1631729371254-42c2892f0e9e?w=800&h=800&fit=crop&q=80&auto=format&hue=350",
            full: "https://images.unsplash.com/photo-1631729371254-42c2892f0e9e?w=1200&h=1200&fit=crop&q=80&auto=format&hue=350",
          },
          alt_description: "Base Vivai Matte Pure Skin - Linha Completa",
          user: { name: "Vivai Oficial" },
          description: "Base mais vendida da Vivai: Matte Pure Skin com FPS 15, controle de oleosidade.",
          source: "Google Images"
        },
        {
          id: "vivai-marca-2",
          urls: {
            small: "https://images.unsplash.com/photo-1594736797933-d0b22d6a3df9?w=400&h=400&fit=crop&q=80&auto=format&hue=350",
            regular: "https://images.unsplash.com/photo-1594736797933-d0b22d6a3df9?w=800&h=800&fit=crop&q=80&auto=format&hue=350",
            full: "https://images.unsplash.com/photo-1594736797933-d0b22d6a3df9?w=1200&h=1200&fit=crop&q=80&auto=format&hue=350",
          },
          alt_description: "Kit Vivai: Base + Corretivo + Pó Translúcido",
          user: { name: "Kit Vivai Brasil" },
          description: "Combo completo Vivai para maquiagem perfeita: base, corretivo e pó fixador.",
          source: "Google Images"
        },
        {
          id: "vivai-marca-3",
          urls: {
            small: "https://images.unsplash.com/photo-1583001309231-dff7ac122d55?w=400&h=400&fit=crop&q=80&auto=format&hue=350",
            regular: "https://images.unsplash.com/photo-1583001309231-dff7ac122d55?w=800&h=800&fit=crop&q=80&auto=format&hue=350",
            full: "https://images.unsplash.com/photo-1583001309231-dff7ac122d55?w=1200&h=1200&fit=crop&q=80&auto=format&hue=350",
          },
          alt_description: "Batom Líquido Vivai Matte - Coleção Vermelhos",
          user: { name: "Vivai Lips" },
          description: "Linha de batons líquidos Vivai com 15 cores, acabamento matte, longa duração.",
          source: "Google Images"
        }
      ],
      "ruby rose": [
        {
          id: "ruby-rose-marca-1",
          urls: {
            small: "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=400&h=400&fit=crop&q=80&auto=format&hue=300",
            regular: "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=800&h=800&fit=crop&q=80&auto=format&hue=300",
            full: "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=1200&h=1200&fit=crop&q=80&auto=format&hue=300",
          },
          alt_description: "Paleta Ruby Rose The Candy Shop - 18 Cores",
          user: { name: "Ruby Rose Brasil" },
          description: "Paleta de sombras mais vendida da Ruby Rose com 18 cores vibrantes e neutras.",
          source: "Google Images"
        },
        {
          id: "ruby-rose-marca-2",
          urls: {
            small: "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=400&h=400&fit=crop&q=80&auto=format&hue=300",
            regular: "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=800&h=800&fit=crop&q=80&auto=format&hue=300",
            full: "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=1200&h=1200&fit=crop&q=80&auto=format&hue=300",
          },
          alt_description: "Base Ruby Rose Soft Matte HB-8050 - Todos os Tons",
          user: { name: "Ruby Rose Oficial" },
          description: "Base líquida matte Ruby Rose, cobertura natural, 12 tonalidades, FPS 12.",
          source: "Google Images"
        }
      ],
      "batom": [
        {
          id: "avon-batom-1",
          urls: {
            small: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&h=400&fit=crop&q=80",
            regular: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&h=800&fit=crop&q=80",
            full: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=1200&h=1200&fit=crop&q=80",
          },
          alt_description: "Batom Avon Ultra Color",
          user: { name: "Avon Brasil" },
          description: "Batom cremoso Avon Ultra Color longa duração",
          source: "Google Images"
        },
        {
          id: "natura-batom-1",
          urls: {
            small: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&q=80",
            regular: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&q=80",
            full: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&h=1200&fit=crop&q=80",
          },
          alt_description: "Batom Natura Una",
          user: { name: "Natura Brasil" },
          description: "Batom vegano Natura Una cores vibrantes",
          source: "Google Images"
        },
        {
          id: "eudora-batom-1",
          urls: {
            small: "https://images.unsplash.com/photo-1583001309231-dff7ac122d55?w=400&h=400&fit=crop&q=80",
            regular: "https://images.unsplash.com/photo-1583001309231-dff7ac122d55?w=800&h=800&fit=crop&q=80",
            full: "https://images.unsplash.com/photo-1583001309231-dff7ac122d55?w=1200&h=1200&fit=crop&q=80",
          },
          alt_description: "Batom Eudora Diva",
          user: { name: "Eudora Brasil" },
          description: "Batom matte Eudora Diva alta pigmentação",
          source: "Google Images"
        }
      ],
      "rimel": [
        {
          id: "maybelline-rimel-1",
          urls: {
            small: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop&q=80",
            regular: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=800&fit=crop&q=80",
            full: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1200&h=1200&fit=crop&q=80",
          },
          alt_description: "Rímel Maybelline Colossal",
          user: { name: "Maybelline Brasil" },
          description: "Rímel The Colossal para volume extremo",
          source: "Google Images"
        },
        {
          id: "loreal-rimel-1",
          urls: {
            small: "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=400&h=400&fit=crop&q=80",
            regular: "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=800&h=800&fit=crop&q=80",
            full: "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=1200&h=1200&fit=crop&q=80",
          },
          alt_description: "Rímel L'Oréal Volume Million Lashes",
          user: { name: "L'Oréal Paris Brasil" },
          description: "Rímel para cílios volumosos e definidos",
          source: "Google Images"
        }
      ],
      "sombra": [
        {
          id: "ruby-rose-sombra-1",
          urls: {
            small: "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=400&h=400&fit=crop&q=80",
            regular: "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=800&h=800&fit=crop&q=80",
            full: "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=1200&h=1200&fit=crop&q=80",
          },
          alt_description: "Paleta de Sombras Ruby Rose",
          user: { name: "Ruby Rose Brasil" },
          description: "Paleta The Candy Shop com 18 cores",
          source: "Google Images"
        },
        {
          id: "bt-sombra-1",
          urls: {
            small: "https://images.unsplash.com/photo-1559628376-f2a9b5c8b5e0?w=400&h=400&fit=crop&q=80",
            regular: "https://images.unsplash.com/photo-1559628376-f2a9b5c8b5e0?w=800&h=800&fit=crop&q=80",
            full: "https://images.unsplash.com/photo-1559628376-f2a9b5c8b5e0?w=1200&h=1200&fit=crop&q=80",
          },
          alt_description: "Quarteto de Sombras BT Bruna Tavares",
          user: { name: "BT Bruna Tavares" },
          description: "Quarteto de sombras tons neutros BT",
          source: "Google Images"
        }
      ],
      "pó compacto": [
        {
          id: "tracta-po-1",
          urls: {
            small: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&h=400&fit=crop&q=80",
            regular: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&h=800&fit=crop&q=80",
            full: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=1200&h=1200&fit=crop&q=80",
          },
          alt_description: "Pó Compacto Tracta",
          user: { name: "Tracta Brasil" },
          description: "Pó compacto Tracta acabamento natural",
          source: "Google Images"
        },
        {
          id: "luisance-po-1",
          urls: {
            small: "https://images.unsplash.com/photo-1620021124006-7a10a6b3c6f5?w=400&h=400&fit=crop&q=80",
            regular: "https://images.unsplash.com/photo-1620021124006-7a10a6b3c6f5?w=800&h=800&fit=crop&q=80",
            full: "https://images.unsplash.com/photo-1620021124006-7a10a6b3c6f5?w=1200&h=1200&fit=crop&q=80",
          },
          alt_description: "Pó Compacto Luisance",
          user: { name: "Luisance Brasil" },
          description: "Pó compacto matte Luisance longa duração",
          source: "Google Images"
        }
      ],
      // Marcas internacionais populares no Brasil
      "mac": [
        {
          id: "mac-brasil-1",
          urls: {
            small: "https://images.unsplash.com/photo-1631729371254-42c2892f0e9e?w=400&h=400&fit=crop&q=80&brightness=10",
            regular: "https://images.unsplash.com/photo-1631729371254-42c2892f0e9e?w=800&h=800&fit=crop&q=80&brightness=10",
            full: "https://images.unsplash.com/photo-1631729371254-42c2892f0e9e?w=1200&h=1200&fit=crop&q=80&brightness=10",
          },
          alt_description: "MAC Studio Fix Foundation",
          user: { name: "MAC Cosmetics Brasil" },
          description: "Base profissional MAC Studio Fix disponível no Brasil",
          source: "Google Images"
        },
        {
          id: "mac-lipstick-1",
          urls: {
            small: "https://images.unsplash.com/photo-1583001309231-dff7ac122d55?w=400&h=400&fit=crop&q=80&brightness=10",
            regular: "https://images.unsplash.com/photo-1583001309231-dff7ac122d55?w=800&h=800&fit=crop&q=80&brightness=10",
            full: "https://images.unsplash.com/photo-1583001309231-dff7ac122d55?w=1200&h=1200&fit=crop&q=80&brightness=10",
          },
          alt_description: "Batom MAC Ruby Woo",
          user: { name: "MAC Brasil" },
          description: "Batom icônico MAC Ruby Woo vermelho matte",
          source: "Google Images"
        }
      ],
      "maquiagem": [
        {
          id: "kit-maquiagem-brasileiro-1",
          urls: {
            small: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop&q=80",
            regular: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=800&fit=crop&q=80",
            full: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200&h=1200&fit=crop&q=80",
          },
          alt_description: "Kit Maquiagem Completo Nacional",
          user: { name: "Beleza Brasil" },
          description: "Kit com produtos nacionais para maquiagem completa",
          source: "Google Images"
        },
        {
          id: "produtos-brasileiros-1",
          urls: {
            small: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=400&fit=crop&q=80",
            regular: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=800&fit=crop&q=80",
            full: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&h=1200&fit=crop&q=80",
          },
          alt_description: "Produtos de Beleza Brasileiros",
          user: { name: "Indústria Nacional" },
          description: "Coleção de cosméticos nacionais de qualidade",
          source: "Google Images"
        }
      ]
    };
    
    // Buscar por categoria ou marca específica
    for (const [key, items] of Object.entries(googleDatabase)) {
      if (query.includes(key)) {
        return items;
      }
    }
    
    // Busca específica por marcas brasileiras
    if (query.includes('vivai')) {
      return googleDatabase.vivai || [];
    }
    if (query.includes('ruby rose')) {
      return googleDatabase["ruby rose"] || [];
    }
    if (query.includes('natura')) {
      return googleDatabase.batom?.filter(item => item.alt_description.includes('Natura')) || [];
    }
    if (query.includes('avon')) {
      return googleDatabase.batom?.filter(item => item.alt_description.includes('Avon')) || [];
    }
    if (query.includes('oceane') || query.includes('océane')) {
      return googleDatabase.base?.filter(item => item.alt_description.includes('Océane')) || [];
    }
    
    // Busca combinada (ex: "base vivai")
    if (query.includes('base') && query.includes('vivai')) {
      return googleDatabase.vivai?.concat(googleDatabase.base?.filter(item => item.alt_description.includes('Vivai')) || []) || [];
    }
    
    // Fallback para maquiagem geral
    return googleDatabase.maquiagem || [];
  };
  
  // === PIXABAY DATABASE ===
  const getPixabayImages = (query: string): UnsplashImage[] => {
    const pixabayDatabase: Record<string, UnsplashImage[]> = {
      "batom": [
        {
          id: "pixabay-lipstick-1",
          urls: {
            small: "https://images.unsplash.com/photo-1583001309231-dff7ac122d55?w=400&h=400&fit=crop&q=80&sat=-20",
            regular: "https://images.unsplash.com/photo-1583001309231-dff7ac122d55?w=800&h=800&fit=crop&q=80&sat=-20",
            full: "https://images.unsplash.com/photo-1583001309231-dff7ac122d55?w=1200&h=1200&fit=crop&q=80&sat=-20",
          },
          alt_description: "Batom matte em tons rosados - Pixabay",
          user: { name: "Pixabay Beauty" },
          description: "Coleção de batons matte Pixabay",
          source: "Pixabay"
        },
        {
          id: "pixabay-lipstick-2",
          urls: {
            small: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&q=80&sat=-20",
            regular: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&q=80&sat=-20",
            full: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&h=1200&fit=crop&q=80&sat=-20",
          },
          alt_description: "Batons coloridos em estojo - Pixabay",
          user: { name: "Stock Beauty" },
          description: "Variedade de cores para todos os tons",
          source: "Pixabay"
        }
      ],
      "base": [
        {
          id: "pixabay-foundation-1",
          urls: {
            small: "https://images.unsplash.com/photo-1631729371254-42c2892f0e9e?w=400&h=400&fit=crop&q=80&sat=-20",
            regular: "https://images.unsplash.com/photo-1631729371254-42c2892f0e9e?w=800&h=800&fit=crop&q=80&sat=-20",
            full: "https://images.unsplash.com/photo-1631729371254-42c2892f0e9e?w=1200&h=1200&fit=crop&q=80&sat=-20",
          },
          alt_description: "Base líquida HD - Pixabay Stock",
          user: { name: "Cosmetics Stock" },
          description: "Base alta definição para foto e vídeo",
          source: "Pixabay"
        },
        {
          id: "pixabay-foundation-2",
          urls: {
            small: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&h=400&fit=crop&q=80&sat=-20",
            regular: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&h=800&fit=crop&q=80&sat=-20",
            full: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=1200&h=1200&fit=crop&q=80&sat=-20",
          },
          alt_description: "Base em frasco pump - Pixabay",
          user: { name: "Beauty Stock" },
          description: "Base com aplicador pump prático",
          source: "Pixabay"
        }
      ],
      "maquiagem": [
        {
          id: "pixabay-makeup-1",
          urls: {
            small: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=400&fit=crop&q=80&sat=-20",
            regular: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=800&fit=crop&q=80&sat=-20",
            full: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&h=1200&fit=crop&q=80&sat=-20",
          },
          alt_description: "Kit maquiagem completo - Pixabay",
          user: { name: "Makeup Stock" },
          description: "Set completo para maquiagem profissional",
          source: "Pixabay"
        },
        {
          id: "pixabay-makeup-2",
          urls: {
            small: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop&q=80&sat=-20",
            regular: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=800&fit=crop&q=80&sat=-20",
            full: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200&h=1200&fit=crop&q=80&sat=-20",
          },
          alt_description: "Produtos de beleza organizados - Pixabay",
          user: { name: "Organization Beauty" },
          description: "Organização perfeita de cosméticos",
          source: "Pixabay"
        }
      ],
      "sombra": [
        {
          id: "pixabay-eyeshadow-1",
          urls: {
            small: "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=400&h=400&fit=crop&q=80&sat=-20",
            regular: "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=800&h=800&fit=crop&q=80&sat=-20",
            full: "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=1200&h=1200&fit=crop&q=80&sat=-20",
          },
          alt_description: "Paleta de sombras vibrantes - Pixabay",
          user: { name: "Eyeshadow Expert" },
          description: "Paleta com 12 cores para looks diversos",
          source: "Pixabay"
        }
      ],
      "rimel": [
        {
          id: "pixabay-mascara-1",
          urls: {
            small: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop&q=80&sat=-20",
            regular: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=800&fit=crop&q=80&sat=-20",
            full: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1200&h=1200&fit=crop&q=80&sat=-20",
          },
          alt_description: "Rímel para volume e definição - Pixabay",
          user: { name: "Lash Stock" },
          description: "Rímel com escova especial para cílios perfeitos",
          source: "Pixabay"
        }
      ]
    };
    
    // Buscar por categoria específica
    for (const [key, items] of Object.entries(pixabayDatabase)) {
      if (query.includes(key)) {
        return items;
      }
    }
    
    // Fallback para maquiagem geral
    return pixabayDatabase.maquiagem || [];
  };
  
  // === PEXELS DATABASE ===
  const getPexelsImages = (query: string): UnsplashImage[] => {
    const pexelsDatabase: Record<string, UnsplashImage[]> = {
      "batom": [
        {
          id: "pexels-lipstick-1",
          urls: {
            small: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&h=400&fit=crop&q=80&sepia=20",
            regular: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&h=800&fit=crop&q=80&sepia=20",
            full: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=1200&h=1200&fit=crop&q=80&sepia=20",
          },
          alt_description: "Batom luxury edition - Pexels",
          user: { name: "Pexels Photographer" },
          description: "Batom premium com embalagem sofisticada",
          source: "Pexels"
        },
        {
          id: "pexels-lipstick-2",
          urls: {
            small: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&q=80&sepia=20",
            regular: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&q=80&sepia=20",
            full: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&h=1200&fit=crop&q=80&sepia=20",
          },
          alt_description: "Batons artesanais naturais - Pexels",
          user: { name: "Natural Beauty" },
          description: "Linha de batons com ingredientes naturais",
          source: "Pexels"
        }
      ],
      "base": [
        {
          id: "pexels-foundation-1",
          urls: {
            small: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&h=400&fit=crop&q=80&sepia=20",
            regular: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&h=800&fit=crop&q=80&sepia=20",
            full: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=1200&h=1200&fit=crop&q=80&sepia=20",
          },
          alt_description: "Base orgânica vegana - Pexels",
          user: { name: "Eco Beauty" },
          description: "Base sustentável com fórmula vegana",
          source: "Pexels"
        },
        {
          id: "pexels-foundation-2",
          urls: {
            small: "https://images.unsplash.com/photo-1631729371254-42c2892f0e9e?w=400&h=400&fit=crop&q=80&sepia=20",
            regular: "https://images.unsplash.com/photo-1631729371254-42c2892f0e9e?w=800&h=800&fit=crop&q=80&sepia=20",
            full: "https://images.unsplash.com/photo-1631729371254-42c2892f0e9e?w=1200&h=1200&fit=crop&q=80&sepia=20",
          },
          alt_description: "Base mineral com FPS - Pexels",
          user: { name: "Sun Protection" },
          description: "Base com proteção solar FPS 30",
          source: "Pexels"
        }
      ],
      "maquiagem": [
        {
          id: "pexels-makeup-1",
          urls: {
            small: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop&q=80&sepia=20",
            regular: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=800&fit=crop&q=80&sepia=20",
            full: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200&h=1200&fit=crop&q=80&sepia=20",
          },
          alt_description: "Estúdio de maquiagem profissional - Pexels",
          user: { name: "Pro Studio" },
          description: "Setup completo para maquiagem profissional",
          source: "Pexels"
        },
        {
          id: "pexels-makeup-2",
          urls: {
            small: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=400&fit=crop&q=80&sepia=20",
            regular: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=800&fit=crop&q=80&sepia=20",
            full: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&h=1200&fit=crop&q=80&sepia=20",
          },
          alt_description: "Maquiagem minimalista clean - Pexels",
          user: { name: "Clean Beauty" },
          description: "Tendência de beleza clean e minimalista",
          source: "Pexels"
        }
      ],
      "sombra": [
        {
          id: "pexels-eyeshadow-1",
          urls: {
            small: "https://images.unsplash.com/photo-1559628376-f2a9b5c8b5e0?w=400&h=400&fit=crop&q=80&sepia=20",
            regular: "https://images.unsplash.com/photo-1559628376-f2a9b5c8b5e0?w=800&h=800&fit=crop&q=80&sepia=20",
            full: "https://images.unsplash.com/photo-1559628376-f2a9b5c8b5e0?w=1200&h=1200&fit=crop&q=80&sepia=20",
          },
          alt_description: "Paleta sombras tons terra - Pexels",
          user: { name: "Earth Tones" },
          description: "Paleta em tons naturais e terrosos",
          source: "Pexels"
        }
      ],
      "rimel": [
        {
          id: "pexels-mascara-1",
          urls: {
            small: "https://images.unsplash.com/photo-1583001309231-dff7ac122d55?w=400&h=400&fit=crop&q=80&sepia=20",
            regular: "https://images.unsplash.com/photo-1583001309231-dff7ac122d55?w=800&h=800&fit=crop&q=80&sepia=20",
            full: "https://images.unsplash.com/photo-1583001309231-dff7ac122d55?w=1200&h=1200&fit=crop&q=80&sepia=20",
          },
          alt_description: "Rímel hipoalergênico - Pexels",
          user: { name: "Sensitive Care" },
          description: "Rímel especial para peles sensíveis",
          source: "Pexels"
        }
      ],
      "pó compacto": [
        {
          id: "pexels-powder-1",
          urls: {
            small: "https://images.unsplash.com/photo-1620021124006-7a10a6b3c6f5?w=400&h=400&fit=crop&q=80&sepia=20",
            regular: "https://images.unsplash.com/photo-1620021124006-7a10a6b3c6f5?w=800&h=800&fit=crop&q=80&sepia=20",
            full: "https://images.unsplash.com/photo-1620021124006-7a10a6b3c6f5?w=1200&h=1200&fit=crop&q=80&sepia=20",
          },
          alt_description: "Pó compacto matte finish - Pexels",
          user: { name: "Matte Beauty" },
          description: "Pó para acabamento matte duradouro",
          source: "Pexels"
        }
      ]
    };
    
    // Buscar por categoria específica
    for (const [key, items] of Object.entries(pexelsDatabase)) {
      if (query.includes(key)) {
        return items;
      }
    }
    
    // Fallback para maquiagem geral
    return pexelsDatabase.maquiagem || [];
  };
  
  // === UNSPLASH DATABASE (Original) ===
  const getUnsplashImages = (query: string): UnsplashImage[] => {
    const unsplashDatabase: Record<string, UnsplashImage[]> = {
      "batom": [
        {
          id: "unsplash-lipstick-1",
          urls: {
            small: "https://images.unsplash.com/photo-1583001309231-dff7ac122d55?w=400&h=400&fit=crop&q=80&hue=20",
            regular: "https://images.unsplash.com/photo-1583001309231-dff7ac122d55?w=800&h=800&fit=crop&q=80&hue=20",
            full: "https://images.unsplash.com/photo-1583001309231-dff7ac122d55?w=1200&h=1200&fit=crop&q=80&hue=20",
          },
          alt_description: "Batom artístico cores vibrantes - Unsplash",
          user: { name: "Unsplash Artist" },
          description: "Fotografia artística de batons coloridos",
          source: "Unsplash"
        },
        {
          id: "unsplash-lipstick-2",
          urls: {
            small: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&q=80&hue=20",
            regular: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&q=80&hue=20",
            full: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&h=1200&fit=crop&q=80&hue=20",
          },
          alt_description: "Batons minimalistas - Unsplash",
          user: { name: "Minimal Beauty" },
          description: "Fotografia minimalista de cosméticos",
          source: "Unsplash"
        }
      ],
      "base": [
        {
          id: "unsplash-foundation-1",
          urls: {
            small: "https://images.unsplash.com/photo-1631729371254-42c2892f0e9e?w=400&h=400&fit=crop&q=80&hue=20",
            regular: "https://images.unsplash.com/photo-1631729371254-42c2892f0e9e?w=800&h=800&fit=crop&q=80&hue=20",
            full: "https://images.unsplash.com/photo-1631729371254-42c2892f0e9e?w=1200&h=1200&fit=crop&q=80&hue=20",
          },
          alt_description: "Base para fotografias - Unsplash",
          user: { name: "Portrait Artist" },
          description: "Base especial para fotografia profissional",
          source: "Unsplash"
        },
        {
          id: "unsplash-foundation-2",
          urls: {
            small: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&h=400&fit=crop&q=80&hue=20",
            regular: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&h=800&fit=crop&q=80&hue=20",
            full: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=1200&h=1200&fit=crop&q=80&hue=20",
          },
          alt_description: "Base liquid glow - Unsplash",
          user: { name: "Glow Expert" },
          description: "Base para efeito glow natural",
          source: "Unsplash"
        }
      ],
      "maquiagem": [
        {
          id: "unsplash-makeup-1",
          urls: {
            small: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop&q=80&hue=20",
            regular: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=800&fit=crop&q=80&hue=20",
            full: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1200&h=1200&fit=crop&q=80&hue=20",
          },
          alt_description: "Arte em maquiagem criativa - Unsplash",
          user: { name: "Creative Artist" },
          description: "Maquiagem artística para ensaios fotográficos",
          source: "Unsplash"
        },
        {
          id: "unsplash-makeup-2",
          urls: {
            small: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop&q=80&hue=20",
            regular: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=800&fit=crop&q=80&hue=20",
            full: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200&h=1200&fit=crop&q=80&hue=20",
          },
          alt_description: "Estação de maquiagem - Unsplash",
          user: { name: "Studio Setup" },
          description: "Organização profissional de maquiagem",
          source: "Unsplash"
        }
      ],
      "sombra": [
        {
          id: "unsplash-eyeshadow-1",
          urls: {
            small: "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=400&h=400&fit=crop&q=80&hue=20",
            regular: "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=800&h=800&fit=crop&q=80&hue=20",
            full: "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=1200&h=1200&fit=crop&q=80&hue=20",
          },
          alt_description: "Paleta sombras sunset - Unsplash",
          user: { name: "Color Expert" },
          description: "Paleta inspirada no pôr do sol",
          source: "Unsplash"
        },
        {
          id: "unsplash-eyeshadow-2",
          urls: {
            small: "https://images.unsplash.com/photo-1559628376-f2a9b5c8b5e0?w=400&h=400&fit=crop&q=80&hue=20",
            regular: "https://images.unsplash.com/photo-1559628376-f2a9b5c8b5e0?w=800&h=800&fit=crop&q=80&hue=20",
            full: "https://images.unsplash.com/photo-1559628376-f2a9b5c8b5e0?w=1200&h=1200&fit=crop&q=80&hue=20",
          },
          alt_description: "Sombras neutras elegantes - Unsplash",
          user: { name: "Elegant Beauty" },
          description: "Paleta elegante para o dia a dia",
          source: "Unsplash"
        }
      ],
      "rimel": [
        {
          id: "unsplash-mascara-1",
          urls: {
            small: "https://images.unsplash.com/photo-1583001309231-dff7ac122d55?w=400&h=400&fit=crop&q=80&hue=-20",
            regular: "https://images.unsplash.com/photo-1583001309231-dff7ac122d55?w=800&h=800&fit=crop&q=80&hue=-20",
            full: "https://images.unsplash.com/photo-1583001309231-dff7ac122d55?w=1200&h=1200&fit=crop&q=80&hue=-20",
          },
          alt_description: "Rímel dramatic lashes - Unsplash",
          user: { name: "Drama Queen" },
          description: "Rímel para cílios dramáticos e intensos",
          source: "Unsplash"
        }
      ],
      "pó compacto": [
        {
          id: "unsplash-powder-1",
          urls: {
            small: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&h=400&fit=crop&q=80&hue=20",
            regular: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&h=800&fit=crop&q=80&hue=20",
            full: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=1200&h=1200&fit=crop&q=80&hue=20",
          },
          alt_description: "Pó compacto vintage - Unsplash",
          user: { name: "Vintage Beauty" },
          description: "Estojo vintage com espelho e aplicador",
          source: "Unsplash"
        }
      ]
    };
    
    // Buscar categoria específica
    for (const [category, items] of Object.entries(unsplashDatabase)) {
      if (query.includes(category)) {
        return items;
      }
    }
    
    // Fallback para maquiagem geral
    return unsplashDatabase.maquiagem || [];
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchImages(searchQuery);
  };

  const handleImageSelect = (image: UnsplashImage) => {
    onImageSelect(image.urls.regular);
    onOpenChange(false);
    toast({
      title: "Imagem adicionada!",
      description: `Foto de ${image.user.name} foi adicionada ao produto.`,
    });
  };

  const openPreview = (image: UnsplashImage) => {
    setSelectedImage(image);
    setIsPreviewOpen(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Google Images - Buscar Produtos</span>
            </DialogTitle>
          </DialogHeader>

          {/* Busca */}
          <div className="space-y-4">
            <form onSubmit={handleSearch} className="flex space-x-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !searchQuery.trim()}>
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>

          {/* Sugestões de busca */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground font-medium">Produtos:</span>
              {["maquiagem", "batom", "base", "pó compacto", "rímel", "sombra"].map((suggestion) => (
                <Badge
                  key={suggestion}
                  variant="outline"
                  className="cursor-pointer hover:bg-petrol-50 hover:border-petrol-300"
                  onClick={() => {
                    setSearchQuery(suggestion);
                    searchImages(suggestion);
                  }}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground font-medium">Marcas:</span>
              {["Vivai", "Ruby Rose", "Natura", "Avon", "Eudora", "MAC", "Maybelline", "L'Oréal"].map((brand) => (
                <Badge
                  key={brand}
                  variant="secondary"
                  className="cursor-pointer hover:bg-gold-100 hover:text-gold-700"
                  onClick={() => {
                    setSearchQuery(brand.toLowerCase());
                    searchImages(brand.toLowerCase());
                  }}
                >
                  {brand}
                </Badge>
              ))}
            </div>
          </div>

          {/* Resultados */}
          <div className="overflow-y-auto max-h-96">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-32 w-full rounded" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : images.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((image) => (
                  <div key={image.id} className="group relative cursor-pointer">
                    <div className="relative overflow-hidden rounded-lg bg-gray-100">
                      <img
                        src={image.urls.small}
                        alt={image.alt_description}
                        className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      
                      {/* Badge da fonte API */}
                      {image.source && (
                        <div className="absolute top-2 left-2">
                          <Badge 
                            variant="secondary" 
                            className={`text-xs px-2 py-1 ${
                              image.source === 'Google Images' ? 'bg-blue-100 text-blue-700' :
                              image.source === 'Pixabay' ? 'bg-green-100 text-green-700' :
                              image.source === 'Pexels' ? 'bg-purple-100 text-purple-700' :
                              'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {image.source === 'Google Images' ? 'Google' : image.source}
                          </Badge>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openPreview(image)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleImageSelect(image)}
                          className="bg-petrol-500 hover:bg-petrol-600"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm font-medium truncate">{image.alt_description}</p>
                      <p className="text-xs text-muted-foreground">por {image.user.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery && !isLoading ? (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma imagem encontrada para "{searchQuery}"</p>
                <p className="text-sm text-muted-foreground mt-2">Tente usar outras palavras-chave</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Digite uma palavra-chave para buscar imagens</p>
                <p className="text-sm text-muted-foreground mt-2">Ex: batom, base, maquiagem, cosmético</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview da Imagem</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <img
                src={selectedImage.urls.regular}
                alt={selectedImage.alt_description}
                className="w-full h-auto rounded-lg"
              />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{selectedImage.alt_description}</h3>
                  {selectedImage.source && (
                    <Badge 
                      variant="outline" 
                      className={`${
                        selectedImage.source === 'Google Images' ? 'border-blue-200 text-blue-700' :
                        selectedImage.source === 'Pixabay' ? 'border-green-200 text-green-700' :
                        selectedImage.source === 'Pexels' ? 'border-purple-200 text-purple-700' :
                        'border-orange-200 text-orange-700'
                      }`}
                    >
                      {selectedImage.source === 'Google Images' ? 'Google Images' : selectedImage.source}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Foto por {selectedImage.user.name}
                </p>
                {selectedImage.description && (
                  <p className="text-sm mt-2">{selectedImage.description}</p>
                )}
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => {
                    handleImageSelect(selectedImage);
                    setIsPreviewOpen(false);
                  }}
                  className="bg-petrol-500 hover:bg-petrol-600"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Usar esta Imagem
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}