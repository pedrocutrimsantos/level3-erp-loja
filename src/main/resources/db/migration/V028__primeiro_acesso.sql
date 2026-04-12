-- V028: Fluxo de primeiro acesso
-- 1. senha_hash passa a ser nullable (usuários sem senha enquanto não concluem o primeiro acesso)
-- 2. Flag primeiro_acesso_pendente na tabela usuario
-- 3. Tabela de tokens de primeiro acesso (hash, expiração, tentativas, reenvios)

ALTER TABLE usuario
    ALTER COLUMN senha_hash DROP NOT NULL;

ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS primeiro_acesso_pendente BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS primeiro_acesso_token (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID        NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    token_hash      VARCHAR(64) NOT NULL,          -- SHA-256 hex do token numérico de 6 dígitos
    canal_envio     VARCHAR(20) NOT NULL DEFAULT 'WHATSAPP',
    expira_em       TIMESTAMPTZ NOT NULL,
    utilizado_em    TIMESTAMPTZ,
    tentativas      INT         NOT NULL DEFAULT 0,
    bloqueado       BOOLEAN     NOT NULL DEFAULT FALSE,
    reenvios        INT         NOT NULL DEFAULT 0,
    ultimo_reenvio  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pat_usuario_id ON primeiro_acesso_token(usuario_id);
