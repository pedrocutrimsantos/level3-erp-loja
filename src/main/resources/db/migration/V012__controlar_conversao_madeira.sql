-- Adiciona flag de controle de conversão m³ ↔ metro linear por produto.
-- Quando TRUE (padrão): produto MADEIRA tem compra em m³, estoque em metro linear, NF em m³.
-- Permite futuramente ter madeiras vendidas diretamente em m³ sem conversão de metro linear.
ALTER TABLE produto
    ADD COLUMN IF NOT EXISTS controlar_conversao_madeira BOOLEAN NOT NULL DEFAULT TRUE;
