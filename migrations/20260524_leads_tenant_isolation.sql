-- Enforce tenant isolation for CRM leads at the database layer.
-- This protects direct Supabase reads in the frontend and any authenticated client.

CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'organization_id') IS NOT NULL THEN
    RETURN (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid;
  END IF;

  RETURN (
    SELECT organization_id
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation leads" ON public.leads;
DROP POLICY IF EXISTS "Tenant isolation policy" ON public.leads;

CREATE POLICY "Tenant isolation leads"
ON public.leads
FOR ALL
TO authenticated
USING (organization_id = public.get_my_org_id())
WITH CHECK (organization_id = public.get_my_org_id());
