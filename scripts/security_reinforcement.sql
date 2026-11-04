-- ============================================
-- IMOBZY SECURITY REINFORCEMENT
-- Habilitando RLS e Políticas de Tenant em todas as tabelas
-- ============================================

-- 1. SITE SETTINGS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation site_settings" ON site_settings;
CREATE POLICY "Tenant isolation site_settings" ON site_settings
  FOR ALL USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- 2. SITE TEXTS
ALTER TABLE site_texts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation site_texts" ON site_texts;
CREATE POLICY "Tenant isolation site_texts" ON site_texts
  FOR ALL USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- 3. LANDING PAGES
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation landing_pages" ON landing_pages;
CREATE POLICY "Tenant isolation landing_pages" ON landing_pages
  FOR ALL USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- 4. DUE DILIGENCE
ALTER TABLE due_diligence_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation due_diligence" ON due_diligence_items;
CREATE POLICY "Tenant isolation due_diligence" ON due_diligence_items
  FOR ALL USING (
    property_id IN (
      SELECT id FROM properties WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

-- 5. PROPERTY POLYGONS
ALTER TABLE property_polygons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation polygons" ON property_polygons;
CREATE POLICY "Tenant isolation polygons" ON property_polygons
  FOR ALL USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- 6. PROFILES (Segurança extra: usuário só vê sua org)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
CREATE POLICY "Users can view profiles in their organization" ON profiles
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    OR role = 'superadmin'
  );

-- 7. PUBLIC ACCESS (Exceção para Site Público)
-- Permitir que qualquer um leia configurações e páginas de destino (pelas slugs)
-- Mas sem permitir escrita/mudança.
CREATE POLICY "Public read site_settings" ON site_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Public read landing_pages" ON landing_pages FOR SELECT TO anon USING (true);
CREATE POLICY "Public read site_texts" ON site_texts FOR SELECT TO anon USING (true);
CREATE POLICY "Public read properties" ON properties FOR SELECT TO anon USING (true);
