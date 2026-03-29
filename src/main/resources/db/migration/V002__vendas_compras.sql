-- Condição de pagamento (PENDÊNCIA 1 — entidade ausente)
CREATE TABLE condicao_pagamento (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao       VARCHAR(60) NOT NULL UNIQUE,
    num_parcelas    INTEGER NOT NULL DEFAULT 1,
    dias_parcela    INTEGER[] NOT NULL DEFAULT ARRAY[0],
    tipo            VARCHAR(10) NOT NULL DEFAULT 'AVISTA' CHECK (tipo IN ('AVISTA', 'PRAZO', 'MISTO')),
    juros_ao_mes    DECIMAL(5,4) NOT NULL DEFAULT 0,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_num_parcelas_positivo CHECK (num_parcelas >= 1)
);

-- Compra
CREATE TABLE compra (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero                  VARCHAR(30) NOT NULL UNIQUE,
    fornecedor_id           UUID NOT NULL REFERENCES fornecedor(id),
    status                  status_compra NOT NULL DEFAULT 'RASCUNHO',
    numero_nf_fornecedor    VARCHAR(20),
    data_emissao_nf         DATE,
    data_pedido             DATE NOT NULL,
    data_recebimento_total  DATE,
    condicao_pagamento_id   UUID REFERENCES condicao_pagamento(id),
    valor_frete             DECIMAL(12,2) NOT NULL DEFAULT 0,
    criterio_rateio_frete   criterio_rateio_frete NOT NULL DEFAULT 'PROPORCIONAL_M3',
    valor_outros_custos     DECIMAL(12,2) NOT NULL DEFAULT 0,
    valor_total_nf          DECIMAL(14,2) NOT NULL DEFAULT 0,
    valor_total_custo_real  DECIMAL(14,2) NOT NULL DEFAULT 0,
    usuario_id              UUID NOT NULL REFERENCES usuario(id),
    observacao              TEXT,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE item_compra (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id                   UUID NOT NULL REFERENCES compra(id),
    produto_id                  UUID NOT NULL REFERENCES produto(id),
    dimensao_id                 UUID REFERENCES dimensao_madeira(id),
    quantidade_nf_m3            DECIMAL(10,4),
    quantidade_nf_unidade       DECIMAL(14,4),
    quantidade_recebida_m3      DECIMAL(10,4),
    quantidade_recebida_unidade DECIMAL(14,4),
    preco_unitario_nf           DECIMAL(12,4) NOT NULL,
    frete_rateado               DECIMAL(12,4) NOT NULL DEFAULT 0,
    outros_custos_rateados      DECIMAL(12,4) NOT NULL DEFAULT 0,
    custo_unitario_real         DECIMAL(12,4) NOT NULL,
    valor_total_item            DECIMAL(14,2) NOT NULL,
    metros_lineares_equivalentes DECIMAL(12,2),
    estimativa_pecas            INTEGER,
    lote_gerado_id              UUID REFERENCES lote_madeira(id),
    numero_pecas_fisicas        INTEGER
);

-- Veículo e Motorista
CREATE TABLE veiculo (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo          VARCHAR(20) NOT NULL UNIQUE,
    placa           VARCHAR(10) NOT NULL UNIQUE,
    modelo          VARCHAR(60) NOT NULL,
    capacidade_kg   DECIMAL(10,2),
    capacidade_m3   DECIMAL(8,2),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE motorista (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome            VARCHAR(120) NOT NULL,
    cnh             VARCHAR(20) NOT NULL UNIQUE,
    validade_cnh    DATE NOT NULL,
    telefone        VARCHAR(20),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE
);

-- Entrega
CREATE TABLE entrega (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero                  VARCHAR(30) NOT NULL UNIQUE,
    status                  status_entrega NOT NULL DEFAULT 'AGENDADA',
    veiculo_id              UUID REFERENCES veiculo(id),
    motorista_id            UUID REFERENCES motorista(id),
    cliente_endereco_id     UUID NOT NULL REFERENCES cliente_endereco(id),
    data_agendada           DATE NOT NULL,
    turno_agendado          VARCHAR(10) NOT NULL CHECK (turno_agendado IN ('MANHA', 'TARDE', 'NOITE')),
    data_realizada          TIMESTAMP,
    taxa_frete              DECIMAL(10,2) NOT NULL DEFAULT 0,
    tipo_frete              tipo_entrega NOT NULL DEFAULT 'PROPRIO',
    modalidade_frete_nf     modalidade_frete_nf NOT NULL DEFAULT 'SEM_FRETE',
    transportadora_id       UUID REFERENCES fornecedor(id),
    observacoes_entrega     TEXT,
    comprovante_url         VARCHAR(500),
    created_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

-- NF Emitida
CREATE TABLE nf_emitida (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venda_id                UUID,
    compra_id               UUID,
    devolucao_venda_id      UUID,
    tipo_operacao           VARCHAR(30) NOT NULL DEFAULT 'SAIDA_VENDA'
                            CHECK (tipo_operacao IN ('SAIDA_VENDA','ENTRADA_COMPRA','DEVOLUCAO_CLIENTE','DEVOLUCAO_FORNECEDOR','TRANSFERENCIA')),
    modelo                  modelo_nf NOT NULL,
    numero                  INTEGER NOT NULL,
    serie                   VARCHAR(3) NOT NULL,
    chave_acesso            CHAR(44) UNIQUE,
    nf_referenciada_chave   CHAR(44),
    status_sefaz            status_nf NOT NULL DEFAULT 'PENDENTE',
    ambiente                ambiente_nf NOT NULL DEFAULT 'HOMOLOGACAO',
    data_emissao            TIMESTAMP NOT NULL DEFAULT NOW(),
    data_autorizacao        TIMESTAMP,
    protocolo_autorizacao   VARCHAR(60),
    xml_autorizado          TEXT,
    xml_cancelamento        TEXT,
    pdf_danfe_path          VARCHAR(500),
    motivo_rejeicao         TEXT,
    chave_correlacao        UUID NOT NULL UNIQUE,
    tentativas_envio        INTEGER NOT NULL DEFAULT 0,
    ultima_tentativa        TIMESTAMP,
    justificativa_cancel    VARCHAR(255),
    data_cancelamento       TIMESTAMP,
    protocolo_cancelamento  VARCHAR(60),
    created_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Venda
CREATE TABLE venda (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero              VARCHAR(30) NOT NULL UNIQUE,
    cliente_id          UUID REFERENCES cliente(id),
    vendedor_id         UUID NOT NULL REFERENCES usuario(id),
    deposito_id         UUID NOT NULL REFERENCES deposito(id),
    tipo                tipo_venda NOT NULL,
    status              status_venda NOT NULL DEFAULT 'RASCUNHO',
    data_confirmacao    TIMESTAMP,
    data_conclusao      TIMESTAMP,
    validade_orcamento  DATE,
    data_limite_reserva DATE,
    valor_subtotal      DECIMAL(14,2) NOT NULL DEFAULT 0,
    valor_desconto      DECIMAL(14,2) NOT NULL DEFAULT 0,
    valor_frete         DECIMAL(12,2) NOT NULL DEFAULT 0,
    valor_total         DECIMAL(14,2) NOT NULL DEFAULT 0,
    nf_emitida_id       UUID REFERENCES nf_emitida(id),
    entrega_id          UUID REFERENCES entrega(id),
    motivo_cancelamento TEXT,
    cancelado_por       UUID REFERENCES usuario(id),
    data_cancelamento   TIMESTAMP,
    venda_origem_id     UUID REFERENCES venda(id),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by          UUID NOT NULL REFERENCES usuario(id)
);

CREATE TABLE item_venda (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venda_id                UUID NOT NULL REFERENCES venda(id),
    produto_id              UUID NOT NULL REFERENCES produto(id),
    numero_linha            INTEGER NOT NULL,
    tipo_produto            tipo_produto NOT NULL,
    dimensao_id             UUID REFERENCES dimensao_madeira(id),
    fator_conversao_usado   DECIMAL(12,8),
    quantidade_m_linear     DECIMAL(12,3),
    volume_m3_calculado     DECIMAL(10,4),
    quantidade_unidade      DECIMAL(14,4),
    sublote_id              UUID REFERENCES sublote_madeira(id),
    lote_id                 UUID REFERENCES lote_madeira(id),
    preco_unitario          DECIMAL(12,4) NOT NULL,
    custo_unitario_lote     DECIMAL(12,4),
    desconto_pct            DECIMAL(5,2) NOT NULL DEFAULT 0,
    valor_total_item        DECIMAL(14,2) NOT NULL,
    corte_encomenda         BOOLEAN NOT NULL DEFAULT FALSE,
    comprimento_solicitado  DECIMAL(8,3),
    sublote_sobra_gerado    UUID REFERENCES sublote_madeira(id),
    status_entrega          status_item_entrega NOT NULL DEFAULT 'PENDENTE'
);

-- Movimentação de estoque (append-only)
CREATE TABLE movimentacao_estoque (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id          UUID NOT NULL REFERENCES produto(id),
    deposito_id         UUID NOT NULL REFERENCES deposito(id),
    sublote_id          UUID REFERENCES sublote_madeira(id),
    dimensao_id         UUID REFERENCES dimensao_madeira(id),
    tipo_movimentacao   tipo_movimentacao NOT NULL,
    quantidade_m3       DECIMAL(10,4),
    quantidade_unidade  DECIMAL(14,4),
    sinal               sinal_movimentacao NOT NULL,
    venda_id            UUID REFERENCES venda(id),
    item_venda_id       UUID REFERENCES item_venda(id),
    compra_id           UUID REFERENCES compra(id),
    item_compra_id      UUID REFERENCES item_compra(id),
    custo_unitario      DECIMAL(12,4),
    data_hora           TIMESTAMP NOT NULL DEFAULT NOW(),
    usuario_id          UUID NOT NULL REFERENCES usuario(id),
    observacao          TEXT,
    saldo_antes_m3      DECIMAL(12,4),
    saldo_depois_m3     DECIMAL(12,4)
);

-- Registro de perda
CREATE TABLE registro_perda_madeira (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id          UUID NOT NULL REFERENCES produto(id),
    lote_id             UUID NOT NULL REFERENCES lote_madeira(id),
    sublote_id          UUID REFERENCES sublote_madeira(id),
    volume_m3_perdido   DECIMAL(10,4) NOT NULL,
    motivo              motivo_perda NOT NULL,
    descricao           TEXT NOT NULL,
    requer_aprovacao    BOOLEAN NOT NULL DEFAULT FALSE,
    status              status_perda NOT NULL DEFAULT 'PENDENTE',
    aprovado_por        UUID REFERENCES usuario(id),
    data_aprovacao      TIMESTAMP,
    registrado_por      UUID NOT NULL REFERENCES usuario(id),
    data_registro       TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_descricao_minima CHECK (length(descricao) >= 20),
    CONSTRAINT chk_volume_positivo CHECK (volume_m3_perdido > 0)
);

-- Financeiro
CREATE TABLE titulo_financeiro (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero              VARCHAR(30) NOT NULL UNIQUE,
    tipo                tipo_titulo NOT NULL,
    venda_id            UUID REFERENCES venda(id),
    compra_id           UUID REFERENCES compra(id),
    cliente_id          UUID REFERENCES cliente(id),
    fornecedor_id       UUID REFERENCES fornecedor(id),
    valor_original      DECIMAL(14,2) NOT NULL,
    valor_pago          DECIMAL(14,2) NOT NULL DEFAULT 0,
    status              status_titulo NOT NULL DEFAULT 'ABERTO',
    data_emissao        DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE parcela_financeira (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo_id           UUID NOT NULL REFERENCES titulo_financeiro(id),
    numero_parcela      INTEGER NOT NULL,
    valor               DECIMAL(14,2) NOT NULL,
    data_vencimento     DATE NOT NULL,
    data_pagamento      DATE,
    valor_pago          DECIMAL(14,2),
    valor_juros         DECIMAL(12,2) NOT NULL DEFAULT 0,
    valor_multa         DECIMAL(12,2) NOT NULL DEFAULT 0,
    valor_desconto      DECIMAL(12,2) NOT NULL DEFAULT 0,
    forma_pagamento     forma_pagamento,
    status              status_parcela NOT NULL DEFAULT 'ABERTO'
);

-- ÍNDICES ADICIONAIS
CREATE INDEX idx_venda_cliente_status ON venda(cliente_id, status, data_confirmacao DESC);
CREATE INDEX idx_item_venda_sublote ON item_venda(sublote_id);
CREATE INDEX idx_item_venda_lote ON item_venda(lote_id);
CREATE INDEX idx_movimentacao_produto_data ON movimentacao_estoque(produto_id, data_hora DESC);
CREATE INDEX idx_movimentacao_sublote ON movimentacao_estoque(sublote_id, data_hora DESC);
CREATE INDEX idx_parcela_status_vencimento ON parcela_financeira(status, data_vencimento) WHERE status IN ('ABERTO', 'VENCIDO');
CREATE INDEX idx_nf_chave_acesso ON nf_emitida(chave_acesso) WHERE chave_acesso IS NOT NULL;
CREATE INDEX idx_nf_correlacao ON nf_emitida(chave_correlacao);
