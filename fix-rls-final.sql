-- ============================================================
-- CORREÇÃO DEFINITIVA: Tabela properties (erro 401) e validação RLS
-- Executar este script NO SQL Editor do Supabase:
-- https://app.supabase.com/ → SQL Editor
-- ============================================================

-- 1. Habilitar RLS e policy na tabela properties (corrige 401)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_all_properties ON properties FOR ALL USING (true) WITH CHECK (true);

-- 2. Garantir que tabela ai_execution_logs tem policies corretas
ALTER TABLE ai_execution_logs ENABLE ROW LEVEL SECURITY;
-- Se as policies já existirem, isso é um no-op seguro
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_ai_execution_logs' AND tablename = 'ai_execution_logs') THEN
    CREATE POLICY service_role_all_ai_execution_logs ON ai_execution_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_ai_execution_logs' AND tablename = 'ai_execution_logs') THEN
    CREATE POLICY tenant_ai_execution_logs ON ai_execution_logs FOR ALL USING (organization_id = get_my_org_id()) WITH CHECK (organization_id = get_my_org_id());
  END IF;
END$$;

-- 3. Verificar view/functions necessárias
-- Garantir que get_my_org_id() existe e funciona
SELECT get_my_org_id() AS current_org_id;

-- 4. Listar todas tables e seu status RLS
SELECT 
  tablename, 
  (SELECT polname FROM pg_policies WHERE tablename = t.tablename AND polcmd = 'SELECT' LIMIT 1) AS select_policy
FROM pg_tables t 
WHERE schemaname = 'public' 
ORDER BY tablename;