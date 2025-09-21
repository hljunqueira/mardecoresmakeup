# Mar de Cores - E-commerce de Maquiagem e Cosméticos

Uma plataforma de e-commerce completa para produtos de beleza e cosméticos, com catálogo de produtos, sistema administrativo e gestão financeira.

## 🚀 Tecnologias

- **Frontend**: React + Vite + TypeScript
- **Backend**: Express.js + TypeScript
- **Banco de Dados**: PostgreSQL (Supabase)
- **ORM**: Drizzle ORM
- **Estilização**: Tailwind CSS + shadcn/ui
- **Autenticação**: Sistema próprio
- **Deploy**: Supabase + Vercel

## 🛠️ Configuração do Projeto

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd Mar_de_cores
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configuração do Supabase

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Vá em **Settings > API** e copie:
   - Project URL
   - anon public key
   - service_role key (secret)
4. Vá em **Settings > Database** e copie a Connection String

### 4. Configuração das Variáveis de Ambiente

1. Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

2. Configure as variáveis no arquivo `.env`:
```bash
# Configuração do Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_publica_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role

# URL do Banco de Dados
DATABASE_URL=postgresql://postgres:sua_senha@db.seu-projeto-ref.supabase.co:5432/postgres

# Ambiente
NODE_ENV=development
PORT=5170
```

### 5. Configuração do Banco de Dados

1. Execute as migrações:
```bash
npm run db:push
```

2. Execute o seed (dados iniciais):
```bash
npm run db:seed
```

### 6. Execute o projeto

#### Desenvolvimento (com storage em memória):
```bash
npm run dev
```

#### Desenvolvimento (com Supabase):
```bash
npm run dev:supabase
```

### 7. Acesse a aplicação

- **Frontend**: http://localhost:5170
- **Admin**: http://localhost:5170/admin
  - Email: `admin@mardecores.com`
  - Senha: `admin123`

## 📁 Estrutura do Projeto

```
Mar_de_cores/
├── apps/
│   ├── api/                 # Backend Express.js
│   │   ├── index.ts         # Servidor principal
│   │   ├── routes.ts        # Rotas da API
│   │   ├── storage.ts       # Storage em memória
│   │   ├── supabase-storage.ts # Storage Supabase
│   │   └── seed.ts          # Dados iniciais
│   └── web/                 # Frontend React
│       └── src/
│           ├── components/  # Componentes React
│           ├── pages/       # Páginas da aplicação
│           ├── hooks/       # Hooks customizados
│           └── lib/         # Utilitários
├── packages/
│   └── shared/
│       └── schema.ts        # Esquemas do banco
└── README.md
```

## 🔧 Scripts Disponíveis

- `npm run dev` - Executa em desenvolvimento (memória)
- `npm run dev:supabase` - Executa em desenvolvimento (Supabase)
- `npm run build` - Build para produção
- `npm run start` - Executa em produção
- `npm run db:push` - Aplica migrações no banco
- `npm run db:seed` - Executa seed do banco
- `npm run db:studio` - Abre Drizzle Studio
- `npm run check` - Verifica tipos TypeScript

## 🎯 Funcionalidades

### Frontend Público
- ✅ Catálogo de produtos
- ✅ Página de detalhes do produto
- ✅ Coleções de produtos
- ✅ Página de contato
- ✅ Integração WhatsApp
- ✅ Design responsivo

### Painel Administrativo
- ✅ Dashboard com métricas
- ✅ Gestão de produtos (CRUD)
- ✅ Gestão de coleções
- ✅ Sistema de cupons
- ✅ Controle financeiro completo
- ✅ Gestão de fornecedores
- ✅ Sistema de autenticação

### Recursos Técnicos
- ✅ API REST completa
- ✅ Validação com Zod
- ✅ ORM com Drizzle
- ✅ Storage flexível (Memória/Supabase)
- ✅ TypeScript end-to-end
- ✅ Hot reload em desenvolvimento

## 🚀 Deploy

### Backend (Railway/Render)
1. Configure as variáveis de ambiente
2. Execute `npm run build`
3. Deploy da pasta `dist/`

### Frontend (Vercel/Netlify)
1. Configure build command: `npm run build:web`
2. Configure output directory: `apps/api/public`

## 📞 Suporte

Para dúvidas ou suporte:
- Email: mardecoresmakeup@gmail.com
- WhatsApp: +55 48 99834-9083
- Instagram: @mardecoresmakeup