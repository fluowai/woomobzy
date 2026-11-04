-- Whatsmeow identity, receipts and tenant hardening.
-- Additive migration: keeps legacy columns while enabling safer contracts.

BEGIN;

ALTER TABLE public.whatsapp_contacts
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS canonical_jid TEXT,
  ADD COLUMN IF NOT EXISTS lid_jid TEXT,
  ADD COLUMN IF NOT EXISTS phone_e164 TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS manual_name TEXT,
  ADD COLUMN IF NOT EXISTS resolved_display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_bucket TEXT,
  ADD COLUMN IF NOT EXISTS avatar_object_key TEXT,
  ADD COLUMN IF NOT EXISTS avatar_status TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS avatar_refreshed_at TIMESTAMPTZ;

UPDATE public.whatsapp_contacts wc
SET tenant_id = wi.tenant_id,
    phone_e164 = CASE
      WHEN regexp_replace(COALESCE(wc.phone, ''), '\D', '', 'g') LIKE '55%'
       AND length(regexp_replace(COALESCE(wc.phone, ''), '\D', '', 'g')) IN (12, 13)
      THEN '+' || regexp_replace(COALESCE(wc.phone, ''), '\D', '', 'g')
      ELSE wc.phone_e164
    END,
    canonical_jid = CASE
      WHEN regexp_replace(COALESCE(wc.phone, ''), '\D', '', 'g') LIKE '55%'
       AND length(regexp_replace(COALESCE(wc.phone, ''), '\D', '', 'g')) IN (12, 13)
      THEN regexp_replace(COALESCE(wc.phone, ''), '\D', '', 'g') || '@s.whatsapp.net'
      ELSE wc.canonical_jid
    END
FROM public.whatsapp_instances wi
WHERE wi.id = wc.instance_id
  AND wc.tenant_id IS NULL;

UPDATE public.whatsapp_contacts
SET resolved_display_name = CASE
    WHEN COALESCE(manual_name, '') <> '' THEN manual_name
    WHEN COALESCE(display_name, '') <> ''
      AND lower(display_name) NOT IN ('~', 'me', 'contato sem telefone', 'telefone nao identificado', 'telefone não identificado')
      AND display_name NOT ILIKE '%@lid'
      AND display_name NOT LIKE '%--%'
      THEN display_name
    WHEN COALESCE(push_name, '') <> ''
      AND lower(push_name) NOT IN ('~', 'me', 'contato sem telefone')
      AND push_name NOT ILIKE '%@lid'
      AND push_name NOT LIKE '%--%'
      THEN push_name
    WHEN COALESCE(phone_e164, '') <> '' THEN phone_e164
    ELSE 'Contato nao identificado'
  END
WHERE resolved_display_name IS NULL OR resolved_display_name = '';

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_tenant_phone
  ON public.whatsapp_contacts(tenant_id, phone);

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_tenant_phone_e164
  ON public.whatsapp_contacts(tenant_id, phone_e164)
  WHERE phone_e164 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_instance_canonical_jid
  ON public.whatsapp_contacts(instance_id, canonical_jid)
  WHERE canonical_jid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_instance_lid
  ON public.whatsapp_contacts(instance_id, lid_jid)
  WHERE lid_jid IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.whatsapp_message_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  whatsapp_message_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'read', 'played', 'failed')),
  participant_jid TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_message_status_unique
  ON public.whatsapp_message_status(instance_id, whatsapp_message_id, status, COALESCE(participant_jid, ''));

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_status_tenant_time
  ON public.whatsapp_message_status(tenant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_status_message
  ON public.whatsapp_message_status(message_id, occurred_at DESC);

ALTER TABLE public.whatsapp_message_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on whatsapp message status" ON public.whatsapp_message_status;
CREATE POLICY "Service role full access on whatsapp message status"
  ON public.whatsapp_message_status
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation whatsapp message status" ON public.whatsapp_message_status;
CREATE POLICY "Tenant isolation whatsapp message status"
  ON public.whatsapp_message_status
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS phone_e164 TEXT,
  ADD COLUMN IF NOT EXISTS phone_search_key TEXT;

UPDATE public.leads
SET phone_e164 = CASE
    WHEN regexp_replace(COALESCE(phone, ''), '\D', '', 'g') LIKE '55%'
     AND length(regexp_replace(COALESCE(phone, ''), '\D', '', 'g')) IN (12, 13)
    THEN '+' || regexp_replace(COALESCE(phone, ''), '\D', '', 'g')
    ELSE phone_e164
  END,
  phone_search_key = right(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), 8)
WHERE phone IS NOT NULL
  AND (phone_e164 IS NULL OR phone_search_key IS NULL);

CREATE INDEX IF NOT EXISTS idx_leads_org_phone_e164
  ON public.leads(organization_id, phone_e164)
  WHERE phone_e164 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_org_phone_search_key
  ON public.leads(organization_id, phone_search_key)
  WHERE phone_search_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_media_tenant_bucket_object
  ON public.whatsapp_media(tenant_id, bucket, object_key)
  WHERE object_key <> '';

COMMIT;
