-- Migração para criar tabela de reservas
-- Data: 2025-01-22

CREATE TABLE IF NOT EXISTS reservations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id varchar NOT NULL,
  customer_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price decimal(10,2) NOT NULL,
  payment_date timestamp NOT NULL,
  status text DEFAULT 'active',
  notes text,
  created_at timestamp DEFAULT now(),
  completed_at timestamp
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS reservations_product_idx ON reservations(product_id);
CREATE INDEX IF NOT EXISTS reservations_status_idx ON reservations(status);
CREATE INDEX IF NOT EXISTS reservations_payment_date_idx ON reservations(payment_date);

-- Comentários para documentação
COMMENT ON TABLE reservations IS 'Tabela para armazenar reservas de produtos';
COMMENT ON COLUMN reservations.product_id IS 'ID do produto reservado';
COMMENT ON COLUMN reservations.customer_name IS 'Nome do cliente que fez a reserva';
COMMENT ON COLUMN reservations.quantity IS 'Quantidade de produtos reservados';
COMMENT ON COLUMN reservations.unit_price IS 'Preço unitário no momento da reserva';
COMMENT ON COLUMN reservations.payment_date IS 'Data prevista para pagamento';
COMMENT ON COLUMN reservations.status IS 'Status da reserva: active, sold, cancelled, returned';
COMMENT ON COLUMN reservations.notes IS 'Observações sobre a reserva';
COMMENT ON COLUMN reservations.created_at IS 'Data de criação da reserva';
COMMENT ON COLUMN reservations.completed_at IS 'Data de finalização da reserva';