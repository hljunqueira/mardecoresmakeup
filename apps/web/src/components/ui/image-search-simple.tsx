import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, Eye, Sparkles } from "lucide-react";
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
  onClose: () => void;
  onImageSelect: (imageUrl: string) => void;
  searchQuery?: string;
}

export function ImageSearch({
  isOpen,
  onClose,
  onImageSelect,
  searchQuery: initialQuery = ""
}: ImageSearchProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [images, setImages] = useState<UnsplashImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<UnsplashImage | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { toast } = useToast();

  // Sistema de busca totalmente livre - como Google Search
  const searchImages = async (query: string) => {
    if (!query.trim()) return;
    
    console.log('🔍 Iniciando busca por imagens:', query);
    setIsLoading(true);
    try {
      // Busca direta na API sem qualquer modificação na query do usuário
      const url = `/api/images/search?q=${encodeURIComponent(query)}&count=50`;
      console.log('🌐 URL da requisição:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📊 Resposta da API:', {
        ok: response.ok,
        status: response.status,
        success: data.success,
        imagesCount: data.images?.length || 0
      });
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro na busca');
      }
      
      if (data.success && data.images && data.images.length > 0) {
        console.log('✅ Imagens encontradas:', data.images.length);
        setImages(data.images);
      } else {
        console.log('⚠️ Nenhuma imagem encontrada');
        setImages([]);
      }
      
    } catch (error) {
      console.error('❌ Erro na busca:', error);
      setImages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchImages(searchQuery);
  };

  const handleImageSelect = (image: UnsplashImage) => {
    console.log('🔍 ImageSearch: Imagem selecionada:', image.urls.regular);
    onImageSelect(image.urls.regular);
    onClose();
    
    toast({
      title: "Imagem selecionada!",
      description: `Imagem adicionada com sucesso.`,
    });
  };

  const openPreview = (image: UnsplashImage) => {
    setSelectedImage(image);
    setIsPreviewOpen(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden" aria-describedby="image-search-description">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <span>Buscar Imagens na Internet</span>
            </DialogTitle>
            <DialogDescription id="image-search-description">
              Busque qualquer imagem da internet. Funciona igual ao Google: digite qualquer coisa!
            </DialogDescription>
          </DialogHeader>

          {/* Campo de Busca */}
          <form onSubmit={handleSearch} className="flex space-x-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite qualquer coisa... (ex: gato fofo, paisagem, batom vermelho, flores)"
              className="flex-1 text-base"
              autoFocus
            />
            <Button type="submit" disabled={isLoading || !searchQuery.trim()}>
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </form>

          {/* Estado Inicial - Sugestões Abertas */}
          {!searchQuery && !isLoading && images.length === 0 && (
            <div className="text-center py-8">
              <div className="mb-6">
                <Sparkles className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Busque qualquer imagem!</h3>
                <p className="text-muted-foreground mb-4">
                  Digite qualquer palavra e encontre milhões de imagens
                </p>
              </div>
              
              {/* Sugestões diversificadas */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">💄 Beleza & Cosmético:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {["batom", "maquiagem", "base", "sombra", "blush", "perfume"].map((suggestion) => (
                      <Badge
                        key={suggestion}
                        variant="outline"
                        className="cursor-pointer hover:bg-purple-50 hover:border-purple-300"
                        onClick={() => {
                          setSearchQuery(suggestion);
                          searchImages(suggestion);
                        }}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">🌸 Elementos Visuais:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {["flores", "cores pastel", "mármore", "dourado", "textura", "gradiente"].map((suggestion) => (
                      <Badge
                        key={suggestion}
                        variant="outline"
                        className="cursor-pointer hover:bg-blue-50 hover:border-blue-300"
                        onClick={() => {
                          setSearchQuery(suggestion);
                          searchImages(suggestion);
                        }}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">✨ Geral:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {["produto", "elegante", "minimalista", "natureza", "lifestyle", "modern"].map((suggestion) => (
                      <Badge
                        key={suggestion}
                        variant="outline"
                        className="cursor-pointer hover:bg-green-50 hover:border-green-300"
                        onClick={() => {
                          setSearchQuery(suggestion);
                          searchImages(suggestion);
                        }}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Resultados da busca */}
          <div className="overflow-y-auto max-h-[500px]">
            {isLoading ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {Array.from({ length: 20 }).map((_, i) => (
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
                        loading="lazy"
                      />
                      
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                          Web
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
                          className="bg-purple-600 hover:bg-purple-700"
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
              <div className="text-center py-12">
                <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">Nenhum resultado encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Não encontramos imagens para "{searchQuery}"
                </p>
                <p className="text-sm text-gray-500">
                  💡 Dica: Tente palavras mais simples ou em inglês
                </p>
              </div>
            ) : null}
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
                className="w-full h-auto rounded-lg border"
              />
              <div>
                <h3 className="font-semibold">{selectedImage.alt_description}</h3>
                <p className="text-sm text-muted-foreground">
                  Fonte: {selectedImage.user.name}
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
                  className="bg-purple-600 hover:bg-purple-700"
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