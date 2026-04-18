-- ============================================================
-- IMOBZY HARDENING: MULTI-TENANT ISOLATION (RLS) - FINAL STABLE
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

-- 2. SINCRONIZAÇÃO DE METADADOS (JWT)
-- Mantém o organization_id dentro do token do usuário para evitar recursão
CREATE OR REPLACE FUNCTION sync_user_org_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users 
  SET raw_app_meta_data = raw_app_meta_data || 
    jsonb_build_object('organization_id', NEW.organization_id)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_org_update ON profiles;
CREATE TRIGGER on_profile_org_update
  AFTER INSERT OR UPDATE OF organization_id ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_user_org_metadata();

-- Sincronizar dados atuais
UPDATE auth.users u
SET raw_app_meta_data = raw_app_meta_data || 
    jsonb_build_object('organization_id', p.organization_id)
FROM profiles p
WHERE u.id = p.id AND p.organization_id IS NOT NULL;

-- 3. POLÍTICAS PARA PROFILES (NÃO-RECURSIVAS VIA JWT)
DROP POLICY IF EXISTS "Profiles_Standard_Access" ON profiles;
CREATE POLICY "Profiles_Standard_Access" ON profiles
FOR ALL USING (
  id = auth.uid() 
  OR 
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid 
);

-- 4. FUNÇÃO DE APOIO PARA DEMAIS TABELAS
CREATE OR REPLACE FUNCTION get_my_org_id() 
RETURNS uuid AS $$
  -- Retorna o ID vindo do metadado do token para máxima performance
  SELECT (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid;
$$ LANGUAGE sql STABLE;

-- 5. POLÍTICAS PARA AS DEMAIS TABELAS (EXEMPLO)
-- Aplicar para: properties, leads, whatsapp_instances, site_settings, domains
DROP POLICY IF EXISTS "Tenant isolation policy" ON properties;
CREATE POLICY "Tenant isolation policy" ON properties FOR ALL 
USING (organization_id = get_my_org_id())
WITH CHECK (organization_id = get_my_org_id());
