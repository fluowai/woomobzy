ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS selected_plan_at TIMESTAMPTZ;

INSERT INTO public.plans (name, slug, price_monthly, features, limits, is_active, trial_days)
VALUES
  (
    'Free',
    'free',
    0,
    '["crm","site"]'::jsonb,
    '{"users":1,"properties":15,"whatsapp_instances":0}'::jsonb,
    true,
    7
  ),
  (
    'Essencial',
    'starter',
    97,
    '["crm","site","whatsapp"]'::jsonb,
    '{"users":5,"properties":100,"whatsapp_instances":1}'::jsonb,
    true,
    7
  ),
  (
    'Profissional',
    'pro',
    197,
    '["crm","site","whatsapp","ia_chat","api"]'::jsonb,
    '{"users":-1,"properties":-1,"whatsapp_instances":3}'::jsonb,
    true,
    7
  ),
  (
    'Enterprise',
    'enterprise',
    397,
    '["crm","site","whatsapp","ia_chat","api"]'::jsonb,
    '{"users":-1,"properties":-1,"whatsapp_instances":10}'::jsonb,
    true,
    7
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  is_active = EXCLUDED.is_active,
  trial_days = EXCLUDED.trial_days,
  updated_at = now();

UPDATE public.organizations
SET niche = 'traditional'
WHERE niche = 'hybrid';

NOTIFY pgrst, 'reload schema';
