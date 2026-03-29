-- Configuração fiscal da empresa
CREATE TABLE empresa_fiscal (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id              UUID NOT NULL REFERENCES empresa(id),
    cnpj                    VARCHAR(18) NOT NULL,
    razao_social            VARCHAR(150) NOT NULL,
    inscricao_estadual      VARCHAR(20),
    regime_tributario       regime_tributario NOT NULL,
    uf_sede                 CHAR(2) NOT NULL,
    certificado_digital_path VARCHAR(500),
    certificado_senha_hash  VARCHAR(255),
    certificado_validade    DATE,
    ambiente_nfe            ambiente_nf NOT NULL DEFAULT 'HOMOLOGACAO',
    serie_nfe_padrao        VARCHAR(3) NOT NULL DEFAULT '1',
    serie_nfce_padrao       VARCHAR(3) NOT NULL DEFAULT '1',
    numero_nfe_atual        INTEGER NOT NULL DEFAULT 0,
    numero_nfce_atual       INTEGER NOT NULL DEFAULT 0,
    token_ibpt              VARCHAR(100),
    csc_nfce                VARCHAR(100)
);

-- Operação fiscal
CREATE TABLE operacao_fiscal (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo              VARCHAR(40) NOT NULL UNIQUE,
    descricao           VARCHAR(100) NOT NULL,
    natureza_operacao   VARCHAR(100) NOT NULL,
    tipo                tipo_operacao_fiscal NOT NULL,
    ativo               BOOLEAN NOT NULL DEFAULT TRUE
);

-- Regra fiscal (motor central)
CREATE TABLE regra_fiscal (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id                  UUID NOT NULL REFERENCES empresa(id),
    grupo_fiscal_produto_id     UUID REFERENCES grupo_fiscal_produto(id),
    operacao_fiscal_id          UUID NOT NULL REFERENCES operacao_fiscal(id),
    regime_tributario           regime_tributario,
    uf_origem                   CHAR(2),
    uf_destino                  CHAR(2),
    tipo_cliente                VARCHAR(30),
    cfop                        VARCHAR(5) NOT NULL,
    cst_icms                    VARCHAR(3),
    csosn                       VARCHAR(3),
    aliquota_icms               DECIMAL(5,2) NOT NULL DEFAULT 0,
    modalidade_bc_icms          VARCHAR(20),
    reducao_bc_icms             DECIMAL(5,4) NOT NULL DEFAULT 0,
    cst_pis                     VARCHAR(2) NOT NULL,
    aliquota_pis                DECIMAL(5,4) NOT NULL DEFAULT 0,
    cst_cofins                  VARCHAR(2) NOT NULL,
    aliquota_cofins             DECIMAL(5,4) NOT NULL DEFAULT 0,
    cst_ipi                     VARCHAR(2),
    aliquota_ipi                DECIMAL(5,2) NOT NULL DEFAULT 0,
    incide_frete                BOOLEAN NOT NULL DEFAULT TRUE,
    prioridade                  INTEGER NOT NULL DEFAULT 0,
    ativo                       BOOLEAN NOT NULL DEFAULT TRUE
);

-- Configuração de unidade tributável
CREATE TABLE configuracao_unidade_tributavel (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_fiscal_produto_id     UUID NOT NULL REFERENCES grupo_fiscal_produto(id),
    unidade_comercial           VARCHAR(6) NOT NULL,
    unidade_tributavel          VARCHAR(6) NOT NULL,
    fator_conversao_tributavel  DECIMAL(12,8) NOT NULL DEFAULT 1,
    observacao                  TEXT
);

-- Snapshot tributário por item de NF
CREATE TABLE nf_item (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nf_id                       UUID NOT NULL REFERENCES nf_emitida(id),
    item_venda_id               UUID REFERENCES item_venda(id),
    numero_item                 INTEGER NOT NULL,
    codigo_produto              VARCHAR(30) NOT NULL,
    descricao                   VARCHAR(120) NOT NULL,
    ncm                         CHAR(8) NOT NULL,
    cfop                        VARCHAR(5) NOT NULL,
    unidade_comercial           VARCHAR(6) NOT NULL,
    quantidade_comercial        DECIMAL(14,4) NOT NULL,
    valor_unitario_comercial    DECIMAL(14,4) NOT NULL,
    unidade_tributavel          VARCHAR(6) NOT NULL,
    quantidade_tributavel       DECIMAL(14,4) NOT NULL,
    valor_unitario_tributavel   DECIMAL(14,4) NOT NULL,
    valor_total                 DECIMAL(14,2) NOT NULL
);

CREATE TABLE nf_item_snapshot_tributario (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nf_item_id          UUID NOT NULL UNIQUE REFERENCES nf_item(id),
    regra_fiscal_id     UUID NOT NULL REFERENCES regra_fiscal(id),
    dimensao_id         UUID REFERENCES dimensao_madeira(id),
    fator_conversao_snap DECIMAL(12,8),
    cfop                VARCHAR(5) NOT NULL,
    cst_icms            VARCHAR(3),
    csosn               VARCHAR(3),
    aliquota_icms       DECIMAL(5,2) NOT NULL DEFAULT 0,
    cst_pis             VARCHAR(2) NOT NULL,
    aliquota_pis        DECIMAL(5,4) NOT NULL DEFAULT 0,
    cst_cofins          VARCHAR(2) NOT NULL,
    aliquota_cofins     DECIMAL(5,4) NOT NULL DEFAULT 0,
    data_snapshot       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Alíquotas interestaduais
CREATE TABLE aliquota_icms_interestadual (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uf_origem       CHAR(2) NOT NULL,
    uf_destino      CHAR(2) NOT NULL,
    aliquota_pct    DECIMAL(5,2) NOT NULL,
    vigente_desde   DATE NOT NULL,
    vigente_ate     DATE,
    UNIQUE (uf_origem, uf_destino, vigente_desde)
);

CREATE TABLE aliquota_icms_interna_uf (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uf                  CHAR(2) NOT NULL,
    aliquota_padrao_pct DECIMAL(5,2) NOT NULL,
    segmento            VARCHAR(40),
    vigente_desde       DATE NOT NULL,
    vigente_ate         DATE,
    UNIQUE (uf, segmento, vigente_desde)
);
