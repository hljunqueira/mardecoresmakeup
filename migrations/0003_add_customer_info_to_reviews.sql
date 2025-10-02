-- Adicionar campos de cliente diretamente na tabela de avaliações
-- Para simplificar o sistema focando na avaliação do produto

-- Adicionar os novos campos
ALTER TABLE product_reviews 
ADD COLUMN customer_name text,
ADD COLUMN customer_email text;

-- Tornar customer_id opcional (remover NOT NULL constraint)
ALTER TABLE product_reviews 
ALTER COLUMN customer_id DROP NOT NULL;

-- Migrar dados existentes (copiar nome e email dos clientes existentes)
UPDATE product_reviews 
SET customer_name = customers.name,
    customer_email = customers.email
FROM customers 
WHERE product_reviews.customer_id = customers.id;

-- Adicionar um comentário explicativo
COMMENT ON COLUMN product_reviews.customer_name IS 'Nome do avaliador (simplificado, sem necessidade de cadastro)';
COMMENT ON COLUMN product_reviews.customer_email IS 'Email do avaliador (opcional)';
COMMENT ON COLUMN product_reviews.customer_id IS 'ID do cliente (opcional, para compatibilidade com compras verificadas)';