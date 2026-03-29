-- ============================================================
-- V006__permissoes_seed.sql
-- Seed de permissões baseado na matriz de Permissions.kt
-- Fonte da verdade: br.com.madeireira.core.security.Permissions
-- ============================================================

-- ── PERFIL: VENDEDOR ─────────────────────────────────────────
-- Vendas
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'VEN', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'VENDEDOR';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'VEN', 'CRIAR', TRUE
FROM perfil p WHERE p.codigo = 'VENDEDOR';

-- Cadastros (leitura)
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'CAD', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'VENDEDOR';

-- Estoque (apenas consulta)
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'EST', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'VENDEDOR';

-- Financeiro (apenas leitura)
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'FIN', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'VENDEDOR';

-- Permissões especiais de negócio (VENDEDOR)
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'CAI', 'ABRIR_FECHAR', TRUE
FROM perfil p WHERE p.codigo = 'VENDEDOR';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'CAD', 'CLIENTE:CRIAR', TRUE
FROM perfil p WHERE p.codigo = 'VENDEDOR';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'CAD', 'CLIENTE:EDITAR', TRUE
FROM perfil p WHERE p.codigo = 'VENDEDOR';


-- ── PERFIL: SUPERVISOR ───────────────────────────────────────
-- Vendas
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'VEN', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'SUPERVISOR';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'VEN', 'CRIAR', TRUE
FROM perfil p WHERE p.codigo = 'SUPERVISOR';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'VEN', 'EDITAR', TRUE
FROM perfil p WHERE p.codigo = 'SUPERVISOR';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'VEN', 'CANCELAR', TRUE
FROM perfil p WHERE p.codigo = 'SUPERVISOR';

-- Permissões especiais de vendas
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'VEN', 'DESCONTO_SUPERVISOR', TRUE
FROM perfil p WHERE p.codigo = 'SUPERVISOR';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'VEN', 'PRECO_ABAIXO_MINIMO', TRUE
FROM perfil p WHERE p.codigo = 'SUPERVISOR';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'VEN', 'CANCELAR_NF', TRUE
FROM perfil p WHERE p.codigo = 'SUPERVISOR';

-- Estoque
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'EST', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'SUPERVISOR';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'EST', 'CRIAR', TRUE
FROM perfil p WHERE p.codigo = 'SUPERVISOR';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'EST', 'AJUSTE_ESTOQUE', TRUE
FROM perfil p WHERE p.codigo = 'SUPERVISOR';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'EST', 'APROVAR_PERDA', TRUE
FROM perfil p WHERE p.codigo = 'SUPERVISOR';

-- Cadastros
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'CAD', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'SUPERVISOR';

-- Financeiro
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'FIN', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'SUPERVISOR';

-- Caixa
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'CAI', 'ABRIR_FECHAR', TRUE
FROM perfil p WHERE p.codigo = 'SUPERVISOR';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'CAI', 'SANGRIA_SUPRIMENTO', TRUE
FROM perfil p WHERE p.codigo = 'SUPERVISOR';


-- ── PERFIL: GERENTE ──────────────────────────────────────────
-- Vendas (acesso completo)
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'VEN', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'VEN', 'CRIAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'VEN', 'EDITAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'VEN', 'EXCLUIR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'VEN', 'APROVAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'VEN', 'EXPORTAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

-- Compras
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'COM', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'COM', 'CRIAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'COM', 'EDITAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'COM', 'APROVAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

-- Estoque
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'EST', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'EST', 'CRIAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'EST', 'EDITAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'EST', 'EXPORTAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

-- Cadastros
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'CAD', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'CAD', 'CRIAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'CAD', 'EDITAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

-- Entregas
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'ENT', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'ENT', 'CRIAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'ENT', 'EDITAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

-- Financeiro
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'FIN', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'FIN', 'CRIAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'FIN', 'EDITAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'FIN', 'EXPORTAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

-- Relatórios
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'REL', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'REL', 'EXPORTAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

