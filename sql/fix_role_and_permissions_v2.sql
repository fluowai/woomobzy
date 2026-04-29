-- 1. HABILITAR RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. FUNÇÃO DE APOIO
CREATE OR REPLACE FUNCTION get_my_org_id() 
RETURNS uuid AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. POLÍTICAS PARA PROFILES
DROP POLICY IF EXISTS "Profiles isolation" ON profiles;
CREATE POLICY "Profiles isolation" ON profiles
  FOR ALL USING (organization_id = get_my_org_id() OR id = auth.uid());

-- 4. POLÍTICAS PARA ORGANIZATIONS
DROP POLICY IF EXISTS "Organizations isolation" ON organizations;
CREATE POLICY "Organizations isolation" ON organizations
  FOR SELECT USING (id = get_my_org_id());
