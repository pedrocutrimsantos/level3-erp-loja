-- ═══════════════════════════════════════════════════════════════════
-- PENDÊNCIA 1: parametros_sistema (entidade ausente)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE parametro_sistema (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chave           VARCHAR(80) NOT NULL UNIQUE,
    valor           VARCHAR(255) NOT NULL,
    tipo_valor      VARCHAR(10) NOT NULL CHECK (tipo_valor IN ('DECIMAL','INTEGER','BOOLEAN','ENUM','TEXT')),
    descricao       VARCHAR(200) NOT NULL,
    alterado_por    UUID REFERENCES usuario(id),
    data_alteracao  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed de parâmetros com DECISÕES TÉCNICAS para as pendências 2 e 3
INSERT INTO parametro_sistema (chave, valor, tipo_valor, descricao) VALUES

-- ═══════════════════════════════════════════════════════════════════
-- PENDÊNCIA 2: Momento da baixa de estoque
-- DECISÃO: Venda balcão = baixa na confirmação.
--           Venda com entrega = baixa na saída física (romaneio assinado).
-- JUSTIFICATIVA: Alinhado com a prática de mercado e com a legislação
--   fiscal (NF-e deve acompanhar a mercadoria). Permite que o galpão
--   saiba o que está fisicamente disponível vs. comprometido.
-- ═══════════════════════════════════════════════════════════════════
('BAIXA_ESTOQUE_BALCAO',    'CONFIRMACAO',   'ENUM',    'Quando baixar estoque em venda balcão: CONFIRMACAO'),
('BAIXA_ESTOQUE_ENTREGA',   'SAIDA_FISICA',  'ENUM',    'Quando baixar estoque em venda com entrega: SAIDA_FISICA | CONFIRMACAO'),
('EMISSAO_NF_MOMENTO',      'CONFIRMACAO',   'ENUM',    'Quando emitir NF-e: CONFIRMACAO | SAIDA_FISICA'),

-- ═══════════════════════════════════════════════════════════════════
-- PENDÊNCIA 3: Vendas interestaduais
-- DECISÃO MVP: Sistema opera apenas para vendas intraestaduais (SP).
--   DIFAL e alíquotas interestaduais ficam na Fase 2.
--   Se uma venda interestadual for detectada, o sistema alerta
--   o operador fiscal mas não bloqueia — emissão manual.
-- ═══════════════════════════════════════════════════════════════════
('UF_OPERACAO_SEDE',            'SP',    'TEXT',    'UF de operação da empresa (usado para CFOP intra/interestadual)'),
('HABILITAR_VENDA_INTERESTADUAL','false', 'BOOLEAN', 'MVP: false. Fase 2: true (habilita DIFAL automático)'),
('ALERTA_VENDA_INTERESTADUAL',  'true',  'BOOLEAN', 'Alerta o fiscal quando UF destino != UF sede (não bloqueia no MVP)'),

-- Políticas de estoque e negócio
('POLITICA_CUSTO',              'FIFO',  'ENUM',    'Política de custo: FIFO | CMP. FIFO recomendado para madeireira.'),
('LIMITE_PERDA_APROVACAO_M3',   '0.5',   'DECIMAL', 'Perdas acima deste volume em m³ exigem aprovação de supervisor'),
('DIAS_VALIDADE_ORCAMENTO',     '3',     'INTEGER', 'Dias de validade do orçamento antes de expirar automaticamente'),
('DIAS_BLOQUEIO_INADIMPLENCIA', '15',    'INTEGER', 'Dias de atraso para bloquear cliente automaticamente'),
('DESCONTO_MAXIMO_VENDEDOR',    '10',    'DECIMAL', 'Desconto máximo (%) que o vendedor pode aplicar sem supervisor'),
('DESCONTO_MAXIMO_SUPERVISOR',  '30',    'DECIMAL', 'Desconto máximo (%) que o supervisor pode aplicar'),
('DIAS_RESERVA_EXPIRACAO',      '7',     'INTEGER', 'Dias após confirmação para alertar sobre reserva sem entrega'),
('DESCONTO_PADRAO_SOBRAS',      '30',    'DECIMAL', 'Desconto padrão (%) aplicado ao preço de sobras de corte'),
('TIMEOUT_SEFAZ_SEGUNDOS',      '30',    'INTEGER', 'Timeout em segundos para chamadas à SEFAZ antes de contingência'),
('MAX_RETRIES_NF',              '3',     'INTEGER', 'Número máximo de tentativas de emissão de NF antes de alertar fiscal'),
('DIAS_ALERTA_CERTIFICADO',     '30',    'INTEGER', 'Dias de antecedência para alertar sobre vencimento do certificado digital');

-- ═══════════════════════════════════════════════════════════════════
-- PENDÊNCIA 1: caixa (entidade ausente)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE caixa (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deposito_id         UUID NOT NULL REFERENCES deposito(id),
    usuario_abertura_id UUID NOT NULL REFERENCES usuario(id),
    saldo_abertura      DECIMAL(14,2) NOT NULL DEFAULT 0,
    data_abertura       TIMESTAMP NOT NULL DEFAULT NOW(),
    status              status_caixa NOT NULL DEFAULT 'ABERTO',
    saldo_fechamento    DECIMAL(14,2),
    data_fechamento     TIMESTAMP,
    usuario_fechamento_id UUID REFERENCES usuario(id),
    diferenca_fechamento DECIMAL(14,2),
    observacao          TEXT
);

CREATE TABLE movimentacao_caixa (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caixa_id        UUID NOT NULL REFERENCES caixa(id),
    tipo            tipo_movimentacao_caixa NOT NULL,
    valor           DECIMAL(14,2) NOT NULL,
    forma_pagamento forma_pagamento,
    referencia_id   UUID,
    referencia_tipo VARCHAR(30),
    data_hora       TIMESTAMP NOT NULL DEFAULT NOW(),
    usuario_id      UUID NOT NULL REFERENCES usuario(id),
    observacao      VARCHAR(255),
    CONSTRAINT chk_valor_nao_zero CHECK (valor != 0)
);

-- Inventário físico
CREATE TABLE inventario (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao       VARCHAR(100) NOT NULL,
    deposito_id     UUID NOT NULL REFERENCES deposito(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'ABERTO'
                    CHECK (status IN ('ABERTO', 'CONTAGEM', 'REVISAO', 'FECHADO')),
    data_abertura   TIMESTAMP NOT NULL DEFAULT NOW(),
    data_fechamento TIMESTAMP,
    aprovado_por    UUID REFERENCES usuario(id),
    created_by      UUID NOT NULL REFERENCES usuario(id)
);

CREATE TABLE inventario_item (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventario_id       UUID NOT NULL REFERENCES inventario(id),
    produto_id          UUID NOT NULL REFERENCES produto(id),
    sublote_id          UUID REFERENCES sublote_madeira(id),
    saldo_sistema_m3    DECIMAL(12,4),
    saldo_contado_m3    DECIMAL(12,4),
    saldo_sistema_unidade DECIMAL(14,4),
    saldo_contado_unidade DECIMAL(14,4),
    justificativa       TEXT,
    status_ajuste       VARCHAR(10) NOT NULL DEFAULT 'PENDENTE'
                        CHECK (status_ajuste IN ('PENDENTE', 'APROVADO', 'REJEITADO'))
);

-- Audit log (append-only)
CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID NOT NULL,
    tabela          VARCHAR(60) NOT NULL,
    registro_id     UUID NOT NULL,
    operacao        operacao_auditoria NOT NULL,
    campo_alterado  VARCHAR(60),
    valor_antes     TEXT,
    valor_depois    TEXT,
    data_hora       TIMESTAMP NOT NULL DEFAULT NOW(),
    ip_origem       VARCHAR(45),
    sessao_id       VARCHAR(100)
);

-- Particionamento do audit_log por trimestre
CREATE INDEX idx_audit_tabela_registro ON audit_log(tabela, registro_id, data_hora DESC);
CREATE INDEX idx_audit_usuario ON audit_log(usuario_id, data_hora DESC);
