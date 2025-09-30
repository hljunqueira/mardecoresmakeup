# 🎯 PLANO DE IMPLEMENTAÇÃO - SISTEMA DE PEDIDOS

## 📋 RESUMO DA PROPOSTA

Transformar o sistema atual em um fluxo mais intuitivo:
- **Produtos**: Apenas controle de estoque físico
- **Pedidos**: Sistema principal para vendas (à vista + crediário)
- **Crediário**: Gestão de contas ativas

---

## 🔄 FASES DE IMPLEMENTAÇÃO

### **FASE 1: Preparação e Backup** ✅
- [x] Backup completo dos arquivos atuais
- [x] Documentação do estado atual
- [x] Preservação das funcionalidades existentes

### **FASE 2: Criação da Nova Estrutura**
- [ ] Criar tabela `orders` no banco
- [ ] Criar tabela `order_items` para produtos do pedido
- [ ] Definir schema TypeScript para pedidos
- [ ] Implementar APIs básicas de pedidos

### **FASE 3: Interface de Pedidos**
- [ ] Criar página `/admin/pedidos`
- [ ] Implementar dashboard de vendas
- [ ] Criar modal "Novo Pedido à Vista"
- [ ] Criar modal "Novo Pedido Crediário"
- [ ] Implementar carrinho de compras

### **FASE 4: Integração e Migração**
- [ ] Integrar com sistema de crediário existente
- [ ] Simplificar página de produtos (remover modal de venda)
- [ ] Atualizar navegação do admin
- [ ] Testes completos

### **FASE 5: Polimento e Otimização**
- [ ] Dashboard com métricas
- [ ] Filtros avançados
- [ ] Relatórios integrados
- [ ] Documentação final

---

## 📊 ESTRUTURA DE DADOS PROPOSTA

### Tabela `orders`
```sql
CREATE TABLE orders (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR UNIQUE NOT NULL, -- #PED001, #PED002
  customer_id VARCHAR REFERENCES customers(id),
  customer_name VARCHAR, -- Para vendas sem cadastro
  customer_phone VARCHAR,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR NOT NULL, -- pending, confirmed, cancelled
  payment_type VARCHAR NOT NULL, -- cash, card, pix, credit
  payment_status VARCHAR NOT NULL, -- pending, paid, overdue
  credit_account_id VARCHAR REFERENCES credit_accounts(id), -- Para crediário
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela `order_items`
```sql
CREATE TABLE order_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR REFERENCES orders(id) NOT NULL,
  product_id VARCHAR REFERENCES products(id) NOT NULL,
  product_name VARCHAR NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎨 INTERFACE PROPOSTA

### Navegação Atualizada
```
📋 Admin Menu
├── 🏠 Dashboard
├── 📦 Produtos (apenas estoque)
├── 🛒 Pedidos (vendas + crediário) ← NOVO MENU PRINCIPAL
├── 💳 Crediário (contas ativas)
├── 👥 Clientes
├── 💰 Financeiro
└── 📊 Relatórios
```

### Dashboard de Pedidos
```
┌─────────────────────────────────────────────────────────────┐
│ 🛒 PEDIDOS E VENDAS                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [🛍️ Novo Pedido à Vista] [💳 Novo Pedido Crediário]        │
│                                                             │
│ 📊 Dashboard de Vendas                                      │
│ ┌─────────────┬─────────────┬─────────────┬─────────────┐   │
│ │ Vendas Hoje │ Crediário   │ À Vista     │ Pendentes   │   │
│ │ R$ 1.245,80 │ R$ 890,50  │ R$ 355,30   │ 5 pedidos   │   │
│ └─────────────┴─────────────┴─────────────┴─────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔗 COMPATIBILIDADE

### APIs Mantidas
- ✅ Todas as APIs atuais continuam funcionando
- ✅ Sistema de crediário preservado
- ✅ Hooks existentes mantidos

### Migração Gradual
- ✅ Funcionalidades atuais permanecem ativas
- ✅ Novo sistema funciona em paralelo
- ✅ Migração opcional e controlada

---

## 🚀 PRÓXIMO PASSO

Vamos começar com a **FASE 2** - criação da estrutura de dados para pedidos.

**Pronto para prosseguir?**