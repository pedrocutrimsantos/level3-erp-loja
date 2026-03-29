-- Romaneio de entrega gerado a partir de uma venda confirmada
CREATE TABLE IF NOT EXISTS entrega (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venda_id         UUID NOT NULL REFERENCES venda(id),
    numero           VARCHAR(30) NOT NULL UNIQUE,
    status           VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
    observacao       TEXT,
    endereco_entrega TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entrega_venda_id ON entrega(venda_id);
