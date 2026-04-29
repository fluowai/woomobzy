-- HABILITAR RLS
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;

-- POLÍTICA DE ISOLAMENTO (Dono/Empresa)
DROP POLICY IF EXISTS "Tenant isolation landing_pages" ON landing_pages;
CREATE POLICY "Tenant isolation landing_pages" ON landing_pages 
  FOR ALL USING (organization_id = get_my_org_id());

-- ACESSO PÚBLICO PARA VISITANTES
DROP POLICY IF EXISTS "Public read landing_pages" ON landing_pages;
CREATE POLICY "Public read landing_pages" ON landing_pages 
  FOR SELECT TO anon USING (is_active = true);
