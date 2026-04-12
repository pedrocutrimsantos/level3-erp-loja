-- V029: Campos de integração Focus NF-e diretamente na tabela empresa
-- Permite que cada tenant configure suas próprias credenciais fiscais
-- sem depender de variáveis de ambiente globais.

ALTER TABLE empresa
    ADD COLUMN IF NOT EXISTS token_focus_nfe      VARCHAR(120),          -- token API Focus NF-e (nullable = emissão desabilitada)
    ADD COLUMN IF NOT EXISTS cfop_padrao           VARCHAR(5)  NOT NULL DEFAULT '5102',  -- CFOP padrão para vendas a consumidor final
    ADD COLUMN IF NOT EXISTS codigo_municipio_ibge VARCHAR(7),            -- código IBGE 7 dígitos (ex: 2111300 = São Luís-MA)
    ADD COLUMN IF NOT EXISTS serie_nfe             VARCHAR(3)  NOT NULL DEFAULT '001',
    ADD COLUMN IF NOT EXISTS ambiente_nfe          ambiente_nf NOT NULL DEFAULT 'HOMOLOGACAO';

COMMENT ON COLUMN empresa.token_focus_nfe      IS 'Token da API Focus NF-e. NULL = emissão desabilitada para este tenant.';
COMMENT ON COLUMN empresa.cfop_padrao          IS 'CFOP padrão para notas de saída (venda a consumidor final). Ex: 5102.';
COMMENT ON COLUMN empresa.codigo_municipio_ibge IS 'Código do município IBGE (7 dígitos) exigido pela SEFAZ no XML da NF-e.';
COMMENT ON COLUMN empresa.serie_nfe            IS 'Série da NF-e. Padrão 001.';
COMMENT ON COLUMN empresa.ambiente_nfe         IS 'HOMOLOGACAO (padrão seguro) ou PRODUCAO. Exige confirmação explícita para PRODUCAO.';
