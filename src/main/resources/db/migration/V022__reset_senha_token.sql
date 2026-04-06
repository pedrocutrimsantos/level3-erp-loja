-- Suporte a recuperação de senha por token temporário
ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS reset_token         VARCHAR(64),
    ADD COLUMN IF NOT EXISTS reset_token_expira  TIMESTAMPTZ;
