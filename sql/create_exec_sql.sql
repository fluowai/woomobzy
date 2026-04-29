-- ADMIN: Função para executar SQL via RPC (CUIDADO: SECURITY DEFINER)
-- Esta função é usada pelo script de migração automatizada
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
