-- ============================================================================
-- Migration: Fix profiles RLS recursion after reseller isolation
-- Created: 2026-08-23
-- Context:
--   The previous reseller-isolation migration added a profiles SELECT policy
--   that called helper functions which read public.profiles. PostgREST then
--   failed the auth bootstrap profile query with:
--     42P17 infinite recursion detected in policy for relation "profiles"
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove recursive or legacy profile policies. A policy on profiles must not
-- call functions that read profiles or query profiles in a subquery.
DROP POLICY IF EXISTS "profiles_self" ON public.profiles;
DROP POLICY IF EXISTS "Profiles_own_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_same_org_or_reseller_or_mega" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_same_reseller_team" ON public.profiles;

-- Keep browser-safe profile reads minimal and non-recursive. This is enough for
-- AuthContext bootstrap: SELECT ... FROM profiles WHERE id = auth.uid().
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Keep self-update non-recursive. Cross-user profile administration must go
-- through trusted backend routes with service-role access and explicit scope.
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self"
  ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

NOTIFY pgrst, 'reload schema';
