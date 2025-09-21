# 📸 Sistema de Upload de Imagens - Frontend

## ✨ Funcionalidades Implementadas

O sistema de upload de imagens foi completamente integrado no frontend administrativo com as seguintes funcionalidades:

### 🎯 **Componente ImageUpload**
- **Drag & Drop**: Arraste imagens diretamente para a área de upload
- **Upload Múltiplo**: Até 5 imagens por produto
- **Validação**: Formatos PNG, JPG, WebP com limite de 5MB
- **Preview**: Visualização instantânea das imagens
- **Gerenciamento**: Definir imagem principal, reordenar e remover
- **Integração**: Upload automático para Supabase Storage + banco de dados

### 🔧 **Como Usar**

#### 1. **Adicionar Produto com Imagens**
1. Acesse **Admin** → **Produtos**
2. Clique em **"Adicionar Produto"**
3. Preencha os dados do produto
4. Na seção **"Imagens do Produto"**:
   - Arraste imagens para a área de upload, OU
   - Clique na área para selecionar arquivos
5. As imagens aparecerão com preview instantâneo
6. Clique na ⭐ para definir imagem principal
7. Clique em ❌ para remover uma imagem
8. Clique **"Criar"** para salvar

#### 2. **Editar Imagens de Produto Existente**
1. Na lista de produtos, clique no ícone ✏️ (Editar)
2. As imagens atuais aparecerão na seção de imagens
3. Adicione novas imagens ou gerencie as existentes
4. Clique **"Atualizar"** para salvar

#### 3. **Teste Rápido**
- Use o botão **"Produto Teste"** para criar um produto com imagens de exemplo
- Isso demonstra como o sistema funciona com imagens reais

### 🎨 **Interface do Usuário**

#### Upload Area
```
┌─────────────────────────────────────┐
│  📤 Clique ou arraste imagens aqui  │
│                                     │
│ PNG, JPG, WebP até 5MB • 0/5 imgs  │
└─────────────────────────────────────┘
```

#### Preview Grid
```
┌─────┐ ┌─────┐ ┌─────┐
│ ⭐   │ │     │ │     │
│IMG1 │ │IMG2 │ │IMG3 │
│ ❌  │ │ ⭐❌ │ │ ⭐❌ │
└─────┘ └─────┘ └─────┘
Principal  Hover   Hover
```

### 🔄 **Fluxo Completo**

1. **Upload**: Imagem → Supabase Storage → URL gerada
2. **Metadados**: URL + informações → Banco de dados
3. **Produto**: Array de URLs → Campo `images` do produto
4. **Exibição**: Imagens aparecem no catálogo e detalhes

### 📋 **Validações**

- ✅ **Formatos**: PNG, JPG, JPEG, WebP
- ✅ **Tamanho**: Máximo 5MB por imagem
- ✅ **Quantidade**: Até 5 imagens por produto
- ✅ **Requisitos**: Pelo menos 1 imagem principal
- ❌ **Bloqueios**: Formatos inválidos, arquivos muito grandes

### 🚀 **APIs Utilizadas**

#### Upload
- `POST /api/admin/upload/single` - Upload de imagem única
- `POST /api/admin/upload/multiple` - Upload múltiplo
- `DELETE /api/admin/upload/delete` - Deletar do storage

#### Banco de Dados
- `GET /api/admin/products/:id/images` - Listar imagens
- `POST /api/admin/products/:id/images` - Adicionar imagem
- `PUT /api/admin/products/images/:id` - Atualizar metadados
- `DELETE /api/admin/products/images/:id` - Remover do banco

### 💡 **Dicas de Uso**

1. **Performance**: Redimensione imagens grandes antes do upload
2. **SEO**: Use nomes descritivos para as imagens
3. **Qualidade**: Imagens quadradas (1:1) ficam melhor no grid
4. **Principal**: A primeira imagem é automaticamente definida como principal
5. **Backup**: Imagens ficam salvas permanentemente no Supabase

### 🔧 **Para Desenvolvedores**

#### Usar o Componente
```tsx
import { ImageUpload } from '@/components/ui/image-upload';

<ImageUpload
  value={imageUrls}           // Array de URLs atuais
  onChange={setImageUrls}     // Callback para updates
  maxImages={5}               // Limite de imagens
  productId={product?.id}     // ID do produto (opcional)
/>
```

#### Propriedades
- `value: string[]` - URLs das imagens atuais
- `onChange: (urls: string[]) => void` - Callback de mudança
- `maxImages?: number` - Limite máximo (padrão: 5)
- `productId?: string` - ID do produto para organização
- `className?: string` - Classes CSS adicionais

### 🎯 **Próximas Melhorias**

- [ ] Crop/resize de imagens no frontend
- [ ] Lazy loading para melhor performance
- [ ] Zoom para visualização detalhada
- [ ] Ordenação por drag & drop
- [ ] Compressão automática
- [ ] Watermark automático
- [ ] Galeria modal fullscreen

### 🆘 **Troubleshooting**

**Erro de upload?**
- Verifique se o arquivo é uma imagem válida
- Confirme se está abaixo de 5MB
- Tente um formato diferente (PNG/JPG)

**Imagens não aparecem?**
- Verifique a conexão com Supabase
- Confirme as credenciais no `.env`
- Veja os logs do servidor no terminal

**Upload lento?**
- Redimensione as imagens antes do upload
- Use formatos mais leves como WebP
- Comprima as imagens

### 📞 **Suporte**
Em caso de problemas, verifique:
1. Console do navegador (F12)
2. Logs do servidor no terminal
3. Configurações do Supabase no `.env`