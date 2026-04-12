-- Remove coluna token_focus_nfe — emissão direta SEFAZ não usa mais intermediário Focus NF-e.
-- A configuração de ambiente (homologacao/producao) permanece em ambiente_nfe.

ALTER TABLE empresa DROP COLUMN IF EXISTS token_focus_nfe;
