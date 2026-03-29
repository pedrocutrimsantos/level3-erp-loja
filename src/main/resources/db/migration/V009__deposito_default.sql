-- Torna empresa_id nullable em deposito (enquanto módulo de empresa não existe)
ALTER TABLE deposito ALTER COLUMN empresa_id DROP NOT NULL;

-- Depósito padrão com UUID fixo para desenvolvimento
INSERT INTO deposito (id, codigo, descricao, tipo, ativo)
VALUES ('00000000-0000-0000-0000-000000000030'::uuid, 'PRINCIPAL', 'Depósito Principal', 'PRINCIPAL', true)
ON CONFLICT (id) DO NOTHING;

-- Torna usuario_id nullable em movimentacao_estoque (enquanto auth não existe)
ALTER TABLE movimentacao_estoque ALTER COLUMN usuario_id DROP NOT NULL;
