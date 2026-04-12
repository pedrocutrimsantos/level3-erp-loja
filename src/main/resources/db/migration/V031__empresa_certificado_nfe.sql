-- Armazena o certificado A1 (PKCS#12) do emitente diretamente no banco.
-- Permite que o usuário faça upload do .pfx pela tela de Empresa, sem precisar
-- acessar o servidor para configurar variáveis de ambiente.
--
-- Nota de segurança: a senha é armazenada em texto simples nesta versão.
-- Para ambientes de produção com requisito de segurança elevado, considere
-- criptografar com uma chave derivada de variável de ambiente (NFE_MASTER_KEY).

ALTER TABLE empresa
    ADD COLUMN IF NOT EXISTS certificado_nfe_bytes      BYTEA,
    ADD COLUMN IF NOT EXISTS certificado_nfe_senha      VARCHAR(120),
    ADD COLUMN IF NOT EXISTS certificado_nfe_nome       VARCHAR(200),   -- Common Name do titular (para exibição)
    ADD COLUMN IF NOT EXISTS certificado_nfe_vencimento TIMESTAMPTZ;    -- data de expiração (evita reabrir o KeyStore)
