-- Preço de venda do produto
-- MADEIRA: R$ por metro linear | NORMAL: R$ por unidade
ALTER TABLE produto ADD COLUMN preco_venda DECIMAL(12, 4);
