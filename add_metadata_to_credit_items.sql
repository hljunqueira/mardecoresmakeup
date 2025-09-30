-- Migração para adicionar coluna metadata na tabela credit_account_items
-- Executar este SQL no banco de dados

-- Adicionar coluna metadata na tabela credit_account_items
ALTER TABLE credit_account_items ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Comentário explicativo
COMMENT ON COLUMN credit_account_items.metadata IS 'Dados extras em JSON para rastrear origem (pedido, manual, etc.)';