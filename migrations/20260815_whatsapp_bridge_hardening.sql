-- WhatsApp/Whatsmeow reliability hardening.
-- Expand first: new states, an atomic instance/device binding and replica leases.

ALTER TABLE public.whatsapp_instances
  DROP CONSTRAINT IF EXISTS whatsapp_instances_status_check;

ALTER TABLE public.whatsapp_instances
  ADD CONSTRAINT whatsapp_instances_status_check
  CHECK (status IN (
    'connected', 'disconnected', 'connecting', 'qr_pending',
    'reconnecting', 'logged_out', 'stream_replaced', 'error'
  )) NOT VALID;

ALTER TABLE public.whatsapp_instances
  VALIDATE CONSTRAINT whatsapp_instances_status_check;

-- Abort instead of silently detaching a device if legacy duplicate bindings
-- exist. The diagnostic identifies data that must be reviewed by an operator.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.whatsapp_instances
    WHERE NULLIF(jid, '') IS NOT NULL
    GROUP BY jid
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate WhatsApp JIDs exist; resolve them before applying the unique binding';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_instances_device_jid
  ON public.whatsapp_instances (jid)
  WHERE NULLIF(jid, '') IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.whatsapp_instance_sessions (
  instance_id uuid PRIMARY KEY REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  device_jid text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.whatsapp_instance_sessions (instance_id, tenant_id, device_jid)
SELECT id, tenant_id, jid
FROM public.whatsapp_instances
WHERE NULLIF(jid, '') IS NOT NULL
ON CONFLICT (instance_id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  device_jid = EXCLUDED.device_jid,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.sync_whatsapp_instance_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NULLIF(NEW.jid, '') IS NULL THEN
    DELETE FROM public.whatsapp_instance_sessions WHERE instance_id = NEW.id;
  ELSE
    INSERT INTO public.whatsapp_instance_sessions (instance_id, tenant_id, device_jid)
    VALUES (NEW.id, NEW.tenant_id, NEW.jid)
    ON CONFLICT (instance_id) DO UPDATE SET
      tenant_id = EXCLUDED.tenant_id,
      device_jid = EXCLUDED.device_jid,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_whatsapp_instance_session ON public.whatsapp_instances;
CREATE TRIGGER trg_sync_whatsapp_instance_session
AFTER INSERT OR UPDATE OF jid, tenant_id ON public.whatsapp_instances
FOR EACH ROW EXECUTE FUNCTION public.sync_whatsapp_instance_session();

CREATE TABLE IF NOT EXISTS public.whatsapp_instance_leases (
  instance_id uuid PRIMARY KEY REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  owner_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_instance_leases_expiry
  ON public.whatsapp_instance_leases (expires_at);

ALTER TABLE public.whatsapp_instance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_instance_leases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on WhatsApp sessions" ON public.whatsapp_instance_sessions;
CREATE POLICY "Service role full access on WhatsApp sessions"
  ON public.whatsapp_instance_sessions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on WhatsApp leases" ON public.whatsapp_instance_leases;
CREATE POLICY "Service role full access on WhatsApp leases"
  ON public.whatsapp_instance_leases FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE public.whatsapp_instance_sessions IS
  'Atomic application mapping between an IMOBZY WhatsApp instance and a whatsmeow device JID.';
COMMENT ON TABLE public.whatsapp_instance_leases IS
  'Short-lived distributed ownership preventing multiple bridge replicas from connecting the same device.';

-- Rollback (manual, after stopping every WhatsApp bridge replica):
-- DROP TRIGGER IF EXISTS trg_sync_whatsapp_instance_session ON public.whatsapp_instances;
-- DROP FUNCTION IF EXISTS public.sync_whatsapp_instance_session();
-- DROP TABLE IF EXISTS public.whatsapp_instance_leases;
-- DROP TABLE IF EXISTS public.whatsapp_instance_sessions;
-- DROP INDEX IF EXISTS public.uq_whatsapp_instances_device_jid;
-- Do not restore the four-state constraint while rows use one of the new states.
