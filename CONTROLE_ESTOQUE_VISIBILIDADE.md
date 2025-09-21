# Sistema de Controle de Estoque e Visibilidade

Este documento descreve as funcionalidades implementadas para controle de estoque e visibilidade de produtos.

## 🎯 Funcionalidades Implementadas

### 1. **Controle de Estoque Aprimorado**

#### Campos Adicionados:
- **Estoque Atual**: Campo existente para quantidade disponível
- **Estoque Mínimo**: Novo campo para definir limite de alerta de estoque baixo

#### Indicadores Visuais:
- 🔴 **Sem Estoque**: Badge vermelha quando `stock = 0`
- 🟠 **Estoque Baixo**: Badge laranja quando `stock <= minStock`
- 🟢 **Estoque Normal**: Cor verde quando acima do mínimo

#### Interface Melhorada:
- Campos lado a lado no formulário de produto
- Exibição do estoque mínimo no card do produto
- Cores diferentes para status do estoque no card

### 2. **Sistema de Visibilidade (Ativo/Inativo)**

#### Campo Active:
- **Switch "Visível na loja"**: Controla se o produto aparece para clientes
- **Padrão**: Produtos são criados como ativos (`active: true`)
- **Comportamento**: Produtos inativos ficam ocultos da loja pública

#### Indicadores Visuais:
- 👁️ **Visível**: Badge verde para produtos ativos
- 🚫 **Oculto**: Badge cinza para produtos inativos
- **Estilo Diferenciado**: Produtos inativos ficam acinzentados no admin

### 3. **Endpoints de API Separados**

#### Público (Clientes):
```
GET /api/products
```
- Retorna apenas produtos ativos (`active: true`)
- Usado pela home, catálogo e páginas públicas

#### Admin (Gerenciamento):
```
GET /api/admin/products
```
- Retorna todos os produtos (ativos e inativos)
- Usado pelo painel administrativo

## 🔧 Como Usar

### No Painel Administrativo:

1. **Criar/Editar Produto**:
   - Defina o **Estoque Atual** (quantidade disponível)
   - Configure o **Estoque Mínimo** (alerta de estoque baixo)
   - Use o switch **"Visível na loja"** para controlar visibilidade

2. **Monitorar Estoque**:
   - Produtos com estoque baixo aparecem com badge laranja
   - Produtos sem estoque aparecem com badge vermelha
   - Estoque mínimo é exibido em cada card

3. **Controlar Visibilidade**:
   - Produtos inativos aparecem acinzentados
   - Badge "Oculto" indica produtos não visíveis aos clientes
   - Badge "Visível" confirma produtos ativos

### Na Loja Pública:

- Apenas produtos com `active: true` são exibidos
- Clientes não veem produtos marcados como inativos
- Sistema filtra automaticamente produtos ocultos

## 📊 Schema de Banco

```typescript
products: {
  // ... outros campos
  stock: integer("stock").default(0),           // Estoque atual
  minStock: integer("min_stock").default(5),    // Estoque mínimo
  active: boolean("active").default(true),      // Visibilidade
}
```

## 🚀 Fluxo de Dados

### 1. **Home/Catálogo Público**:
```
Frontend → GET /api/products → Apenas produtos ativos
```

### 2. **Painel Admin**:
```
Frontend → GET /api/admin/products → Todos os produtos
```

### 3. **Atualização de Produto**:
```
Admin atualiza produto → Invalida cache público e admin
```

## 🎨 Indicadores Visuais

### Badges de Status:
- ⭐ **Destaque**: Produtos featured (dourado)
- 🚨 **Sem Estoque**: Estoque zerado (vermelho)
- ⚠️ **Estoque Baixo**: Abaixo do mínimo (laranja)
- 👁️ **Visível**: Produto ativo (verde)
- 🚫 **Oculto**: Produto inativo (cinza)

### Estilos Condicionais:
- **Produtos Inativos**: Opacity reduzida + filtro grayscale
- **Cards de Estoque**: Cores dinâmicas baseadas na quantidade
- **Texto Descritivo**: Cores semânticas para status

## ✅ Melhorias Implementadas

1. ✅ **Controle de estoque mínimo**
2. ✅ **Indicadores visuais de estoque baixo/zerado**
3. ✅ **Sistema de visibilidade ativo/inativo**
4. ✅ **Endpoints separados público/admin**
5. ✅ **Interface melhorada com badges informativas**
6. ✅ **Filtros automáticos na loja pública**
7. ✅ **Cache invalidation adequado**

## 🔮 Próximas Melhorias

- [ ] Histórico de movimentação de estoque
- [ ] Alertas automáticos de estoque baixo
- [ ] Relatórios de produtos inativos
- [ ] Backup automático antes de desativar produtos
- [ ] API para ativação/desativação em massa