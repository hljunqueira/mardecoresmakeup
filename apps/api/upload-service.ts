import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Configuração do multer para upload em memória
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limite
  },
  fileFilter: (req, file, cb) => {
    // Verificar tipos de arquivo permitidos
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use apenas JPEG, PNG ou WebP.'));
    }
  },
});

export class ImageUploadService {
  private bucketName = 'product-images';

  constructor() {
    this.initializeBucket();
  }

  // Inicializar o bucket se não existir
  private async initializeBucket() {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.find(bucket => bucket.name === this.bucketName);
      
      if (!bucketExists) {
        console.log('🪣 Criando bucket para imagens de produtos...');
        const { data, error } = await supabase.storage.createBucket(this.bucketName, {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
          fileSizeLimit: 5 * 1024 * 1024, // 5MB
        });
        
        if (error) {
          console.error('❌ Erro ao criar bucket:', error);
        } else {
          console.log('✅ Bucket criado com sucesso:', data);
        }
      } else {
        console.log('✅ Bucket já existe:', this.bucketName);
      }
    } catch (error) {
      console.error('❌ Erro ao verificar/criar bucket:', error);
    }
  }

  // Upload de uma única imagem
  async uploadImage(file: Express.Multer.File, productId?: string): Promise<string> {
    try {
      // Gerar nome único para o arquivo
      const fileExtension = path.extname(file.originalname);
      const fileName = `${productId || 'temp'}_${crypto.randomUUID()}${fileExtension}`;
      const filePath = `products/${fileName}`;

      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          duplex: 'half'
        });

      if (error) {
        console.error('❌ Erro no upload:', error);
        throw new Error(`Erro no upload: ${error.message}`);
      }

      // Obter URL pública
      const { data: publicUrl } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      console.log('✅ Imagem enviada com sucesso:', publicUrl.publicUrl);
      return publicUrl.publicUrl;
    } catch (error) {
      console.error('❌ Erro no upload da imagem:', error);
      throw error;
    }
  }

  // Upload de múltiplas imagens
  async uploadMultipleImages(files: Express.Multer.File[], productId?: string): Promise<string[]> {
    try {
      const uploadPromises = files.map(file => this.uploadImage(file, productId));
      const urls = await Promise.all(uploadPromises);
      return urls;
    } catch (error) {
      console.error('❌ Erro no upload múltiplo:', error);
      throw error;
    }
  }

  // Deletar imagem
  async deleteImage(imageUrl: string): Promise<boolean> {
    try {
      // Extrair o caminho do arquivo da URL
      const urlParts = imageUrl.split('/');
      const bucketIndex = urlParts.findIndex(part => part === this.bucketName);
      if (bucketIndex === -1) return false;
      
      const filePath = urlParts.slice(bucketIndex + 1).join('/');

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('❌ Erro ao deletar imagem:', error);
        return false;
      }

      console.log('✅ Imagem deletada com sucesso:', filePath);
      return true;
    } catch (error) {
      console.error('❌ Erro ao deletar imagem:', error);
      return false;
    }
  }

  // Deletar múltiplas imagens
  async deleteMultipleImages(imageUrls: string[]): Promise<boolean[]> {
    try {
      const deletePromises = imageUrls.map(url => this.deleteImage(url));
      const results = await Promise.all(deletePromises);
      return results;
    } catch (error) {
      console.error('❌ Erro ao deletar múltiplas imagens:', error);
      throw error;
    }
  }

  // Listar todas as imagens de um produto
  async listProductImages(productId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list(`products`, {
          search: productId
        });

      if (error) {
        console.error('❌ Erro ao listar imagens:', error);
        return [];
      }

      const urls = data.map(file => {
        const { data: publicUrl } = supabase.storage
          .from(this.bucketName)
          .getPublicUrl(`products/${file.name}`);
        return publicUrl.publicUrl;
      });

      return urls;
    } catch (error) {
      console.error('❌ Erro ao listar imagens do produto:', error);
      return [];
    }
  }

  // Obter informações de uma imagem
  async getImageInfo(filePath: string) {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list('products', {
          search: filePath
        });

      if (error || !data || data.length === 0) {
        return null;
      }

      return data[0];
    } catch (error) {
      console.error('❌ Erro ao obter informações da imagem:', error);
      return null;
    }
  }
}

export const imageUploadService = new ImageUploadService();