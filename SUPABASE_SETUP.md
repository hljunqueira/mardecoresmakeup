# 🚀 Configuração do Supabase - Mar de Cores

## 📋 Checklist de Configuração

### 1. Criar Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Clique em "New Project" 
4. Configure:
   - **Name**: Mar de Cores
   - **Database Password**: Crie uma senha forte (ANOTE!)
   - **Region**: São Paulo (sa-east-1)
5. Aguarde a criação do projeto (2-3 minutos)

### 2. Obter Chaves da API
1. No painel do projeto, vá em **Settings > API**
2. Copie as seguintes informações:
   - **Project URL** (ex: https://abc123.supabase.co)
   - **anon public** (chave pública)
   - **service_role** (chave secreta - CUIDADO!)

### 3. Obter URL do Banco de Dados
1. Vá em **Settings > Database**
2. Copie a **Connection string** no formato:
   ```
   postgresql://postgres:[SUA-SENHA]@db.[SEU-PROJETO].supabase.co:5432/postgres
   ```
3. Substitua `[SUA-SENHA]` pela senha que você criou no passo 1

### 4. Configurar Arquivo .env
Abra o arquivo `.env` e preencha com suas informações:

```env
# Supabase Configuration
SUPABASE_URL=https://abc123.supabase.co
SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui

# Database URL for Drizzle
DATABASE_URL=postgresql://postgres:sua_senha@db.abc123.supabase.co:5432/postgres

# Node Environment
NODE_ENV=development
PORT=5170
```

### 5. Executar Scripts de Configuração

Execute os comandos na ordem:

```bash
# 1. Testar conexão
npm run test:supabase

# 2. Verificar configuração
npm run db:setup

# 3. Criar tabelas no banco
npm run db:push

# 4. Inserir usuário admin inicial
npm run db:seed

# 5. Iniciar aplicação com Supabase
npm run dev:supabase
```

### 6. Verificar se Funcionou

1. Acesse: http://localhost:5170/admin
2. Login com:
   - **Email**: admin@mardecores.com
   - **Senha**: admin123
3. Verifique se o dashboard carrega sem dados hardcoded

### 7. Verificar no Supabase Dashboard

1. No painel do Supabase, vá em **Table Editor**
2. Você deve ver as tabelas criadas:
   - users
   - products
   - collections
   - coupons
   - financial_transactions
   - suppliers

## ⚠️ Problemas Comuns

### Erro de Conexão
- Verifique se a DATABASE_URL está correta
- Confirme se a senha está certa
- Verifique se o projeto está ativo no Supabase

### Erro de Autenticação
- Confirme se as chaves SUPABASE_* estão corretas
- Verifique se não há espaços extras nas chaves

### Tabelas não Criadas
- Execute `npm run db:push` novamente
- Verifique logs de erro no terminal

## 📞 Próximos Passos Após Configuração

Quando tudo estiver funcionando, me informe que podemos:
1. ✅ Implementar upload de imagens
2. ✅ Adicionar analytics reais
3. ✅ Configurar backup automático
4. ✅ Otimizar queries do banco
5. ✅ Implementar cache com Redis

## 🔐 Segurança

⚠️ **NUNCA** compartilhe suas chaves service_role em código público!
⚠️ Mantenha o arquivo `.env` no `.gitignore`
⚠️ Use diferentes projetos para desenvolvimento e produção