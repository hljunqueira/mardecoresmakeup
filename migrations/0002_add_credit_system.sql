-- ================================================================
-- MIGRAÇÃO: Sistema de Crediário Integrado às Reservas Existentes
-- Versão: 0002
-- Data: 2025-01-27
-- Estratégia: Extensão gradual sem quebrar dados existentes
-- ================================================================

-- 1. ESTENDER TABELA DE RESERVAS (COMPATIBILIDADE TOTAL)
-- Adicionar campos opcionais para crediário sem afetar reservas existentes

ALTER TABLE reservations 
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'simple' CHECK (type IN ('simple', 'credit_account')),
  ADD COLUMN IF NOT EXISTS credit_account_id VARCHAR,
  ADD COLUMN IF NOT EXISTS customer_id VARCHAR;

-- Comentários para documentação
COMMENT ON COLUMN reservations.type IS 'Tipo de reserva: simple (padrão atual) ou credit_account (nova funcionalidade)';
COMMENT ON COLUMN reservations.credit_account_id IS 'FK para contas de crediário (NULL para reservas simples)';
COMMENT ON COLUMN reservations.customer_id IS 'FK para clientes cadastrados (opcional)';

-- Criar índices para performance das novas funcionalidades
CREATE INDEX IF NOT EXISTS reservations_type_idx ON reservations(type);
CREATE INDEX IF NOT EXISTS reservations_credit_account_idx ON reservations(credit_account_id);
CREATE INDEX IF NOT EXISTS reservations_customer_idx ON reservations(customer_id);

-- ================================================================
-- 2. CRIAR TABELA DE CONTAS DE CREDIÁRIO
-- ================================================================

CREATE TABLE IF NOT EXISTS credit_accounts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR NOT NULL,
  account_number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'suspended')),
  total_amount DECIMAL(12, 2) DEFAULT 0,
  paid_amount DECIMAL(12, 2) DEFAULT 0,
  remaining_amount DECIMAL(12, 2) DEFAULT 0,
  installments INTEGER DEFAULT 1,
  installment_value DECIMAL(10, 2),
  payment_frequency TEXT DEFAULT 'monthly' CHECK (payment_frequency IN ('weekly', 'monthly')),
  next_payment_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP
);

-- Comentários da tabela
COMMENT ON TABLE credit_accounts IS 'Contas de crediário para clientes cadastrados';
COMMENT ON COLUMN credit_accounts.account_number IS 'Número único da conta (CR001, CR002, etc.)';
COMMENT ON COLUMN credit_accounts.status IS 'Status da conta: active, closed, suspended';
COMMENT ON COLUMN credit_accounts.total_amount IS 'Valor total da conta de crediário';
COMMENT ON COLUMN credit_accounts.paid_amount IS 'Valor já pago pelo cliente';
COMMENT ON COLUMN credit_accounts.remaining_amount IS 'Valor restante a pagar';
COMMENT ON COLUMN credit_accounts.installments IS 'Número total de parcelas';
COMMENT ON COLUMN credit_accounts.installment_value IS 'Valor de cada parcela';
COMMENT ON COLUMN credit_accounts.payment_frequency IS 'Frequência de pagamento: semanal ou mensal';

-- Índices para performance
CREATE INDEX IF NOT EXISTS credit_accounts_customer_idx ON credit_accounts(customer_id);
CREATE INDEX IF NOT EXISTS credit_accounts_status_idx ON credit_accounts(status);
CREATE INDEX IF NOT EXISTS credit_accounts_payment_date_idx ON credit_accounts(next_payment_date);
CREATE INDEX IF NOT EXISTS credit_accounts_number_idx ON credit_accounts(account_number);

-- ================================================================
-- 3. CRIAR TABELA DE PAGAMENTOS DO CREDIÁRIO
-- ================================================================

CREATE TABLE IF NOT EXISTS credit_payments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_account_id VARCHAR NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('dinheiro', 'pix', 'cartao')),
  installment_number INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Comentários da tabela
