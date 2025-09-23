# 🚨 VARIÁVEIS OBRIGATÓRIAS - Railway Dashboard

## ⚠️ PROBLEMA IDENTIFICADO
DNS ainda resolve para IPv6 (`2600:1f1e:75b:4b12...`) em vez de IPv4.

## ✅ ADICIONAR ESTAS VARIÁVEIS NO RAILWAY

### 1. NODE_OPTIONS (CRÍTICA)
```
VARIABLE_NAME: NODE_OPTIONS
VALUE: --dns-result-order=ipv4first --max-old-space-size=512
```

### 2. UV_USE_IO_URING (DESABILITA IPv6 ASYNC)
```
VARIABLE_NAME: UV_USE_IO_URING
VALUE: 0
```

### 3. FORCE_IPV4 (FLAG CUSTOMIZADA)
```
VARIABLE_NAME: FORCE_IPV4
VALUE: true
```

### 4. DNS_ORDER (BACKUP)
```
VARIABLE_NAME: DNS_ORDER
VALUE: ipv4first
```

### 5. NODE_ENV (SE NÃO ESTIVER)
```
VARIABLE_NAME: NODE_ENV
VALUE: production
```

## 🔍 COMO VERIFICAR SE FUNCIONOU

### ✅ Logs de Sucesso:
```
🔧 === VERIFICAÇÃO DE VARIÁVEIS IPv4 ===
NODE_OPTIONS: --dns-result-order=ipv4first --max-old-space-size=512
🔎 ✅ Supabase DNS resolvido para IPv4: 44.195.x.x
🏆 Sucesso se começar com 44.x.x.x ou 3.x.x.x (não 2600:)
✅ SUCESSO: Conectado via Supabase PgBouncer
```

### ❌ Logs de Falha:
```
NODE_OPTIONS: ❌ NÃO DEFINIDA
❌ Supabase PgBouncer: connect ENETUNREACH 2600:1f1e:75b:4b12...
```

## 🚀 APÓS ADICIONAR AS VARIÁVEIS

1. Salvar as variáveis no Railway
2. Fazer redeploy do projeto
3. Verificar os logs de startup
4. O login admin deve funcionar mesmo se banco falhar (modo offline)

## 📞 CONTATO ADMIN
- **Username:** mardecoresmakeup@gmail.com  
- **Password:** Mardecores@09212615
- **Funciona em modo offline se banco não conectar**