-- Adds CRM ownership support used by the WhatsApp attendance transfer action.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to
  ON public.leads(organization_id, assigned_to);
