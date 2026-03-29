-- Usuário sistema com UUID fixo — usado como created_by enquanto o módulo de auth não existe
-- UUID fixo para poder referenciar em código sem busca no banco
INSERT INTO usuario (id, nome, email, senha_hash, ativo, perfil_id)
SELECT
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Sistema',
    'sistema@madeireira.local',
    'x', -- login bloqueado (senha inválida intencional)
    false,
    p.id
FROM perfil p WHERE p.codigo = 'ADMIN'
LIMIT 1;

-- Torna created_by nullable para que o sistema possa criar registros antes do módulo de auth
ALTER TABLE produto ALTER COLUMN created_by DROP NOT NULL;
