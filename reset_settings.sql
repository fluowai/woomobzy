-- Reseta as configurações do site para o padrão, forçando o Wizard a aparecer novamente
DELETE FROM site_settings;
-- O Wizard vai usar INSERT na próxima vez e criar um novo ID
