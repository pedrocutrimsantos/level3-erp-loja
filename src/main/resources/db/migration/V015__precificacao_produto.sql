-- Tabela de precificação por tipo de pessoa e tipo de pagamento
-- Permite configurar preços distintos para PF/PJ e à vista/a prazo
CREATE TABLE precificacao_produto (
    produto_id  UUID         NOT NULL REFERENCES produto(id) ON DELETE CASCADE,
    tipo_pessoa VARCHAR(10)  NOT NULL CHECK (tipo_pessoa IN ('PF', 'PJ')),
    tipo_pag    VARCHAR(10)  NOT NULL CHECK (tipo_pag IN ('VISTA', 'PRAZO')),
    preco       DECIMAL(12, 4) NOT NULL CHECK (preco > 0),
    PRIMARY KEY (produto_id, tipo_pessoa, tipo_pag)
);
