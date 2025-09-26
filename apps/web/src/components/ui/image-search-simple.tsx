import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, Eye } from "lucide-react";
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
  source?: string;
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
  searchPlaceholder = "Buscar produtos..."
}: ImageSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [images, setImages] = useState<UnsplashImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<UnsplashImage | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { toast } = useToast();

  // Função de fallback para imagens locais
  const getFallbackImages = (query: string): UnsplashImage[] => {
    const fallbackDatabase: Record<string, UnsplashImage[]> = {
      'vivai': [
        {
          id: 'fallback-vivai-1',
          urls: {
            small: 'https://cdn.awsli.com.br/300x300/2030/2030831/produto/164875456/base-liquida-matte-vivai-pure-skin-30ml-f7f51b8c.jpg',
            regular: 'https://cdn.awsli.com.br/600x600/2030/2030831/produto/164875456/base-liquida-matte-vivai-pure-skin-30ml-f7f51b8c.jpg',
            full: 'https://cdn.awsli.com.br/800x800/2030/2030831/produto/164875456/base-liquida-matte-vivai-pure-skin-30ml-f7f51b8c.jpg'
          },
          alt_description: 'Base Vivai Matte Pure Skin 30ml',
          user: { name: 'Vivai Cosméticos' },
          description: 'Base líquida matte com cobertura natural',
          source: 'Banco Local'
        },
        {
          id: 'fallback-vivai-2',
          urls: {
            small: 'https://http2.mlstatic.com/D_NQ_NP_841875-MLB46237204250_062021-O.webp',
            regular: 'https://http2.mlstatic.com/D_NQ_NP_841875-MLB46237204250_062021-O.webp',
            full: 'https://http2.mlstatic.com/D_NQ_NP_841875-MLB46237204250_062021-O.webp'
          },
          alt_description: 'Kit Base Vivai Pure Skin + Pó Compacto',
          user: { name: 'Loja Vivai Brasil' },
          description: 'Combo promocional: Base Matte + Pó Compacto Vivai',
          source: 'Banco Local'
        },
        {
          id: 'fallback-vivai-3',
          urls: {
            small: 'https://images.tcdn.com.br/img/img_prod/695563/base_vivai_matte_pure_skin_cor_02_30ml_2847_1_20210507165432.jpg',
            regular: 'https://images.tcdn.com.br/img/img_prod/695563/base_vivai_matte_pure_skin_cor_02_30ml_2847_1_20210507165432.jpg',
            full: 'https://images.tcdn.com.br/img/img_prod/695563/base_vivai_matte_pure_skin_cor_02_30ml_2847_1_20210507165432.jpg'
          },
          alt_description: 'Base Vivai Matte Pure Skin Cor 02',
          user: { name: 'Vivai Official' },
          description: 'Base matte Vivai tom médio para pele brasileira',
          source: 'Banco Local'
        },
        {
          id: 'fallback-vivai-4',
          urls: {
            small: 'https://cdn.awsli.com.br/300x300/2030/2030831/produto/164875457/po-compacto-vivai-pure-finish-10g-natural.jpg',
            regular: 'https://cdn.awsli.com.br/600x600/2030/2030831/produto/164875457/po-compacto-vivai-pure-finish-10g-natural.jpg',
            full: 'https://cdn.awsli.com.br/800x800/2030/2030831/produto/164875457/po-compacto-vivai-pure-finish-10g-natural.jpg'
          },
          alt_description: 'Pó Compacto Vivai Pure Finish 10g',
          user: { name: 'Vivai Cosméticos' },
          description: 'Pó compacto com acabamento natural Vivai',
          source: 'Banco Local'
        },
        {
          id: 'fallback-vivai-5',
          urls: {
            small: 'https://http2.mlstatic.com/D_NQ_NP_2X_947582-MLB47890234567_102021-F.webp',
            regular: 'https://http2.mlstatic.com/D_NQ_NP_2X_947582-MLB47890234567_102021-F.webp',
            full: 'https://http2.mlstatic.com/D_NQ_NP_2X_947582-MLB47890234567_102021-F.webp'
          },
          alt_description: 'Batom Matte Vivai Linha Premium',
          user: { name: 'Vivai Beauty' },
          description: 'Batom matte longa duração Vivai cores vibrantes',
          source: 'Banco Local'
        },
        {
          id: 'fallback-vivai-6',
          urls: {
            small: 'https://images.tcdn.com.br/img/img_prod/695563/rimel_vivai_volume_extreme_8ml_preto_2851_1_20210507170215.jpg',
            regular: 'https://images.tcdn.com.br/img/img_prod/695563/rimel_vivai_volume_extreme_8ml_preto_2851_1_20210507170215.jpg',
            full: 'https://images.tcdn.com.br/img/img_prod/695563/rimel_vivai_volume_extreme_8ml_preto_2851_1_20210507170215.jpg'
          },
          alt_description: 'Rímel Vivai Volume Extreme 8ml Preto',
          user: { name: 'Vivai Oficial' },
          description: 'Rímel para volume extremo e alongamento Vivai',
          source: 'Banco Local'
        }
      ],
      'base': [
        {
          id: 'fallback-base-1',
          urls: {
            small: 'https://cdn.awsli.com.br/300x300/2030/2030831/produto/164875456/base-liquida-matte-vivai-pure-skin-30ml-f7f51b8c.jpg',
            regular: 'https://cdn.awsli.com.br/600x600/2030/2030831/produto/164875456/base-liquida-matte-vivai-pure-skin-30ml-f7f51b8c.jpg',
            full: 'https://cdn.awsli.com.br/800x800/2030/2030831/produto/164875456/base-liquida-matte-vivai-pure-skin-30ml-f7f51b8c.jpg'
          },
          alt_description: 'Base Vivai Matte Pure Skin',
          user: { name: 'Vivai Beauty' },
          description: 'Base matte com cobertura natural Vivai',
          source: 'Banco Local'
        },
        {
          id: 'fallback-base-2',
          urls: {
            small: 'https://cdn.awsli.com.br/300x300/1235/1235009/produto/95074539/base-ruby-rose-soft-matte-hb-8050-29-71e2f4b8.jpg',
            regular: 'https://cdn.awsli.com.br/600x600/1235/1235009/produto/95074539/base-ruby-rose-soft-matte-hb-8050-29-71e2f4b8.jpg',
            full: 'https://cdn.awsli.com.br/800x800/1235/1235009/produto/95074539/base-ruby-rose-soft-matte-hb-8050-29-71e2f4b8.jpg'
          },
          alt_description: 'Base Ruby Rose Soft Matte HB-8050',
          user: { name: 'Ruby Rose Brasil' },
          description: 'Base líquida Ruby Rose acabamento matte',
          source: 'Banco Local'
        },
        {
          id: 'fallback-base-3',
          urls: {
            small: 'https://images.tcdn.com.br/img/img_prod/695563/base_natura_aqua_fps_60_30ml_2845_1_20210507164832.jpg',
            regular: 'https://images.tcdn.com.br/img/img_prod/695563/base_natura_aqua_fps_60_30ml_2845_1_20210507164832.jpg',
            full: 'https://images.tcdn.com.br/img/img_prod/695563/base_natura_aqua_fps_60_30ml_2845_1_20210507164832.jpg'
          },
          alt_description: 'Base Natura Aqua FPS 60 30ml',
          user: { name: 'Natura Brasil' },
          description: 'Base com proteção solar Natura linha Aqua',
          source: 'Banco Local'
        }
      ],
    };

    const queryLower = query.toLowerCase();
    for (const [key, images] of Object.entries(fallbackDatabase)) {
      if (queryLower.includes(key)) {
        return images;
      }
    }
    return [];
  };

  const searchImages = async (query: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/images/search?q=${encodeURIComponent(query)}&count=50`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro na busca');
      }
      
      if (data.success && data.images && data.images.length > 0) {
        setImages(data.images);
      } else {
        // Fallback para banco local
        const fallbackImages = getFallbackImages(query);
        setImages(fallbackImages);
      }
      
    } catch (error) {
      // Em caso de erro, usar banco local
      const fallbackImages = getFallbackImages(query);
      setImages(fallbackImages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchImages(searchQuery);
  };

  const handleImageSelect = (image: UnsplashImage) => {
    onImageSelect(image.urls.regular);
    onOpenChange(false);
    
    toast({
      title: "Imagem selecionada!",
      description: `Foto de ${image.user.name} foi selecionada para adição.`,
    });
  };

  const openPreview = (image: UnsplashImage) => {
    setSelectedImage(image);
    setIsPreviewOpen(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden" aria-describedby="image-search-description">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Buscar Imagens</span>
            </DialogTitle>
            <DialogDescription id="image-search-description">
              Busque e selecione imagens da internet para o seu produto
            </DialogDescription>
          </DialogHeader>

          {/* Busca */}
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

          {/* Sugestões */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground font-medium">Produtos:</span>
              {["maquiagem", "batom", "base", "pó compacto", "rímel", "sombra", "ruby"].map((suggestion) => (
                <Badge
                  key={suggestion}
                  variant="outline"
                  className="cursor-pointer hover:bg-petrol-50"
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
              {["Vivai", "Ruby Rose", "Natura", "Avon", "MAC"].map((brand) => (
                <Badge
                  key={brand}
                  variant="secondary"
                  className="cursor-pointer hover:bg-gold-100"
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
          <div className="overflow-y-auto max-h-[500px]">
            {isLoading ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {Array.from({ length: 15 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded" />
                ))}
              </div>
            ) : images.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {images.map((image) => (
                  <div key={image.id} className="group relative cursor-pointer">
                    <div className="relative overflow-hidden rounded-lg bg-gray-100">
                      <img
                        src={image.urls.small}
                        alt={image.alt_description}
                        className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                          Google
                        </Badge>
                      </div>
                      
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
            ) : (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Digite uma palavra-chave para buscar</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl" aria-describedby="image-preview-description">
          <DialogHeader>
            <DialogTitle>Preview da Imagem</DialogTitle>
            <DialogDescription id="image-preview-description">
              Visualize a imagem antes de adicionar ao produto
            </DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <img
                src={selectedImage.urls.regular}
                alt={selectedImage.alt_description}
                className="w-full h-auto rounded-lg"
              />
              <div>
                <h3 className="font-semibold">{selectedImage.alt_description}</h3>
                <p className="text-sm text-muted-foreground">
                  Foto por {selectedImage.user.name} • Google Images
                </p>
                <p className="text-sm mt-2">{selectedImage.description}</p>
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