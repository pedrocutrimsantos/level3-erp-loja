-- Atualiza telefone do administrador padrão para recuperação de senha via SMS
UPDATE usuario
SET telefone = '98984225570'
WHERE email = 'admin@piloto.local';
