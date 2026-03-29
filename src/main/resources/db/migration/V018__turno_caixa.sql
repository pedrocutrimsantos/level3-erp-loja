-- Turno de caixa: abertura e fechamento do dia
CREATE TABLE IF NOT EXISTS turno_caixa (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data             DATE NOT NULL UNIQUE,
    valor_abertura   NUMERIC(12, 2) NOT NULL DEFAULT 0,
    valor_fechamento NUMERIC(12, 2),
    status           VARCHAR(20) NOT NULL DEFAULT 'ABERTO',   -- ABERTO | FECHADO
    observacao       TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Sangrias: saídas avulsas registradas durante o turno
CREATE TABLE IF NOT EXISTS sangria_caixa (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_id    UUID NOT NULL REFERENCES turno_caixa(id),
    descricao   VARCHAR(200) NOT NULL,
    valor       NUMERIC(12, 2) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sangria_turno_id ON sangria_caixa(turno_id);
