-- Criar função exec_sql para executar SQL arbitrário
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Executar o SQL fornecido
    EXECUTE sql;

    -- Retornar sucesso
    RETURN json_build_object('success', true, 'message', 'SQL executed successfully');
EXCEPTION
    WHEN OTHERS THEN
        -- Retornar erro
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;