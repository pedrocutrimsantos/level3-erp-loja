-- Registro de cobranças enviadas por WhatsApp/SMS.
-- Usado para: evitar reenvio duplicado, exibir histórico na tela, auditar a régua.

CREATE TABLE cobranca_log (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    parcela_id      UUID        NOT NULL REFERENCES parcela_financeira(id),
    titulo_id       UUID        NOT NULL REFERENCES titulo_financeiro(id),
    cliente_id      UUID,                              -- null se título sem cliente cadastrado
    telefone        VARCHAR(20) NOT NULL,
    mensagem        TEXT        NOT NULL,
    regua_dia       INTEGER     NOT NULL,               -- ex: -1=véspera 0=vencimento 3=3 dias atraso
    status          VARCHAR(10) NOT NULL DEFAULT 'ENVIADO', -- ENVIADO | ERRO
    erro_detalhe    TEXT,
    enviado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cobranca_log_parcela_regua ON cobranca_log (parcela_id, regua_dia);
CREATE INDEX cobranca_log_enviado_em    ON cobranca_log (enviado_em DESC);
