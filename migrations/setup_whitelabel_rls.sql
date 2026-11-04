-- Enable Reseller (Revenda) to view their sub-organizations
DROP POLICY IF EXISTS "Reseller view sub-organizations" ON public.organizations;
CREATE POLICY "Reseller view sub-organizations" ON public.organizations
  FOR SELECT
  USING (
    parent_id = (
      SELECT organization_id FROM public.users WHERE id = auth.uid() LIMIT 1
    )
  );

-- Enable Reseller to manage (update) their sub-organizations
DROP POLICY IF EXISTS "Reseller update sub-organizations" ON public.organizations;
CREATE POLICY "Reseller update sub-organizations" ON public.organizations
  FOR UPDATE
  USING (
    parent_id = (
      SELECT organization_id FROM public.users WHERE id = auth.uid() LIMIT 1
    )
  );

-- Enable Reseller to insert new sub-organizations
DROP POLICY IF EXISTS "Reseller insert sub-organizations" ON public.organizations;
CREATE POLICY "Reseller insert sub-organizations" ON public.organizations
  FOR INSERT
  WITH CHECK (
    parent_id = (
      SELECT organization_id FROM public.users WHERE id = auth.uid() LIMIT 1
    )
  );

-- Enable Reseller to view users belonging to their sub-organizations
DROP POLICY IF EXISTS "Reseller view sub-organization users" ON public.users;
CREATE POLICY "Reseller view sub-organization users" ON public.users
  FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM public.organizations 
      WHERE parent_id = (
        SELECT organization_id FROM public.users WHERE id = auth.uid() LIMIT 1
      )
    )
  );

-- Enable Reseller to view site_settings of their sub-organizations
DROP POLICY IF EXISTS "Reseller view sub-organization settings" ON public.site_settings;
CREATE POLICY "Reseller view sub-organization settings" ON public.site_settings
  FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM public.organizations 
      WHERE parent_id = (
        SELECT organization_id FROM public.users WHERE id = auth.uid() LIMIT 1
      )
    )
  );
