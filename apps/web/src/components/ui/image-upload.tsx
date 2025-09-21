import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Star, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
  productId?: string;
  className?: string;
}

interface UploadedImage {
  url: string;
  id: string;
  isPrimary: boolean;
  uploading?: boolean;
}

export function ImageUpload({ 
  value = [], 
  onChange, 
  maxImages = 5, 
  productId,
  className 
}: ImageUploadProps) {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>(
    value.map((url, index) => ({
      url,
      id: `existing-${index}`,
      isPrimary: index === 0,
    }))
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Sincronizar com mudanças externas no value
  useEffect(() => {
    // Criar novos objetos de imagem baseados no value
    const newImages = value.map((url, index) => ({
      url,
      id: `external-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isPrimary: index === 0,
    }));
    
    // Verificar se houve mudança real nos URLs (sem considerar a ordem)
    const currentUrls = [...uploadedImages.map(img => img.url)].sort();
    const newUrls = [...value].sort();
    
    const hasChanged = JSON.stringify(currentUrls) !== JSON.stringify(newUrls) || uploadedImages.length !== value.length;
    
    if (hasChanged) {
      setUploadedImages(newImages);
    }
  }, [value]); // Removida dependência de uploadedImages para evitar loop

  const updateParent = useCallback((images: UploadedImage[]) => {
    const urls = images.filter(img => !img.uploading).map(img => img.url);
    onChange(urls);
  }, [onChange]);

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    if (productId) {
      formData.append('productId', productId);
    }

    const response = await fetch('/api/admin/upload/single', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Erro no upload da imagem');
    }

    const result = await response.json();
    
    // Se temos um productId, também salvar no banco de dados
    if (productId && result.imageUrl) {
      try {
        await fetch(`/api/admin/products/${productId}/images`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: result.imageUrl,
            altText: file.name,
            isPrimary: uploadedImages.length === 0, // Primeira imagem é principal
            sortOrder: uploadedImages.length,
          }),
        });
      } catch (dbError) {
        console.warn('Erro ao salvar metadados da imagem no banco:', dbError);
        // Continua mesmo se falhar no banco, pois a imagem foi enviada
      }
    }
    
    return result.imageUrl;
  };

  const handleFileSelect = async (files: FileList) => {
    const fileArray = Array.from(files);
    const totalImages = uploadedImages.length + fileArray.length;

    if (totalImages > maxImages) {
      toast({
        title: "Muitas imagens",
        description: `Você pode adicionar no máximo ${maxImages} imagens.`,
        variant: "destructive",
      });
      return;
    }

    // Validar tipos de arquivo
    const validFiles = fileArray.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Arquivo inválido",
          description: `${file.name} não é uma imagem válida.`,
          variant: "destructive",
        });
        return false;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} deve ter menos de 5MB.`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setIsUploading(true);

    // Adicionar imagens temporárias com loading
    const tempImages = validFiles.map((file, index) => ({
      url: URL.createObjectURL(file),
      id: `temp-${Date.now()}-${index}`,
      isPrimary: false,
      uploading: true,
    }));

    const newImages = [...uploadedImages, ...tempImages];
    setUploadedImages(newImages);

    try {
      // Upload todas as imagens
      const uploadPromises = validFiles.map(async (file, index) => {
        try {
          const url = await uploadImage(file);
          return {
            url,
            id: `uploaded-${Date.now()}-${index}`,
            isPrimary: false,
          };
        } catch (error) {
          toast({
            title: "Erro no upload",
            description: `Falha ao enviar ${file.name}`,
            variant: "destructive",
          });
          throw error;
        }
      });

      const uploadedResults = await Promise.allSettled(uploadPromises);
      
      // Remover imagens temporárias e adicionar as finais
      const finalImages = [...uploadedImages];
      let successCount = 0;

      uploadedResults.forEach((result, index) => {
        const tempIndex = finalImages.findIndex(img => img.id === tempImages[index].id);
        if (tempIndex !== -1) {
          finalImages.splice(tempIndex, 1); // Remove temp
        }

        if (result.status === 'fulfilled') {
          finalImages.push(result.value);
          successCount++;
        }
      });

      setUploadedImages(finalImages);
      updateParent(finalImages);

      if (successCount > 0) {
        toast({
          title: "Upload concluído",
          description: `${successCount} imagem(ns) enviada(s) com sucesso.`,
        });
      }
    } catch (error) {
      // Remover imagens temporárias em caso de erro
      const cleanImages = uploadedImages.filter(img => !tempImages.some(temp => temp.id === img.id));
      setUploadedImages(cleanImages);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (imageId: string) => {
    const newImages = uploadedImages.filter(img => img.id !== imageId);
    
    // Se removeu a imagem principal, definir a primeira como principal
    if (newImages.length > 0) {
      const hadPrimary = uploadedImages.find(img => img.id === imageId)?.isPrimary;
      if (hadPrimary) {
        newImages[0].isPrimary = true;
      }
    }
    
    setUploadedImages(newImages);
    updateParent(newImages);
  };

  const setPrimaryImage = (imageId: string) => {
    const newImages = uploadedImages.map(img => ({
      ...img,
      isPrimary: img.id === imageId,
    }));
    setUploadedImages(newImages);
    updateParent(newImages);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files);
    }
  };

  const canAddMore = uploadedImages.length < maxImages;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      {canAddMore && (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
            isDragging 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-primary/50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
            disabled={isUploading}
          />
          
          <div className="flex flex-col items-center space-y-2">
            {isUploading ? (
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                {isUploading ? "Enviando imagens..." : "Clique ou arraste imagens aqui"}
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WebP até 5MB • {uploadedImages.length}/{maxImages} imagens
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Images Grid */}
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {uploadedImages.map((image) => (
            <Card key={image.id} className="relative group overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  {image.uploading ? (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <img
                      src={image.url}
                      alt="Produto"
                      className="w-full h-full object-cover"
                    />
                  )}
                  
                  {/* Primary Badge */}
                  {image.isPrimary && !image.uploading && (
                    <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                      <Star className="h-3 w-3 mr-1" />
                      Principal
                    </Badge>
                  )}
                  
                  {/* Action Buttons */}
                  {!image.uploading && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                      {!image.isPrimary && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setPrimaryImage(image.id)}
                          className="h-8 px-2"
                        >
                          <Star className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeImage(image.id)}
                        className="h-8 px-2"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info */}
      {uploadedImages.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium mb-1">Nenhuma imagem adicionada</p>
          <p className="text-xs text-muted-foreground">
            Arraste imagens aqui ou clique no botão acima para adicionar
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Formatos aceitos: PNG, JPG, WebP • Máximo 5MB por imagem
          </p>
        </div>
      )}
    </div>
  );
}