-- IMOBZY hardening consolidado apos auditoria MinIO/tenant.
-- Corrige policies permissivas antigas e padroniza isolamento por organizacao.

CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid AS $$
  SELECT NULLIF(auth.jwt() -> 'app_metadata' ->> 'organization_id', '')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'superadmin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
ALTER FUNCTION public.is_superadmin() SET search_path = public;

-- Properties: usuarios autenticados so acessam o proprio tenant; anonimo so ve estoque publico.
ALTER TABLE IF EXISTS public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access to Properties" ON public.properties;
DROP POLICY IF EXISTS "Public read properties" ON public.properties;
DROP POLICY IF EXISTS "Tenant isolation properties" ON public.properties;
DROP POLICY IF EXISTS "Tenant isolation policy" ON public.properties;

CREATE POLICY "Tenant isolation properties" ON public.properties
  FOR ALL TO authenticated
  USING (organization_id = public.get_my_org_id() OR public.is_superadmin())
  WITH CHECK (organization_id = public.get_my_org_id() OR public.is_superadmin());

CREATE POLICY "Public read available properties" ON public.properties
  FOR SELECT TO anon
  USING (status IN ('Disponivel', 'Disponível', 'available', 'publicado'));

-- Leads: nunca devem ser publicos; tenant ou superadmin.
ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation leads" ON public.leads;
DROP POLICY IF EXISTS "Tenant isolation policy" ON public.leads;

CREATE POLICY "Tenant isolation leads" ON public.leads
  FOR ALL TO authenticated
  USING (organization_id = public.get_my_org_id() OR public.is_superadmin())
  WITH CHECK (organization_id = public.get_my_org_id() OR public.is_superadmin());

-- WhatsApp: substituir policies FOR ALL USING(true) por relacao com tenant.
ALTER TABLE IF EXISTS public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Service role full access on contacts" ON public.whatsapp_contacts;
DROP POLICY IF EXISTS "Service role full access on chats" ON public.whatsapp_chats;
DROP POLICY IF EXISTS "Service role full access on messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Tenant isolation instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Tenant isolation contacts" ON public.whatsapp_contacts;
DROP POLICY IF EXISTS "Tenant isolation chats" ON public.whatsapp_chats;
DROP POLICY IF EXISTS "Tenant isolation messages" ON public.whatsapp_messages;

CREATE POLICY "Tenant isolation instances" ON public.whatsapp_instances
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_org_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_org_id() OR public.is_superadmin());

CREATE POLICY "Tenant isolation contacts" ON public.whatsapp_contacts
  FOR ALL TO authenticated
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi
      WHERE wi.id = whatsapp_contacts.instance_id
        AND wi.tenant_id = public.get_my_org_id()
    )
  )
  WITH CHECK (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi
      WHERE wi.id = whatsapp_contacts.instance_id
        AND wi.tenant_id = public.get_my_org_id()
    )
  );

CREATE POLICY "Tenant isolation chats" ON public.whatsapp_chats
  FOR ALL TO authenticated
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi
      WHERE wi.id = whatsapp_chats.instance_id
        AND wi.tenant_id = public.get_my_org_id()
    )
  )
  WITH CHECK (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi
      WHERE wi.id = whatsapp_chats.instance_id
        AND wi.tenant_id = public.get_my_org_id()
    )
  );

CREATE POLICY "Tenant isolation messages" ON public.whatsapp_messages
  FOR ALL TO authenticated
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi
      WHERE wi.id = whatsapp_messages.instance_id
        AND wi.tenant_id = public.get_my_org_id()
    )
  )
  WITH CHECK (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi
      WHERE wi.id = whatsapp_messages.instance_id
        AND wi.tenant_id = public.get_my_org_id()
    )
  );

-- Agentes e automacoes de CRM/WhatsApp. Algumas bases antigas ainda nao tem
-- essas tabelas, entao a correcao e condicional.
DO $$
DECLARE
  policy_table text;
BEGIN
  FOREACH policy_table IN ARRAY ARRAY['ai_agents', 'lead_tags', 'lead_followups']
  LOOP
    IF to_regclass('public.' || policy_table) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', policy_table);
      EXECUTE format('DROP POLICY IF EXISTS "Service role full access on %s" ON public.%I', policy_table, policy_table);
      EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation %s" ON public.%I', policy_table, policy_table);
      EXECUTE format(
        'CREATE POLICY "Tenant isolation %s" ON public.%I FOR ALL TO authenticated USING (organization_id = public.get_my_org_id() OR public.is_superadmin()) WITH CHECK (organization_id = public.get_my_org_id() OR public.is_superadmin())',
        policy_table,
        policy_table
      );
    END IF;
  END LOOP;
END $$;
