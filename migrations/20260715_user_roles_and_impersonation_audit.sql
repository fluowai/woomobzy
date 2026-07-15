-- Phase 2 hardening: canonical user_roles + impersonation audit
--
-- ADDITIVE. Does NOT drop or rename profiles.role. Existing auth.js reads
-- profiles.role as before. This migration provisions the canonical
-- (Lovable) pattern in parallel so server code can be migrated file by
-- file in follow-up PRs. See docs/security/RBAC_MIGRATION.md.

BEGIN;

-- 1. Enum ---------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'user');
  END IF;
END$$;

-- 2. user_roles table ---------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.app_role NOT NULL,
  granted_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON public.user_roles(user_id);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL    ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_roles_self_read ON public.user_roles;
CREATE POLICY user_roles_self_read
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies: writes happen through service_role
-- (server code) only. Prevents privilege escalation via Data API.

-- 3. has_role security definer -----------------------------------------

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role    = _role
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)
  TO authenticated, service_role;

-- Convenience wrapper reading auth.uid() (safe to call from RLS).
CREATE OR REPLACE FUNCTION public.current_user_has_role(_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), _role)
$$;

REVOKE ALL ON FUNCTION public.current_user_has_role(public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_has_role(public.app_role)
  TO authenticated, service_role;

-- 4. Backfill from profiles.role ---------------------------------------
--
-- Idempotent — ON CONFLICT DO NOTHING on the (user_id, role) unique key.
-- Only inserts rows for profiles whose role matches the app_role enum.

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, p.role::public.app_role
FROM public.profiles p
WHERE p.role IN ('superadmin', 'admin', 'user')
  AND p.id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Impersonation audit log -------------------------------------------

CREATE TABLE IF NOT EXISTS public.impersonation_audit_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_email       text,
  target_org_id     uuid,
  action            text NOT NULL,          -- 'start' | 'stop' | 'request'
  request_method    text,
  request_path      text,
  request_ip        inet,
  user_agent        text,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS impersonation_audit_actor_idx
  ON public.impersonation_audit_log(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS impersonation_audit_target_org_idx
  ON public.impersonation_audit_log(target_org_id, created_at DESC);

GRANT SELECT ON public.impersonation_audit_log TO authenticated;
GRANT ALL    ON public.impersonation_audit_log TO service_role;

ALTER TABLE public.impersonation_audit_log ENABLE ROW LEVEL SECURITY;

-- Only superadmins can read the audit log; writes only via service_role.
DROP POLICY IF EXISTS impersonation_audit_superadmin_read ON public.impersonation_audit_log;
CREATE POLICY impersonation_audit_superadmin_read
  ON public.impersonation_audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

COMMIT;
