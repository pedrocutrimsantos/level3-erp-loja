-- Extensões
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tipos enum
CREATE TYPE tipo_produto AS ENUM ('MADEIRA', 'NORMAL');
CREATE TYPE tipo_beneficiamento AS ENUM ('BRUTO', 'SERRADO', 'BENEFICIADO', 'LAMINADO', 'COMPENSADO');
CREATE TYPE tipo_deposito AS ENUM ('PRINCIPAL', 'SOBRAS', 'SEGUNDA', 'TRANSITO');
CREATE TYPE tipo_sublote AS ENUM ('NORMAL', 'SOBRA', 'SEGUNDA_QUALIDADE');
CREATE TYPE status_lote AS ENUM ('ATIVO', 'ESGOTADO', 'CANCELADO');
CREATE TYPE tipo_movimentacao AS ENUM (
    'ENTRADA_COMPRA', 'SAIDA_VENDA', 'RESERVA', 'LIBERACAO_RESERVA',
    'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'PERDA',
    'TRANSFERENCIA_SAIDA', 'TRANSFERENCIA_ENTRADA',
    'SOBRA_ENTRADA', 'DEVOLUCAO_ENTRADA', 'DEVOLUCAO_SAIDA'
);
CREATE TYPE sinal_movimentacao AS ENUM ('POSITIVO', 'NEGATIVO');
CREATE TYPE motivo_perda AS ENUM ('UMIDADE', 'APODRECIMENTO', 'ERRO_CORTE', 'DANO_FISICO', 'FURTO', 'OUTRO');
CREATE TYPE status_perda AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');
CREATE TYPE status_venda AS ENUM ('RASCUNHO', 'ORCAMENTO', 'CONFIRMADO', 'EM_ENTREGA', 'ENTREGUE_PARCIAL', 'CONCLUIDO', 'CANCELADO');
CREATE TYPE tipo_venda AS ENUM ('BALCAO', 'COM_ENTREGA', 'ORCAMENTO');
CREATE TYPE status_item_entrega AS ENUM ('PENDENTE', 'ENTREGUE', 'DEVOLVIDO');
CREATE TYPE tipo_pessoa AS ENUM ('PJ', 'PF', 'ANONIMO');
CREATE TYPE tipo_contribuinte AS ENUM ('PF_CONSUMIDOR', 'PJ_CONTRIBUINTE', 'PJ_NAO_CONTRIBUINTE');
CREATE TYPE status_inadimplencia AS ENUM ('REGULAR', 'ALERTA', 'BLOQUEADO');
CREATE TYPE status_compra AS ENUM ('RASCUNHO', 'APROVADO', 'ENVIADO', 'RECEBIDO_PARCIAL', 'RECEBIDO_TOTAL', 'CANCELADO');
CREATE TYPE criterio_rateio_frete AS ENUM ('PROPORCIONAL_M3', 'PROPORCIONAL_VALOR');
CREATE TYPE status_nf AS ENUM ('PENDENTE', 'AGUARDANDO', 'AUTORIZADA', 'REJEITADA', 'CANCELADA', 'DENEGADA', 'CONTINGENCIA', 'INUTILIZADA');
CREATE TYPE modelo_nf AS ENUM ('NF55', 'NFC65', 'NFENTRADA');
CREATE TYPE ambiente_nf AS ENUM ('PRODUCAO', 'HOMOLOGACAO');
CREATE TYPE regime_tributario AS ENUM ('SIMPLES', 'LUCRO_PRESUMIDO', 'LUCRO_REAL');
CREATE TYPE tipo_operacao_fiscal AS ENUM ('SAIDA', 'ENTRADA');
CREATE TYPE status_titulo AS ENUM ('ABERTO', 'PAGO_PARCIAL', 'PAGO', 'VENCIDO', 'CANCELADO', 'NEGOCIADO');
CREATE TYPE tipo_titulo AS ENUM ('RECEBER', 'PAGAR');
CREATE TYPE forma_pagamento AS ENUM ('DINHEIRO', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'PIX', 'BOLETO', 'CHEQUE', 'FIADO');
CREATE TYPE status_parcela AS ENUM ('ABERTO', 'PAGO', 'VENCIDO', 'CANCELADO');
CREATE TYPE status_caixa AS ENUM ('ABERTO', 'FECHADO');
CREATE TYPE tipo_movimentacao_caixa AS ENUM ('SANGRIA', 'SUPRIMENTO', 'VENDA', 'TROCO', 'DEVOLUCAO', 'ABERTURA', 'FECHAMENTO');
CREATE TYPE tipo_entrega AS ENUM ('PROPRIO', 'TERCEIRIZADO', 'GRATIS');
CREATE TYPE modalidade_frete_nf AS ENUM ('CIF', 'FOB', 'TERCEIROS', 'SEM_FRETE');
CREATE TYPE status_entrega AS ENUM ('AGENDADA', 'EM_SEPARACAO', 'CARREGADA', 'EM_ROTA', 'ENTREGUE', 'DEVOLVIDA_PARCIAL', 'DEVOLVIDA_TOTAL');
CREATE TYPE operacao_auditoria AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- Empresa
CREATE TABLE empresa (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cnpj            VARCHAR(18) NOT NULL UNIQUE,
    razao_social    VARCHAR(150) NOT NULL,
    nome_fantasia   VARCHAR(100),
    ie              VARCHAR(20),
    uf              CHAR(2) NOT NULL,
    cep             CHAR(9) NOT NULL,
    logradouro      VARCHAR(150) NOT NULL,
    numero          VARCHAR(10) NOT NULL,
    bairro          VARCHAR(80) NOT NULL,
    cidade          VARCHAR(80) NOT NULL,
    regime_tributario regime_tributario NOT NULL DEFAULT 'SIMPLES',
    ativa           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Usuário e perfil
CREATE TABLE perfil (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo      VARCHAR(30) NOT NULL UNIQUE,
    descricao   VARCHAR(100) NOT NULL,
    ativo       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE usuario (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome            VARCHAR(120) NOT NULL,
    email           VARCHAR(120) NOT NULL UNIQUE,
    senha_hash      VARCHAR(255) NOT NULL,
    perfil_id       UUID NOT NULL REFERENCES perfil(id),
    vendedor        BOOLEAN NOT NULL DEFAULT FALSE,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acesso   TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE permissao (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    perfil_id   UUID NOT NULL REFERENCES perfil(id),
    modulo      VARCHAR(20) NOT NULL,
    acao        VARCHAR(20) NOT NULL,
    permitido   BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (perfil_id, modulo, acao)
);

-- Unidade de medida
CREATE TABLE unidade_medida (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo          VARCHAR(10) NOT NULL UNIQUE,
    descricao       VARCHAR(60) NOT NULL,
    tipo            VARCHAR(20) NOT NULL,
    casas_decimais  INTEGER NOT NULL DEFAULT 2
);

-- Espécie de madeira
CREATE TABLE especie_madeira (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome                VARCHAR(80) NOT NULL UNIQUE,
    nome_cientifico     VARCHAR(120),
    ncm_padrao          CHAR(8),
    densidade_kg_m3     DECIMAL(8,3),
    ativo               BOOLEAN NOT NULL DEFAULT TRUE
);

-- Grupo fiscal
CREATE TABLE grupo_fiscal_produto (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo      VARCHAR(30) NOT NULL UNIQUE,
    descricao   VARCHAR(100) NOT NULL,
    ncm_padrao  CHAR(8),
    observacao  TEXT
);

-- Produto base
CREATE TABLE produto (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_interno  VARCHAR(30) NOT NULL UNIQUE,
    nome_comercial  VARCHAR(120) NOT NULL,
    tipo            tipo_produto NOT NULL,
    ncm             CHAR(8) NOT NULL,
    grupo_fiscal_id UUID NOT NULL REFERENCES grupo_fiscal_produto(id),
    unidade_venda_id UUID NOT NULL REFERENCES unidade_medida(id),
    margem_minima_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by      UUID NOT NULL REFERENCES usuario(id)
);

CREATE TABLE produto_madeira (
    id                   UUID PRIMARY KEY REFERENCES produto(id),
    especie_id           UUID NOT NULL REFERENCES especie_madeira(id),
    tipo_beneficiamento  tipo_beneficiamento NOT NULL,
    comprimento_padrao_m DECIMAL(6,3)
    -- Validação de tipo='MADEIRA' feita na camada de aplicação (ProdutoService)
    -- PostgreSQL não suporta subqueries em CHECK constraints
);

CREATE TABLE dimensao_madeira (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id          UUID NOT NULL REFERENCES produto(id),
    versao              INTEGER NOT NULL DEFAULT 1,
    espessura_mm        DECIMAL(6,2) NOT NULL,
    largura_mm          DECIMAL(6,2) NOT NULL,
    espessura_m         DECIMAL(8,6) NOT NULL GENERATED ALWAYS AS (espessura_mm / 1000) STORED,
    largura_m           DECIMAL(8,6) NOT NULL GENERATED ALWAYS AS (largura_mm / 1000) STORED,
    fator_conversao     DECIMAL(12,8) NOT NULL,
    vigente_desde       TIMESTAMP NOT NULL DEFAULT NOW(),
    vigente_ate         TIMESTAMP,
    motivo_alteracao    VARCHAR(255),
    alterado_por        UUID REFERENCES usuario(id),
    CONSTRAINT chk_espessura_positiva CHECK (espessura_mm > 0),
    CONSTRAINT chk_largura_positiva CHECK (largura_mm > 0),
    CONSTRAINT unique_dimensao_vigente UNIQUE (produto_id, vigente_ate) DEFERRABLE
);

CREATE TABLE produto_normal (
    id                  UUID PRIMARY KEY REFERENCES produto(id),
    unidade_compra_id   UUID NOT NULL REFERENCES unidade_medida(id),
    estoque_minimo      DECIMAL(12,4) NOT NULL DEFAULT 0,
    estoque_maximo      DECIMAL(12,4)
);

-- Depósito
CREATE TABLE deposito (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo      VARCHAR(20) NOT NULL UNIQUE,
    descricao   VARCHAR(100) NOT NULL,
    empresa_id  UUID NOT NULL REFERENCES empresa(id),
    tipo        tipo_deposito NOT NULL DEFAULT 'PRINCIPAL',
    ativo       BOOLEAN NOT NULL DEFAULT TRUE
);

-- Saldo de estoque
CREATE TABLE estoque_saldo (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id                  UUID NOT NULL REFERENCES produto(id),
    deposito_id                 UUID NOT NULL REFERENCES deposito(id),
    saldo_m3_total              DECIMAL(12,4),
    saldo_m3_disponivel         DECIMAL(12,4),
    saldo_m3_reservado          DECIMAL(12,4),
    saldo_unidade_total         DECIMAL(14,4),
    saldo_unidade_disponivel    DECIMAL(14,4),
    saldo_unidade_reservado     DECIMAL(14,4),
    custo_medio_m3              DECIMAL(12,4),
    data_ultima_atualizacao     TIMESTAMP NOT NULL DEFAULT NOW(),
    versao                      INTEGER NOT NULL DEFAULT 1,
    UNIQUE (produto_id, deposito_id),
    CONSTRAINT chk_saldo_m3_nao_negativo CHECK (saldo_m3_disponivel >= -0.0001),
    CONSTRAINT chk_saldo_unidade_nao_negativo CHECK (saldo_unidade_disponivel >= -0.001)
);

-- Fornecedor
CREATE TABLE fornecedor (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_pessoa             tipo_pessoa NOT NULL DEFAULT 'PJ',
    cnpj_cpf                VARCHAR(18) NOT NULL UNIQUE,
    razao_social            VARCHAR(150) NOT NULL,
    nome_fantasia           VARCHAR(100),
    inscricao_estadual      VARCHAR(20),
    email                   VARCHAR(120),
    telefone                VARCHAR(20),
    uf                      CHAR(2) NOT NULL,
    cep                     CHAR(9) NOT NULL,
    logradouro              VARCHAR(150) NOT NULL,
    numero                  VARCHAR(10) NOT NULL,
    bairro                  VARCHAR(80) NOT NULL,
    cidade                  VARCHAR(80) NOT NULL,
    ativo                   BOOLEAN NOT NULL DEFAULT TRUE
);

-- Lote e sublote
CREATE TABLE lote_madeira (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_lote             VARCHAR(50) NOT NULL UNIQUE,
    produto_id              UUID NOT NULL REFERENCES produto(id),
    dimensao_id             UUID NOT NULL REFERENCES dimensao_madeira(id),
    fornecedor_id           UUID NOT NULL REFERENCES fornecedor(id),
    deposito_id             UUID NOT NULL REFERENCES deposito(id),
    data_entrada            DATE NOT NULL,
    volume_m3_total         DECIMAL(10,4) NOT NULL,
    custo_m3                DECIMAL(12,4) NOT NULL,
    custo_m3_sem_frete      DECIMAL(12,4) NOT NULL,
    frete_rateado_m3        DECIMAL(12,4) NOT NULL DEFAULT 0,
    nota_fiscal_entrada     VARCHAR(60) NOT NULL,
    status                  status_lote NOT NULL DEFAULT 'ATIVO',
    observacao              TEXT,
    CONSTRAINT chk_volume_positivo CHECK (volume_m3_total > 0),
    CONSTRAINT chk_custo_positivo CHECK (custo_m3 > 0)
);

CREATE TABLE sublote_madeira (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_id                 UUID NOT NULL REFERENCES lote_madeira(id),
    sublote_pai_id          UUID REFERENCES sublote_madeira(id),
    comprimento_m           DECIMAL(8,3) NOT NULL,
    quantidade_pecas        INTEGER NOT NULL,
    volume_m3_inicial       DECIMAL(10,4) NOT NULL,
    volume_m3_disponivel    DECIMAL(10,4) NOT NULL,
    volume_m3_reservado     DECIMAL(10,4) NOT NULL DEFAULT 0,
    tipo                    tipo_sublote NOT NULL DEFAULT 'NORMAL',
    preco_venda_sugerido    DECIMAL(12,4),
    ativo                   BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_saldo_sublote CHECK (volume_m3_disponivel + volume_m3_reservado <= volume_m3_inicial),
    CONSTRAINT chk_disponivel_nao_negativo CHECK (volume_m3_disponivel >= -0.0001)
);

-- Cliente e endereço
CREATE TABLE cliente (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_pessoa             tipo_pessoa NOT NULL DEFAULT 'PF',
    cnpj_cpf                VARCHAR(18),
    razao_social            VARCHAR(150) NOT NULL,
    nome_fantasia           VARCHAR(100),
    inscricao_estadual      VARCHAR(20),
    tipo_contribuinte       tipo_contribuinte NOT NULL DEFAULT 'PF_CONSUMIDOR',
    email                   VARCHAR(120),
    telefone                VARCHAR(20),
    limite_credito          DECIMAL(12,2) NOT NULL DEFAULT 0,
    saldo_devedor           DECIMAL(12,2) NOT NULL DEFAULT 0,
    status_inadimplencia    status_inadimplencia NOT NULL DEFAULT 'REGULAR',
    ativo                   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE cliente_endereco (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id  UUID NOT NULL REFERENCES cliente(id),
    logradouro  VARCHAR(150) NOT NULL,
    numero      VARCHAR(10) NOT NULL,
    complemento VARCHAR(60),
    bairro      VARCHAR(80) NOT NULL,
    cidade      VARCHAR(80) NOT NULL,
    uf          CHAR(2) NOT NULL,
    cep         CHAR(9) NOT NULL,
    principal   BOOLEAN NOT NULL DEFAULT FALSE,
    apelido     VARCHAR(40)
);

-- ÍNDICES CRÍTICOS
CREATE INDEX idx_dimensao_vigente ON dimensao_madeira(produto_id, vigente_ate NULLS FIRST);
CREATE INDEX idx_estoque_saldo_lookup ON estoque_saldo(produto_id, deposito_id);
CREATE INDEX idx_sublote_disponivel ON sublote_madeira(lote_id, tipo, ativo) WHERE volume_m3_disponivel > 0 AND ativo = TRUE;
CREATE INDEX idx_lote_produto ON lote_madeira(produto_id, data_entrada);
