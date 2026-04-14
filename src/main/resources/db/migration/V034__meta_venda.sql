-- Metas de vendas por vendedor / mês
CREATE TABLE meta_venda (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    vendedor_id     UUID          NOT NULL REFERENCES usuario(id),
    ano             INTEGER       NOT NULL,
    mes             INTEGER       NOT NULL CHECK (mes >= 1 AND mes <= 12),
    meta_faturamento DECIMAL(14,2) NOT NULL CHECK (meta_faturamento > 0),
    criado_por      UUID          REFERENCES usuario(id),
    criado_em       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (vendedor_id, ano, mes)
);

CREATE INDEX idx_meta_venda_periodo ON meta_venda (ano, mes);
