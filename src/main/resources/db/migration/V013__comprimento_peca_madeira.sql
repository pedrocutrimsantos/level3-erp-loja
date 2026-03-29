-- Comprimento fixo da peça (em metros) — opcional, habilita modo "venda por peça"
-- Exemplo: tábua de 10m → comprimento_peca_m = 10.0000
-- Null = produto não tem peça de comprimento fixo (vende só por metro linear)
ALTER TABLE produto
    ADD COLUMN IF NOT EXISTS comprimento_peca_m DECIMAL(10, 4) NULL;
