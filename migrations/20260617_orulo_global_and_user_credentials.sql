CREATE TABLE IF NOT EXISTS public.platform_integrations (
  provider TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  encrypted_credentials TEXT NOT NULL,
  configured_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orulo_user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  encrypted_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_orulo_user_credentials_user
  ON public.orulo_user_credentials (user_id, organization_id);

ALTER TABLE public.platform_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orulo_user_credentials ENABLE ROW LEVEL SECURITY;

-- Remove segredos antigos do JSON carregado no frontend. Usuários que já haviam
-- autorizado a Órulo precisarão conectar a conta novamente uma única vez.
UPDATE public.site_settings
SET integrations = jsonb_set(
  COALESCE(integrations, '{}'::jsonb),
  '{orulo}',
  COALESCE(integrations->'orulo', '{}'::jsonb)
    - 'clientId'
    - 'client_id'
    - 'clientSecret'
    - 'client_secret'
    - 'endUserAuth',
  true
)
WHERE COALESCE(integrations, '{}'::jsonb) ? 'orulo';

NOTIFY pgrst, 'reload schema';
