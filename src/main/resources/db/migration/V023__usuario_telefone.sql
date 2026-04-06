-- Campo de telefone/WhatsApp para envio de SMS no reset de senha
ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);
