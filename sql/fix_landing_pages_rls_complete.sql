-- FIX: Landing Pages RLS — definitive
-- Run in Supabase SQL Editor

-- 1. Ensure get_my_org_id() exists and is robust
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Drop ALL conflicting policies on landing_pages
DROP POLICY IF EXISTS "Tenant isolation landing_pages" ON landing_pages;
DROP POLICY IF EXISTS "Public read landing_pages" ON landing_pages;
DROP POLICY IF EXISTS "Public Access to Landing Pages" ON landing_pages;
DROP POLICY IF EXISTS "Public read landing_pages" ON landing_pages;

-- 3. Tenant isolation: authenticated users see/modify only their org's rows
CREATE POLICY "Tenant isolation landing_pages" ON landing_pages
  FOR ALL TO authenticated
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

-- 4. Public read: anon users can read active published pages
CREATE POLICY "Public read landing_pages" ON landing_pages
  FOR SELECT TO anon
  USING (is_active = true);
