# 🔧 Configuração IPv4 para Railway - Mar de Cores

## ✅ Configurações Implementadas

### 1. DNS IPv4 First no Código (index.ts)
```typescript
// PRIMEIRA LINHA do index.ts - ANTES de qualquer import
import * as dns from 'dns';

if (process.env.NODE_ENV === 'production') {
  dns.setDefaultResultOrder('ipv4first');
}
```

### 2. NODE_OPTIONS no railway.toml
```toml
[deploy]
startCommand = "NODE_OPTIONS='--dns-result-order=ipv4first' npm start"
```

### 3. PostgreSQL connection.family: 4
```typescript
// Configuração correta para postgres.js
const client = postgres(url, {
  ssl: 'require',
  connection: { 
    family: 4 // Força IPv4 no postgres.js
  }
});
```

## 🚀 Para Adicionar no Railway Dashboard

Se ainda não funcionar, adicione esta variável de ambiente no Railway:

**Variable Name:** `NODE_OPTIONS`
**Value:** `--dns-result-order=ipv4first`

## 🔍 Como Verificar se Funcionou

Os logs devem mostrar:
```
🔎 ✅ Supabase DNS resolvido para IPv4: 44.x.x.x
🏆 Sucesso se começar com 44.x.x.x ou 3.x.x.x (não 2600:)
✅ SUCESSO: Conectado via Supabase PgBouncer (Recomendado Railway)
```

Se continuar mostrando `2600:...`, a configuração IPv4 não está sendo aplicada cedo o suficiente.

## ⚠️ Ordem de Prioridade

1. **NODE_OPTIONS** (environment variable no Railway) - mais confiável
2. **dns.setDefaultResultOrder()** no primeiro arquivo carregado
3. **connection.family: 4** no postgres.js
4. **railway.toml startCommand** como backup

## 🎯 URLs Testadas

- ✅ PgBouncer: `db.wudcabcsxmahlufgsyop.supabase.co:6543` (recomendado)
- ✅ Direto: `db.wudcabcsxmahlufgsyop.supabase.co:5432` (fallback)
- ❌ IP fixo: Não usar IPs diretos (mudam com frequência)

Sempre usar hostname DNS oficial do Supabase!