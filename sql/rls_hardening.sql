-- ============================================================
-- IMOBZY HARDENING: MULTI-TENANT ISOLATION (RLS) - STABLE
-- ============================================================

-- 1. HABILITAR RLS NAS TABELAS CRÍTICAS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;

-- 2. FUNÇÃO DE RESOLUÇÃO DE TENANT (ESTÁVEL)
-- Usa SECURITY DEFINER e busca direta para evitar recursão infinita
CREATE OR REPLACE FUNCTION get_my_org_id() 
RETURNS uuid AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 3. POLÍTICAS PARA PROFILES (NÃO-RECURSIVAS)
DROP POLICY IF EXISTS "Profiles_Self_Access" ON profiles;
CREATE POLICY "Profiles_Self_Access" ON profiles FOR ALL USING (id = auth.uid());

DROP POLICY IF EXISTS "Profiles_Org_Access" ON profiles;
CREATE POLICY "Profiles_Org_Access" ON profiles FOR SELECT 
USING (organization_id = (SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid() LIMIT 1));

DROP POLICY IF EXISTS "Profiles_SuperAdmin_Access" ON profiles;
CREATE POLICY "Profiles_SuperAdmin_Access" ON profiles FOR ALL 
USING ((SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'superadmin');

-- 4. POLÍTICAS PARA AS DEMAIS TABELAS (PROPERTIES, LEADS, ETC)
-- Aplicar para: properties, leads, whatsapp_instances, site_settings, domains
-- Exemplo para Properties:
DROP POLICY IF EXISTS "Tenant isolation for properties" ON properties;
CREATE POLICY "Tenant isolation for properties" ON properties FOR ALL 
USING (organization_id = get_my_org_id())
WITH CHECK (organization_id = get_my_org_id());

-- (O padrão acima se repete para as outras tabelas usando get_my_org_id())
