-- Script para inserir dados de teste do sistema de avaliações
-- Execute este script no SQL Editor do Supabase para testar o sistema

-- 1. Primeiro, vamos buscar alguns produtos existentes
-- (assumindo que já existem produtos no sistema)

-- 2. Vamos buscar alguns clientes existentes
-- (assumindo que já existem clientes no sistema)

-- 3. Inserir algumas avaliações de exemplo
INSERT INTO product_reviews (product_id, customer_id, rating, title, comment, is_verified_purchase, is_approved) 
VALUES 
  (
    (SELECT id FROM products WHERE active = true ORDER BY created_at DESC LIMIT 1),
    (SELECT id FROM customers ORDER BY created_at DESC LIMIT 1),
    5,
    'Produto excelente!',
    'Muito satisfeita com a compra. A qualidade é excelente e chegou rapidinho. Recomendo!',
    true,
    true
  ),
  (
    (SELECT id FROM products WHERE active = true ORDER BY created_at DESC LIMIT 1 OFFSET 1),
    (SELECT id FROM customers ORDER BY created_at DESC LIMIT 1 OFFSET 1),
    4,
    'Boa qualidade',
    'Produto de boa qualidade, mas o preço poderia ser um pouco melhor.',
    true,
    true
  ),
  (
    (SELECT id FROM products WHERE active = true ORDER BY created_at DESC LIMIT 1),
    (SELECT id FROM customers ORDER BY created_at DESC LIMIT 1 OFFSET 2),
    5,
    'Amei!',
    'Simplesmente perfeito! Cores vibrantes e duração excelente.',
    false,
    true
  ),
  (
    (SELECT id FROM products WHERE active = true ORDER BY created_at DESC LIMIT 1 OFFSET 2),
    (SELECT id FROM customers ORDER BY created_at DESC LIMIT 1),
    3,
    'Razoável',
    'Produto ok, mas esperava um pouco mais pela descrição.',
    true,
    false
  ),
  (
    (SELECT id FROM products WHERE active = true ORDER BY created_at DESC LIMIT 1 OFFSET 1),
    (SELECT id FROM customers ORDER BY created_at DESC LIMIT 1 OFFSET 1),
    5,
    'Perfeito!',
    'Exatamente como descrito. Entrega rápida e produto de qualidade.',
    true,
    true
  );

-- 4. Verificar se as avaliações foram inseridas
SELECT 
  pr.id,
  pr.rating,
  pr.title,
  pr.comment,
  pr.is_approved,
  p.name as product_name,
  c.name as customer_name,
  pr.created_at
FROM product_reviews pr
LEFT JOIN products p ON pr.product_id = p.id
LEFT JOIN customers c ON pr.customer_id = c.id
ORDER BY pr.created_at DESC
LIMIT 10;

-- 5. Verificar se os campos rating e review_count dos produtos foram atualizados
SELECT 
  p.id,
  p.name,
  p.rating,
  p.review_count,
  (
    SELECT AVG(rating)::numeric(2,1) 
    FROM product_reviews pr 
    WHERE pr.product_id = p.id AND pr.is_approved = true
  ) as calculated_rating,
  (
    SELECT COUNT(*) 
    FROM product_reviews pr 
    WHERE pr.product_id = p.id AND pr.is_approved = true
  ) as calculated_count
FROM products p
WHERE p.id IN (
  SELECT DISTINCT product_id 
  FROM product_reviews 
  WHERE product_id IS NOT NULL
)
ORDER BY p.review_count DESC;