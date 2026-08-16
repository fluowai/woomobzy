CREATE TABLE IF NOT EXISTS public.impersonation_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.organizations(id),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  impersonated_user_id uuid NOT NULL REFERENCES auth.users(id),
  token_hash text,
  reason text,
  status text DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id),
  revoke_reason text,
  created_ip inet,
  user_agent text,
  last_seen_at timestamptz
);

ALTER TABLE public.impersonation_sessions
  ADD COLUMN IF NOT EXISTS token_hash text,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS revoke_reason text,
  ADD COLUMN IF NOT EXISTS created_ip inet,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

UPDATE public.impersonation_sessions
SET status = COALESCE(NULLIF(status, ''), 'active')
WHERE status IS NULL OR status = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'impersonation_sessions_status_check'
      AND conrelid = 'public.impersonation_sessions'::regclass
  ) THEN
    ALTER TABLE public.impersonation_sessions
      ADD CONSTRAINT impersonation_sessions_status_check
      CHECK (status IN ('active', 'revoked', 'expired'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_actor_status
  ON public.impersonation_sessions (actor_user_id, status);

CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_tenant_status_expires
  ON public.impersonation_sessions (tenant_id, status, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_expires
  ON public.impersonation_sessions (expires_at);

ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmin manage impersonation" ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_backend_only ON public.impersonation_sessions;

REVOKE ALL ON TABLE public.impersonation_sessions FROM PUBLIC;
REVOKE ALL ON TABLE public.impersonation_sessions FROM anon;
REVOKE ALL ON TABLE public.impersonation_sessions FROM authenticated;
