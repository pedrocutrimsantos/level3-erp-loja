-- Fornecedor padrão para desenvolvimento
-- fornecedor tem NOT NULL: tipo_pessoa, cnpj_cpf, razao_social, uf, cep, logradouro, numero, bairro, cidade
INSERT INTO fornecedor (id, tipo_pessoa, cnpj_cpf, razao_social, uf, cep, logradouro, numero, bairro, cidade, ativo)
VALUES ('00000000-0000-0000-0000-000000000040'::uuid, 'PJ', '00.000.000/0001-00', 'Fornecedor Padrão', 'SP', '00000-000', 'Rua Padrão', '1', 'Centro', 'São Paulo', true)
ON CONFLICT (id) DO NOTHING;

-- Torna nullable para desenvolvimento sem auth
ALTER TABLE venda ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE compra ALTER COLUMN usuario_id DROP NOT NULL;
