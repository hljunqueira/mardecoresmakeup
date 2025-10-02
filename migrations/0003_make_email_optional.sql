-- Migração para tornar o campo email opcional na tabela customers
-- Remove a constraint NOT NULL do campo email

ALTER TABLE customers ALTER COLUMN email DROP NOT NULL;

-- Também podemos atualizar clientes existentes que podem não ter email
-- definindo um valor padrão ou deixando NULL (dependendo da necessidade)

-- Se quiser definir um email padrão para clientes sem email:
-- UPDATE customers SET email = name || '@cliente.local' WHERE email IS NULL OR email = '';

-- Criar índice para performance em consultas por email (quando não for NULL)
CREATE INDEX IF NOT EXISTS customers_email_not_null_idx ON customers (email) WHERE email IS NOT NULL;