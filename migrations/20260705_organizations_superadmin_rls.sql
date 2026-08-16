-- Allow superadmins to manage organizations via authenticated JWT (admin panel fallback)
-- and let tenant users read their own organization row.

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmin full access organizations" ON public.organizations;
CREATE POLICY "Superadmin full access organizations" ON public.organizations
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "Users read own organization" ON public.organizations;
CREATE POLICY "Users read own organization" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.get_my_org_id());

NOTIFY pgrst, 'reload schema';