-- Permissões especiais de negócio (GERENTE)
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'VEN', 'DESCONTO_SUPERVISOR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'VEN', 'PRECO_ABAIXO_MINIMO', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'VEN', 'CANCELAR_NF', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'EST', 'AJUSTE_ESTOQUE', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'EST', 'APROVAR_PERDA', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'FIN', 'RENEGOCIAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'CAI', 'ABRIR_FECHAR', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'CAI', 'SANGRIA_SUPRIMENTO', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'CFG', 'ALTERAR_DIMENSAO', TRUE
FROM perfil p WHERE p.codigo = 'GERENTE';


-- ── PERFIL: ESTOQUE ──────────────────────────────────────────
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'EST', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'ESTOQUE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'EST', 'CRIAR', TRUE
FROM perfil p WHERE p.codigo = 'ESTOQUE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'EST', 'EDITAR', TRUE
FROM perfil p WHERE p.codigo = 'ESTOQUE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'EST', 'AJUSTE_ESTOQUE', TRUE
FROM perfil p WHERE p.codigo = 'ESTOQUE';

-- Compras (receber)
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'COM', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'ESTOQUE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'COM', 'CRIAR', TRUE
FROM perfil p WHERE p.codigo = 'ESTOQUE';

-- Cadastros
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'CAD', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'ESTOQUE';

-- Entregas (separação e confirmação)
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'ENT', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'ESTOQUE';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'ENT', 'EDITAR', TRUE
FROM perfil p WHERE p.codigo = 'ESTOQUE';


-- ── PERFIL: FISCAL ───────────────────────────────────────────
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'FIS', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'FISCAL';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'FIS', 'CRIAR', TRUE
FROM perfil p WHERE p.codigo = 'FISCAL';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'FIS', 'EDITAR', TRUE
FROM perfil p WHERE p.codigo = 'FISCAL';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'FIS', 'CONFIGURAR_REGRAS', TRUE
FROM perfil p WHERE p.codigo = 'FISCAL';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'FIS', 'EMITIR_NF', TRUE
FROM perfil p WHERE p.codigo = 'FISCAL';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'VEN', 'CANCELAR_NF', TRUE
FROM perfil p WHERE p.codigo = 'FISCAL';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'VEN', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'FISCAL';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'COM', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'FISCAL';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'CAD', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'FISCAL';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'REL', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'FISCAL';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'REL', 'EXPORTAR', TRUE
FROM perfil p WHERE p.codigo = 'FISCAL';


-- ── PERFIL: FINANCEIRO ───────────────────────────────────────
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'FIN', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'FINANCEIRO';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'FIN', 'CRIAR', TRUE
FROM perfil p WHERE p.codigo = 'FINANCEIRO';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'FIN', 'EDITAR', TRUE
FROM perfil p WHERE p.codigo = 'FINANCEIRO';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'FIN', 'EXPORTAR', TRUE
FROM perfil p WHERE p.codigo = 'FINANCEIRO';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'FIN', 'RENEGOCIAR', TRUE
FROM perfil p WHERE p.codigo = 'FINANCEIRO';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'VEN', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'FINANCEIRO';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'COM', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'FINANCEIRO';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'REL', 'VISUALIZAR', TRUE
FROM perfil p WHERE p.codigo = 'FINANCEIRO';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'REL', 'EXPORTAR', TRUE
FROM perfil p WHERE p.codigo = 'FINANCEIRO';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'CAI', 'ABRIR_FECHAR', TRUE
FROM perfil p WHERE p.codigo = 'FINANCEIRO';

INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, 'CAI', 'SANGRIA_SUPRIMENTO', TRUE
FROM perfil p WHERE p.codigo = 'FINANCEIRO';


-- ── PERFIL: ADMIN ────────────────────────────────────────────
-- Admin tem curinga (*) — inserimos uma única linha que representa acesso total
INSERT INTO permissao (id, perfil_id, modulo, acao, permitido)
SELECT gen_random_uuid(), p.id, '*', '*', TRUE
FROM perfil p WHERE p.codigo = 'ADMIN';
