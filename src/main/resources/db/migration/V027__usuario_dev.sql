-- Usuário desenvolvedor para acesso inicial ao sistema
-- Tenant: piloto (schema public)  |  Login: dev@dev.local  |  Senha: dev1234@
-- Remover ou desativar em produção.

INSERT INTO usuario (id, nome, email, senha_hash, perfil_id, ativo)
SELECT
    '00000000-0000-0000-0000-000000000002'::uuid,
    'Desenvolvedor',
    'dev@dev.local',
    crypt('dev1234@', gen_salt('bf', 12)),
    p.id,
    true
FROM perfil p
WHERE p.codigo = 'ADMIN'
  AND NOT EXISTS (
      SELECT 1 FROM usuario WHERE email = 'dev@dev.local'
  )
LIMIT 1;
