-- Adiciona forma de pagamento na venda para rastreio no caixa
ALTER TABLE venda ADD COLUMN IF NOT EXISTS forma_pagamento forma_pagamento;
