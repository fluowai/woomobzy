-- Script para verificar a estrutura da tabela site_settings
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'site_settings'
ORDER BY 
    ordinal_position;

-- Verifica se as funções existem
SELECT proname, proargnames
FROM pg_proc 
WHERE proname IN ('get_bi_stats', 'get_bi_lead_sources');
