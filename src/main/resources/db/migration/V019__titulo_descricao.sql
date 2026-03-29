-- Descrição livre para títulos a pagar lançados manualmente (despesas avulsas)
ALTER TABLE titulo_financeiro
    ADD COLUMN IF NOT EXISTS descricao VARCHAR(120);
