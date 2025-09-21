# Sistema de Upload de Imagens para Produtos

Este documento descreve como usar o sistema de upload de imagens implementado no projeto Mar de Cores.

## 🏗️ Arquitetura

O sistema possui duas camadas:

1. **Supabase Storage** - Armazenamento físico das imagens
2. **Banco de Dados** - Metadados das imagens (URLs, informações, etc.)

## 📁 Estrutura de Arquivos

```
apps/api/
├── upload-service.ts    # Serviço de upload para Supabase Storage
├── routes.ts           # Rotas da API
└── storage.ts          # Interface de banco de dados

packages/shared/
└── schema.ts           # Esquema do banco (tabela productImages)
```

## 🔧 Configuração

### Supabase Storage
As configurações estão no arquivo `.env`:

```env
SUPABASE_URL=https://wudcabcsxmahlufgsyop.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

O bucket `product-images` é criado automaticamente quando o servidor inicia.

### Limites de Upload
- **Tamanho máximo:** 5MB por imagem
- **Formatos aceitos:** JPEG, JPG, PNG, WebP
- **Máximo simultâneo:** 10 imagens por requisição

## 🚀 Como Usar

### 1. Upload de Imagem Única

**Frontend (HTML/JavaScript):**
```html
<form id="uploadForm" enctype="multipart/form-data">
  <input type="file" name="image" accept="image/*" required>
  <input type="hidden" name="productId" value="produto-123">
  <button type="submit">Upload</button>
</form>

<script>
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  
  try {
    const response = await fetch('/api/admin/upload/single', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Upload concluído:', result.imageUrl);
      
      // Adicionar ao banco de dados
      await fetch(`/api/admin/products/${productId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: result.imageUrl,
          altText: 'Descrição da imagem',
          isPrimary: true,
        })
      });
    }
  } catch (error) {
    console.error('❌ Erro no upload:', error);
  }
});
</script>
```

**cURL:**
```bash
curl -X POST http://localhost:5170/api/admin/upload/single \
  -F "image=@/caminho/para/imagem.jpg" \
  -F "productId=produto-123"
```

### 2. Upload de Múltiplas Imagens

**Frontend:**
```html
<form id="multiUploadForm" enctype="multipart/form-data">
  <input type="file" name="images" accept="image/*" multiple required>
  <input type="hidden" name="productId" value="produto-123">
  <button type="submit">Upload Múltiplo</button>
</form>

<script>
document.getElementById('multiUploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  
  const response = await fetch('/api/admin/upload/multiple', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  console.log(`✅ ${result.count} imagens enviadas:`, result.imageUrls);
});
</script>
```

### 3. Gerenciar Imagens no Banco

**Listar imagens de um produto:**
```javascript
const response = await fetch('/api/admin/products/produto-123/images');
const images = await response.json();
console.log('📸 Imagens:', images);
```

**Adicionar imagem ao banco:**
```javascript
const response = await fetch('/api/admin/products/produto-123/images', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://storage.supabase.co/object/public/product-images/products/imagem.jpg',
    altText: 'Descrição da imagem',
    isPrimary: false,
    sortOrder: 1,
  })
});
```

**Definir imagem principal:**
```javascript
await fetch('/api/admin/products/produto-123/images/imagem-id/set-main', {
  method: 'POST'
});
```

**Deletar imagem:**
```javascript
// Do storage e banco
await fetch('/api/admin/upload/delete', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageUrl: 'https://storage.supabase.co/object/public/product-images/products/imagem.jpg'
  })
});

// Apenas do banco
await fetch('/api/admin/products/images/imagem-id', {
  method: 'DELETE'
});
```

## 📋 Endpoints da API

### Upload
- `POST /api/admin/upload/single` - Upload de uma imagem
- `POST /api/admin/upload/multiple` - Upload de múltiplas imagens
- `DELETE /api/admin/upload/delete` - Deletar imagem(ns) do storage
- `GET /api/admin/upload/product/:productId` - Listar imagens do storage

### Banco de Dados
- `GET /api/admin/products/:productId/images` - Buscar imagens do produto
- `POST /api/admin/products/:productId/images` - Adicionar imagem ao produto
- `PUT /api/admin/products/images/:imageId` - Atualizar metadados da imagem
- `DELETE /api/admin/products/images/:imageId` - Remover imagem do banco
- `POST /api/admin/products/:productId/images/:imageId/set-main` - Definir imagem principal

## 🔒 Tratamento de Erros

### Códigos de Resposta
- `200` - Sucesso
- `400` - Dados inválidos (arquivo não enviado, formato inválido)
- `404` - Recurso não encontrado
- `500` - Erro interno do servidor

### Exemplo de Resposta de Erro
```json
{
  "success": false,
  "message": "Tipo de arquivo não permitido. Use apenas JPEG, PNG ou WebP.",
  "error": "Unsupported file type"
}
```

## 🧪 Testando

Execute o arquivo de teste:
```bash
node test-upload.js
```

Este teste cria um produto, adiciona uma imagem e verifica se tudo funciona.

## 🔧 Configuração do Frontend

Para integrar com React/Vue/Angular, use bibliotecas como:

- **React:** `react-dropzone`, `react-image-upload`
- **Vue:** `vue-upload-component`
- **Angular:** `ng2-file-upload`

## 📱 Exemplo React Component

```jsx
import { useState } from 'react';

function ImageUpload({ productId, onImageUploaded }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (files) => {
    setUploading(true);
    
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('images', file));
      formData.append('productId', productId);

      const response = await fetch('/api/admin/upload/multiple', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        // Adicionar ao banco de dados
        for (const url of result.imageUrls) {
          await fetch(`/api/admin/products/${productId}/images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url,
              altText: 'Imagem do produto',
              sortOrder: 0,
            })
          });
        }
        
        onImageUploaded?.(result.imageUrls);
      }
    } catch (error) {
      console.error('Erro no upload:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="image-upload">
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => handleUpload(Array.from(e.target.files))}
        disabled={uploading}
      />
      {uploading && <p>Enviando imagens...</p>}
    </div>
  );
}
```

## 🔄 Workflow Completo

1. **Upload** - Enviar arquivo para Supabase Storage
2. **Registro** - Salvar URL e metadados no banco
3. **Associação** - Vincular imagem ao produto
4. **Exibição** - Mostrar imagens no frontend
5. **Gerenciamento** - Editar, reordenar, definir principal

## 🚀 Próximos Passos

Para integração completa no frontend administrativo:

1. Criar componente de upload de imagens
2. Implementar galeria de imagens do produto
3. Adicionar funcionalidade de reordenação (drag & drop)
4. Implementar crop/resize de imagens
5. Adicionar preview antes do upload

## 📞 Suporte

Em caso de problemas:

1. Verificar logs do servidor
2. Confirmar configurações do Supabase
3. Testar endpoints com Postman/curl
4. Executar o script de teste