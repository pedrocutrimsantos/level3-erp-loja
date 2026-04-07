-- V026: converte regime_tributario de enum para varchar
-- O tipo enum causa falha no JDBC com Exposed (setString vs enum cast)
ALTER TABLE empresa
    ALTER COLUMN regime_tributario TYPE VARCHAR(30)
    USING regime_tributario::VARCHAR;
