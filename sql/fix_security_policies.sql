-- ============================================================
-- IMOBZY SECURITY: MULTI-TENANT ISOLATION (RLS)
-- ============================================================

-- 1. HABILITAR RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- 2. FUNÇÃO DE APOIO
CREATE OR REPLACE FUNCTION get_my_org_id() 
RETURNS uuid AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. POLÍTICAS DE ISOLAMENTO
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
    AND tablename IN ('properties', 'leads', 'landing_pages', 'site_settings') LOOP
    
    EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation %I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Tenant isolation %I" ON %I USING (organization_id = get_my_org_id())', t, t);
  END LOOP;
END $$;

-- 4. ACESSO PÚBLICO
DROP POLICY IF EXISTS "Public read landing_pages" ON landing_pages;
CREATE POLICY "Public read landing_pages" ON landing_pages FOR SELECT TO anon USING (is_active = true);

DROP POLICY IF EXISTS "Public read properties" ON properties;
CREATE POLICY "Public read properties" ON properties FOR SELECT TO anon USING (status = 'Disponível');