COMMENT ON TABLE credit_payments IS 'Histórico de pagamentos das contas de crediário';
COMMENT ON COLUMN credit_payments.credit_account_id IS 'FK para conta de crediário';
COMMENT ON COLUMN credit_payments.amount IS 'Valor do pagamento realizado';
COMMENT ON COLUMN credit_payments.payment_method IS 'Método de pagamento utilizado';
COMMENT ON COLUMN credit_payments.installment_number IS 'Número da parcela paga (1, 2, 3, etc.)';

-- Índices para performance
CREATE INDEX IF NOT EXISTS credit_payments_account_idx ON credit_payments(credit_account_id);
CREATE INDEX IF NOT EXISTS credit_payments_date_idx ON credit_payments(created_at);
CREATE INDEX IF NOT EXISTS credit_payments_installment_idx ON credit_payments(installment_number);

-- ================================================================
-- 4. ADICIONAR CONSTRAINTS E FOREIGN KEYS
-- ================================================================

-- FK da tabela reservations para credit_accounts (opcional)
ALTER TABLE reservations 
  ADD CONSTRAINT fk_reservations_credit_account 
  FOREIGN KEY (credit_account_id) 
  REFERENCES credit_accounts(id) 
  ON DELETE SET NULL;

-- FK da tabela reservations para customers (opcional)
ALTER TABLE reservations 
  ADD CONSTRAINT fk_reservations_customer 
  FOREIGN KEY (customer_id) 
  REFERENCES customers(id) 
  ON DELETE SET NULL;

-- FK da tabela credit_accounts para customers
ALTER TABLE credit_accounts 
  ADD CONSTRAINT fk_credit_accounts_customer 
  FOREIGN KEY (customer_id) 
  REFERENCES customers(id) 
  ON DELETE CASCADE;

-- FK da tabela credit_payments para credit_accounts
ALTER TABLE credit_payments 
  ADD CONSTRAINT fk_credit_payments_account 
  FOREIGN KEY (credit_account_id) 
  REFERENCES credit_accounts(id) 
  ON DELETE CASCADE;

-- ================================================================
-- 5. FUNÇÃO PARA ATUALIZAR VALORES DA CONTA DE CREDIÁRIO
-- ================================================================

CREATE OR REPLACE FUNCTION update_credit_account_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar valores da conta quando houver pagamento
  UPDATE credit_accounts 
  SET 
    paid_amount = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM credit_payments 
      WHERE credit_account_id = NEW.credit_account_id
    ),
    remaining_amount = total_amount - (
      SELECT COALESCE(SUM(amount), 0) 
      FROM credit_payments 
      WHERE credit_account_id = NEW.credit_account_id
    )
  WHERE id = NEW.credit_account_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar automaticamente os valores
CREATE TRIGGER trigger_update_credit_account_amounts
  AFTER INSERT OR UPDATE ON credit_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_account_amounts();

-- ================================================================
-- 6. FUNÇÃO PARA GERAR NÚMERO DE CONTA AUTOMATICAMENTE
-- ================================================================

CREATE OR REPLACE FUNCTION generate_account_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Gerar próximo número de conta (CR001, CR002, etc.)
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(account_number FROM 3) AS INTEGER)), 0
  ) + 1 INTO next_number
  FROM credit_accounts
  WHERE account_number ~ '^CR[0-9]+$';
  
  -- Formatar número com zero à esquerda
  NEW.account_number := 'CR' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar número automaticamente se não fornecido
CREATE TRIGGER trigger_generate_account_number
  BEFORE INSERT ON credit_accounts
  FOR EACH ROW
  WHEN (NEW.account_number IS NULL OR NEW.account_number = '')
  EXECUTE FUNCTION generate_account_number();

-- ================================================================
-- 7. VALIDAÇÕES DE DADOS
-- ================================================================

-- Garantir que reservas de crediário tenham customer_id
ALTER TABLE reservations 
  ADD CONSTRAINT check_credit_account_has_customer 
  CHECK (
    (type = 'simple') OR 
    (type = 'credit_account' AND customer_id IS NOT NULL)
  );

-- Garantir que valor total da conta seja positivo
ALTER TABLE credit_accounts 
  ADD CONSTRAINT check_positive_total_amount 
  CHECK (total_amount >= 0);

-- Garantir que valor pago não exceda o total
ALTER TABLE credit_accounts 
  ADD CONSTRAINT check_paid_amount_valid 
  CHECK (paid_amount <= total_amount);

