-- Adiciona status de devolução ao enum existente
ALTER TYPE status_venda ADD VALUE IF NOT EXISTS 'DEVOLVIDO_PARCIAL';
ALTER TYPE status_venda ADD VALUE IF NOT EXISTS 'DEVOLVIDO';

-- Tabela principal de devolução
CREATE TABLE devolucao (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venda_id    UUID NOT NULL REFERENCES venda(id),
    numero      VARCHAR(30) NOT NULL UNIQUE,
    motivo      TEXT,
    valor_total DECIMAL(14,2) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Itens devolvidos (relação com item_venda original)
CREATE TABLE item_devolucao (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devolucao_id        UUID NOT NULL REFERENCES devolucao(id) ON DELETE CASCADE,
    item_venda_id       UUID NOT NULL REFERENCES item_venda(id),
    quantidade_m_linear DECIMAL(12,3),
    volume_m3           DECIMAL(10,4),
    quantidade_unidade  DECIMAL(14,4),
    valor_devolvido     DECIMAL(14,2) NOT NULL
);
