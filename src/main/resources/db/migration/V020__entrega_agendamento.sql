-- Campos de agendamento na entrega
ALTER TABLE entrega
    ADD COLUMN data_agendada DATE,
    ADD COLUMN turno         VARCHAR(20),
    ADD COLUMN motorista     TEXT;
