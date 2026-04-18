-- ==========================================
-- HARDENING SQL: MULTI-TENANT ISOLATION (RLS)
-- ==========================================

-- 1. Habilitar RLS em todas as tabelas críticas
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;

-- 2. Função Auxiliar para obter o Org ID do JWT
-- Suposta implementação: o organization_id deve estar nos metadados do JWT 
-- Se não estiver, usamos busca na tabela profiles (mais lento, mas seguro)
CREATE OR REPLACE FUNCTION get_my_org_id() 
RETURNS uuid AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. POLÍTICAS PARA ORGANIZATIONS
-- Usuários só veem sua própria organização
CREATE POLICY "Users can view own organization" 
ON organizations FOR SELECT 
USING (id = get_my_org_id());

-- Superadmin vê tudo
CREATE POLICY "Superadmin full access on organizations" 
ON organizations FOR ALL 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');

-- 4. POLÍTICAS PARA PROPERTIES
CREATE POLICY "Tenant isolation for properties" 
ON properties FOR ALL 
USING (organization_id = get_my_org_id())
WITH CHECK (organization_id = get_my_org_id());

-- 5. POLÍTICAS PARA LEADS
CREATE POLICY "Tenant isolation for leads" 
ON leads FOR ALL 
USING (organization_id = get_my_org_id())
WITH CHECK (organization_id = get_my_org_id());

-- 6. POLÍTICAS PARA WHATSAPP
CREATE POLICY "Tenant isolation for whatsapp_instances" 
ON whatsapp_instances FOR ALL 
USING (organization_id = get_my_org_id())
WITH CHECK (organization_id = get_my_org_id());

CREATE POLICY "Tenant isolation for whatsapp_chats" 
ON whatsapp_chats FOR ALL 
USING (instance_id IN (SELECT id FROM whatsapp_instances WHERE organization_id = get_my_org_id()));

CREATE POLICY "Tenant isolation for whatsapp_messages" 
ON whatsapp_messages FOR ALL 
USING (instance_id IN (SELECT id FROM whatsapp_instances WHERE organization_id = get_my_org_id()));

-- 7. POLÍTICAS PARA SITE SETTINGS
CREATE POLICY "Tenant isolation for site_settings" 
ON site_settings FOR ALL 
USING (organization_id = get_my_org_id())
WITH CHECK (organization_id = get_my_org_id());

-- 8. POLÍTICAS PARA PROFILES
-- Usuário vê a si mesmo e admins veem outros da mesma org
CREATE POLICY "Profiles isolation" 
ON profiles FOR ALL 
USING (organization_id = get_my_org_id() OR id = auth.uid());

-- 9. BYPASS PARA SERVICE ROLE (Backup/Internal)
CREATE POLICY "Service role full access" 
ON properties FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');
-- (Repetir para outras tabelas se necessário, mas o service_role nativamente ignora RLS no Supabase JS)
