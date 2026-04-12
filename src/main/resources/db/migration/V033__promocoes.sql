-- Módulo de Promoções / Descontos
-- Suporta: desconto %, desconto fixo R$, preço fixo
-- Escopo: GLOBAL (todos os produtos) ou PRODUTO (lista específica)
-- Condições: período, quantidade mínima, valor mínimo de pedido

CREATE TABLE promocao (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nome                 VARCHAR(120) NOT NULL,
    descricao            TEXT,
    tipo                 VARCHAR(30)  NOT NULL,   -- DESCONTO_PERCENTUAL | DESCONTO_FIXO | PRECO_FIXO
    valor                NUMERIC(10,4) NOT NULL,  -- % (0-100) | R$ fixo | preço final
    escopo               VARCHAR(20)  NOT NULL DEFAULT 'GLOBAL', -- GLOBAL | PRODUTO
    ativo                BOOLEAN      NOT NULL DEFAULT true,
    -- Período de vigência (null = sem restrição)
    data_inicio          DATE,
    data_fim             DATE,
    -- Condição de quantidade mínima por item (metros lineares para MADEIRA, unidades para NORMAL)
    quantidade_minima    NUMERIC(14,4),
    -- Condição de valor mínimo do pedido
    valor_minimo_pedido  NUMERIC(14,2),
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Produtos vinculados (apenas quando escopo = PRODUTO)
CREATE TABLE promocao_produto (
    promocao_id  UUID NOT NULL REFERENCES promocao(id) ON DELETE CASCADE,
    produto_id   UUID NOT NULL REFERENCES produto(id) ON DELETE CASCADE,
    PRIMARY KEY (promocao_id, produto_id)
);

CREATE INDEX promocao_ativo_periodo ON promocao (ativo, data_inicio, data_fim);
CREATE INDEX promocao_produto_produto ON promocao_produto (produto_id);
