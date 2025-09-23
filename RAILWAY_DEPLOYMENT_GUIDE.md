# 🚀 Guia de Deploy no Railway - Mar de Cores

## 📋 Variáveis de Ambiente Obrigatórias

Configure as seguintes variáveis no Dashboard do Railway:

### 🔒 Supabase (Obrigatório)
```bash
SUPABASE_URL=https://wudcabcsxmahlufgsyop.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZGNhYmNzeG1haGx1ZmdzeW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NjU1NzMsImV4cCI6MjA3NDA0MTU3M30.Z3BaUkYkm9woo2qHhXgmb8bqi4GwaTFvTEYSFY6zS34
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZGNhYmNzeG1haGx1ZmdzeW9wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ2NTU3MywiZXhwIjoyMDc0MDQxNTczfQ.-c8TRwjhn6qglfYyIeBHVK5p1ZgKj-xHdyIeqxWnioY
```

### 🗄️ Database (Supavisor Pooler - IPv4 Compatible)
```bash
DATABASE_URL=postgresql://postgres.wudcabcsxmahlufgsyop:ServidorMardecores2025@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

### 🔧 Sistema
```bash
NODE_ENV=production
PORT=8080
USE_SUPABASE=true
```

### 🌐 Frontend
```bash
NEXT_PUBLIC_SUPABASE_URL=https://wudcabcsxmahlufgsyop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZGNhYmNzeG1haGx1ZmdzeW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NjU1NzMsImV4cCI6MjA3NDA0MTU3M30.Z3BaUkYkm9woo2qHhXgmb8bqi4GwaTFvTEYSFY6zS34
NEXT_PUBLIC_DOMAIN=www.mardecoresmakeup.com.br
NEXT_PUBLIC_BASE_URL=https://www.mardecoresmakeup.com.br
```

### 🔍 Google API (Opcional)
```bash
GOOGLE_API_KEY=AIzaSyDrk2KBXHdLfipt917DJGVQzZ3fMwgWMBI
GOOGLE_CSE_ID=60fa77ea9d56f48b8
```

## ⚡ Configurações IPv4 (Opcionais mas Recomendadas)

Para garantir compatibilidade máxima com Railway:

```bash
NODE_OPTIONS=--dns-result-order=ipv4first --max-old-space-size=512
UV_USE_IO_URING=0
FORCE_IPV4=true
DNS_ORDER=ipv4first
```

## 🔄 Diferenças entre Conexões

### ❌ Conexão Direta (Não funciona no Railway)
```
postgresql://postgres:senha@db.PROJECT_REF.supabase.co:5432/postgres
```
- ❌ Usa IPv6 (Railway não suporta)
- ❌ Causa erro: `getaddrinfo ENOTFOUND`

### ✅ Supavisor Session Mode (Recomendado)
```
postgresql://postgres.PROJECT_REF:senha@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```
- ✅ Suporta IPv4 + IPv6
- ✅ Otimizado para apps persistentes
- ✅ Gerenciamento automático de conexões
- ✅ Compatible com Railway
- 🇧🇷 Região: South America (São Paulo) - sa-east-1

## 🚀 Deploy Steps

1. **Fork & Connect**: Conectar repositório GitHub ao Railway
2. **Set Variables**: Configurar todas as variáveis acima
3. **Domain**: Configurar domínio personalizado (opcional)
4. **Deploy**: Railway fará deploy automaticamente

## 🔍 Troubleshooting

### Erro: "Tenant or user not found"
- ✅ Verificar formato: `postgres.PROJECT_REF:senha`
- ✅ Confirmar região do pooler: `aws-0-sa-east-1` (South America - São Paulo)
- ✅ Testar credenciais localmente
- ✅ Tentar outras regiões se necessário: `us-east-1`, `eu-west-1`

### Erro: "getaddrinfo ENOTFOUND"
- ✅ Usar URL do pooler (não conexão direta)
- ✅ Configurar variáveis IPv4
- ✅ Verificar NODE_OPTIONS

### Frontend não aparece
- ✅ Verificar se build foi executado
- ✅ Confirmar arquivos em dist/public
- ✅ Testar rota "/" do backend

## 📊 Status Esperado

```bash
✅ Server successfully started on http://0.0.0.0:8080
✅ Inicializando Supabase Storage
✅ Convertido para Supavisor Session Mode (IPv4 compatível)
✅ Conexão estabelecida com sucesso!
✅ Bucket já existe: product-images
```

## 🎯 Resultado Final

- 🌐 **Frontend**: React SPA servido estaticamente
- 🔌 **Backend**: Express.js com API REST
- 🗄️ **Database**: PostgreSQL via Supavisor Pooler
- 🔒 **Auth**: Sistema de login admin funcional
- 📱 **Responsive**: Interface otimizada mobile/desktop