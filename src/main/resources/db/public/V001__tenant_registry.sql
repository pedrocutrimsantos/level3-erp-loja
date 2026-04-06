-- Tabela de tenants (clientes SaaS) — vive no schema public
-- Executada UMA vez no banco, independente dos schemas de tenant

CREATE TABLE IF NOT EXISTS public.tenant (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug         VARCHAR(50)  NOT NULL UNIQUE,
    razao_social VARCHAR(150) NOT NULL,
    cnpj         VARCHAR(18)  NOT NULL UNIQUE,
    schema_name  VARCHAR(63)  NOT NULL UNIQUE,  -- ex: "public" (piloto) ou "t_loja_abc"
    ativo        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Tenant piloto: usa o schema public enquanto não for provisionado em schema próprio
INSERT INTO public.tenant (slug, razao_social, cnpj, schema_name)
VALUES ('piloto', 'Shopping das Madeiras (Piloto)', '00.000.000/0000-00', 'public')
ON CONFLICT (slug) DO NOTHING;