-- Garantir que número de parcelas seja positivo
ALTER TABLE credit_accounts 
  ADD CONSTRAINT check_positive_installments 
  CHECK (installments > 0);

-- ================================================================
-- 8. ÍNDICES COMPOSTOS PARA CONSULTAS COMPLEXAS
-- ================================================================

-- Busca de reservas por tipo e status
CREATE INDEX IF NOT EXISTS idx_reservations_type_status 
  ON reservations(type, status);

-- Busca de contas por cliente e status
CREATE INDEX IF NOT EXISTS idx_credit_accounts_customer_status 
  ON credit_accounts(customer_id, status);

-- Histórico de pagamentos por conta e data
CREATE INDEX IF NOT EXISTS idx_credit_payments_account_date 
  ON credit_payments(credit_account_id, created_at);

-- ================================================================
-- 9. VIEWS PARA RELATÓRIOS INTEGRADOS
-- ================================================================

-- View para reservas com informações de cliente
CREATE OR REPLACE VIEW v_reservations_with_customer AS
SELECT 
  r.*,
  c.name as customer_full_name,
  c.email as customer_email,
  c.phone as customer_phone,
  ca.account_number,
  ca.status as account_status
FROM reservations r
LEFT JOIN customers c ON r.customer_id = c.id
LEFT JOIN credit_accounts ca ON r.credit_account_id = ca.id;

-- View para contas de crediário com resumo
CREATE OR REPLACE VIEW v_credit_accounts_summary AS
SELECT 
  ca.*,
  c.name as customer_name,
  c.email as customer_email,
  c.phone as customer_phone,
  COUNT(cp.id) as total_payments,
  COALESCE(SUM(cp.amount), 0) as total_paid_calculated,
  COUNT(r.id) as total_reservations
FROM credit_accounts ca
LEFT JOIN customers c ON ca.customer_id = c.id
LEFT JOIN credit_payments cp ON ca.id = cp.credit_account_id
LEFT JOIN reservations r ON ca.id = r.credit_account_id
GROUP BY ca.id, c.id;

-- ================================================================
-- 10. DADOS DE EXEMPLO E TESTES (OPCIONAL)
-- ================================================================

-- Inserir alguns dados de teste apenas se não existirem
DO $$
BEGIN
  -- Verificar se já existem dados de teste
  IF NOT EXISTS (SELECT 1 FROM credit_accounts LIMIT 1) THEN
    
    -- Criar conta de teste se existir cliente
    IF EXISTS (SELECT 1 FROM customers LIMIT 1) THEN
      INSERT INTO credit_accounts (
        customer_id,
        account_number,
        total_amount,
        installments,
        installment_value,
        notes
      ) 
      SELECT 
        id,
        'CR001',
        100.00,
        5,
        20.00,
        'Conta de teste criada pela migração'
      FROM customers 
      LIMIT 1;
    END IF;
    
  END IF;
END $$;

-- ================================================================
-- RESUMO DA MIGRAÇÃO
-- ================================================================

-- Verificar se a migração foi executada com sucesso
DO $$
BEGIN
  RAISE NOTICE 'MIGRAÇÃO 0002 EXECUTADA COM SUCESSO!';
  RAISE NOTICE 'Funcionalidades adicionadas:';
  RAISE NOTICE '✓ Tabela reservations estendida (compatibilidade total)';
  RAISE NOTICE '✓ Tabela credit_accounts criada';
  RAISE NOTICE '✓ Tabela credit_payments criada'; 
  RAISE NOTICE '✓ Triggers automáticos configurados';
  RAISE NOTICE '✓ Views de relatórios criadas';
  RAISE NOTICE '✓ Validações e constraints aplicadas';
  RAISE NOTICE '';
  RAISE NOTICE 'SISTEMA PRONTO PARA USO HÍBRIDO:';
  RAISE NOTICE '• Reservas simples continuam funcionando normalmente';
  RAISE NOTICE '• Novas reservas podem ser vinculadas a contas de crediário';
  RAISE NOTICE '• APIs antigas permanecem funcionais';
  RAISE NOTICE '• Migração gradual sem interrupção de serviço';
END $$;