-- Usuário admin real para o tenant piloto (schema public)
-- Senha padrão: Admin@123  (bcrypt custo 12 via pgcrypto)
-- TROCAR a senha no primeiro acesso em produção.

INSERT INTO usuario (id, nome, email, senha_hash, perfil_id, ativo)
SELECT
    gen_random_uuid(),
    'Administrador',
    'admin@piloto.local',
    crypt('Admin@123', gen_salt('bf', 12)),
    p.id,
    true
FROM perfil p
WHERE p.codigo = 'ADMIN'
  AND NOT EXISTS (
      SELECT 1 FROM usuario WHERE email = 'admin@piloto.local'
  )
LIMIT 1;
