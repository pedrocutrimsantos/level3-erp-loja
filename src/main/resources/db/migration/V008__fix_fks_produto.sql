-- Torna grupo_fiscal_id e unidade_venda_id nullable em produto
-- Permite criar produtos sem essas FKs durante o desenvolvimento inicial
ALTER TABLE produto ALTER COLUMN grupo_fiscal_id DROP NOT NULL;
ALTER TABLE produto ALTER COLUMN unidade_venda_id DROP NOT NULL;

-- Insere grupo fiscal padrão com UUID fixo (para uso em testes e defaults)
INSERT INTO grupo_fiscal_produto (id, codigo, descricao, ncm_padrao)
VALUES ('00000000-0000-0000-0000-000000000010'::uuid, 'GERAL', 'Grupo Fiscal Geral', '00000000')
ON CONFLICT (id) DO NOTHING;

-- Insere unidade de medida padrão com UUID fixo
INSERT INTO unidade_medida (id, codigo, descricao, tipo, casas_decimais)
VALUES ('00000000-0000-0000-0000-000000000020'::uuid, 'UN2', 'Unidade (padrão)', 'UNIDADE', 0)
ON CONFLICT (id) DO NOTHING;
