-- Hardening for WhatsApp receipts, async media worker and PostgreSQL-backed sessions.

ALTER TABLE IF EXISTS public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'sent';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.whatsapp_messages'::regclass
      AND conname = 'whatsapp_messages_delivery_status_check'
  ) THEN
    ALTER TABLE public.whatsapp_messages
      ADD CONSTRAINT whatsapp_messages_delivery_status_check
      CHECK (delivery_status IN ('sent', 'delivered', 'read', 'played', 'failed'));
  END IF;
END $$;

ALTER TABLE IF EXISTS public.whatsapp_media
  ADD COLUMN IF NOT EXISTS whatsapp_payload BYTEA,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_message_id TEXT;

CREATE INDEX IF NOT EXISTS idx_whatsapp_media_worker_pending
  ON public.whatsapp_media(status, next_retry_at, retry_count, updated_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_delivery_status
  ON public.whatsapp_messages(instance_id, delivery_status, timestamp DESC);
