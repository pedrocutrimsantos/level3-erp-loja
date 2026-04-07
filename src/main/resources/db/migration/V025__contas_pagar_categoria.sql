-- V025: adiciona campo categoria em titulo_financeiro
-- Categorias de despesa: FORNECEDOR, ALUGUEL, FOLHA, IMPOSTOS, SERVICOS, OUTROS
ALTER TABLE titulo_financeiro
    ADD COLUMN IF NOT EXISTS categoria VARCHAR(40) NULL;
