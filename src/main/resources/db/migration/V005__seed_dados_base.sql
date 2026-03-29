-- Perfis
INSERT INTO perfil (id, codigo, descricao) VALUES
  (gen_random_uuid(), 'ADMIN',      'Administrador do Sistema'),
  (gen_random_uuid(), 'GERENTE',    'Gerente'),
  (gen_random_uuid(), 'SUPERVISOR', 'Supervisor de Vendas'),
  (gen_random_uuid(), 'VENDEDOR',   'Operador de Balcão'),
  (gen_random_uuid(), 'ESTOQUE',    'Operador de Estoque'),
  (gen_random_uuid(), 'FISCAL',     'Responsável Fiscal'),
  (gen_random_uuid(), 'FINANCEIRO', 'Responsável Financeiro');

-- Unidades de medida
INSERT INTO unidade_medida (id, codigo, descricao, tipo, casas_decimais) VALUES
  (gen_random_uuid(), 'M3',  'Metro Cúbico',   'VOLUME',   4),
  (gen_random_uuid(), 'M',   'Metro Linear',   'LINEAR',   2),
  (gen_random_uuid(), 'M2',  'Metro Quadrado', 'AREA',     2),
  (gen_random_uuid(), 'UN',  'Unidade',        'UNIDADE',  0),
  (gen_random_uuid(), 'KG',  'Quilograma',     'MASSA',    3),
  (gen_random_uuid(), 'G',   'Grama',          'MASSA',    1),
  (gen_random_uuid(), 'L',   'Litro',          'VOLUME',   3),
  (gen_random_uuid(), 'ML',  'Mililitro',      'VOLUME',   0),
  (gen_random_uuid(), 'PC',  'Peça',           'UNIDADE',  0),
  (gen_random_uuid(), 'CX',  'Caixa',          'UNIDADE',  0),
  (gen_random_uuid(), 'SC',  'Saco',           'UNIDADE',  0),
  (gen_random_uuid(), 'RL',  'Rolo',           'UNIDADE',  0);

-- Espécies de madeira
INSERT INTO especie_madeira (nome, ncm_padrao, densidade_kg_m3) VALUES
  ('Pinus',       '44071090', 550),
  ('Eucalipto',   '44071090', 700),
  ('Cedro',       '44079990', 450),
  ('Mogno',       '44079910', 650),
  ('Ipê',         '44079990', 1000),
  ('Cedroarana',  '44079990', 500),
  ('MDF',         '44119290', 750),
  ('OSB',         '44122900', 620),
  ('Compensado',  '44121000', 580);

-- Grupos fiscais
INSERT INTO grupo_fiscal_produto (codigo, descricao, ncm_padrao) VALUES
  ('MAD-BRUTA',   'Madeira Bruta/Serrada',       '44071090'),
  ('MAD-BENEF',   'Madeira Beneficiada',          '44071090'),
  ('MAD-COMP',    'Compensados e Painéis',        '44121000'),
  ('FERRAG',      'Ferragens e Fixadores',        '73181500'),
  ('QUIM-TINTA',  'Tintas e Vernizes',            '32089000'),
  ('QUIM-COLA',   'Colas e Adesivos',             '35069100'),
  ('FERRAM',      'Ferramentas',                  '82059000'),
  ('EPI',         'EPIs e Segurança',             '39269090');

-- Operações fiscais
INSERT INTO operacao_fiscal (codigo, descricao, natureza_operacao, tipo) VALUES
  ('VENDA_BALCAO',     'Venda Balcão',                        'Venda de mercadoria ao consumidor',     'SAIDA'),
  ('VENDA_ENTREGA',    'Venda com Entrega',                   'Venda de mercadoria com entrega',       'SAIDA'),
  ('DEVOLUCAO_COMPRA', 'Devolução ao Fornecedor',             'Devolução de compra ao fornecedor',     'SAIDA'),
  ('COMPRA_REVENDA',   'Compra para Revenda',                 'Compra de mercadoria para revenda',     'ENTRADA'),
  ('DEVOLUCAO_VENDA',  'Devolução de Venda (Entrada)',        'Devolução de venda — entrada',          'ENTRADA'),
  ('TRANSFERENCIA',    'Transferência entre Depósitos',       'Transferência entre depósitos',         'SAIDA'),
  ('BONIFICACAO',      'Bonificação',                         'Remessa em bonificação',                'SAIDA');

-- Condições de pagamento
INSERT INTO condicao_pagamento (descricao, num_parcelas, dias_parcela, tipo) VALUES
  ('À Vista',          1, ARRAY[0],        'AVISTA'),
  ('7 dias',           1, ARRAY[7],        'PRAZO'),
  ('30 dias',          1, ARRAY[30],       'PRAZO'),
  ('30/60 dias',       2, ARRAY[30,60],    'PRAZO'),
  ('30/60/90 dias',    3, ARRAY[30,60,90], 'PRAZO'),
  ('2x sem juros',     2, ARRAY[30,60],    'PRAZO'),
  ('3x sem juros',     3, ARRAY[30,60,90], 'PRAZO');
