-- WhatsApp media pipeline foundation.
-- Keeps legacy whatsapp_messages.media_* fields for compatibility while adding
-- a first-class media entity for retries, processing metadata and AI output.

ALTER TABLE IF EXISTS public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS media_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS media_error TEXT,
  ADD COLUMN IF NOT EXISTS media_retry_count INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.whatsapp_messages'::regclass
      AND conname = 'whatsapp_messages_media_status_check'
  ) THEN
    ALTER TABLE public.whatsapp_messages
      ADD CONSTRAINT whatsapp_messages_media_status_check
      CHECK (media_status IN ('none', 'pending', 'downloading', 'processing', 'ready', 'failed', 'expired'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.whatsapp_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  type TEXT NOT NULL,

  provider TEXT NOT NULL DEFAULT 'minio',
  bucket TEXT NOT NULL DEFAULT 'whatsapp-media',
  object_key TEXT NOT NULL DEFAULT '',
  public_url TEXT,

  filename TEXT,
  mime_type TEXT,
  size_bytes BIGINT,

  width INTEGER,
  height INTEGER,
  duration_ms INTEGER,

  thumbnail_url TEXT,
  thumbnail_bucket TEXT,
  thumbnail_object_key TEXT,

  waveform JSONB,
  transcription TEXT,
  summary TEXT,
  sentiment TEXT,
  extracted_tasks JSONB,
  ocr_text TEXT,
  ai_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT whatsapp_media_type_check
    CHECK (type IN ('image', 'audio', 'video', 'document', 'sticker', 'unknown')),
  CONSTRAINT whatsapp_media_status_check
    CHECK (status IN ('pending', 'downloading', 'processing', 'ready', 'failed', 'expired'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_media_message_unique
  ON public.whatsapp_media(message_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_media_instance_status
  ON public.whatsapp_media(instance_id, status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_media_tenant_type_created
  ON public.whatsapp_media(tenant_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_media_status_retry
  ON public.whatsapp_media(status, retry_count, updated_at);

CREATE OR REPLACE FUNCTION public.touch_whatsapp_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_whatsapp_media_updated_at ON public.whatsapp_media;
CREATE TRIGGER trg_touch_whatsapp_media_updated_at
  BEFORE UPDATE ON public.whatsapp_media
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_whatsapp_media_updated_at();

INSERT INTO public.whatsapp_media (
  message_id,
  instance_id,
  tenant_id,
  type,
  provider,
  bucket,
  object_key,
  public_url,
  filename,
  mime_type,
  status,
  created_at,
  updated_at
)
SELECT
  m.id,
  m.instance_id,
  wi.tenant_id,
  CASE
    WHEN m.type IN ('image', 'audio', 'video', 'document', 'sticker') THEN m.type
    ELSE 'unknown'
  END,
  CASE
    WHEN COALESCE(m.media_url, '') ILIKE '%supabase%' THEN 'supabase'
    ELSE 'minio'
  END,
  CASE
    WHEN COALESCE(m.media_url, '') ILIKE '%/storage/v1/object/public/%'
      THEN split_part(regexp_replace(m.media_url, '^.*/storage/v1/object/public/', ''), '/', 1)
    WHEN COALESCE(m.media_url, '') ~ '^https?://'
      THEN split_part(regexp_replace(m.media_url, '^https?://[^/]+/', ''), '/', 1)
    ELSE 'whatsapp-media'
  END,
  CASE
    WHEN COALESCE(m.media_url, '') ILIKE '%/storage/v1/object/public/%'
      THEN regexp_replace(m.media_url, '^.*/storage/v1/object/public/[^/]+/', '')
    WHEN COALESCE(m.media_url, '') ~ '^https?://'
      THEN regexp_replace(m.media_url, '^https?://[^/]+/[^/]+/?', '')
    ELSE ''
  END,
  NULLIF(m.media_url, ''),
  NULLIF(m.media_filename, ''),
  NULLIF(m.media_mimetype, ''),
  CASE WHEN COALESCE(m.media_url, '') <> '' THEN 'ready' ELSE 'pending' END,
  COALESCE(m.created_at, now()),
  now()
FROM public.whatsapp_messages m
JOIN public.whatsapp_instances wi ON wi.id = m.instance_id
WHERE m.type IN ('image', 'audio', 'video', 'document', 'sticker')
  AND NOT EXISTS (
    SELECT 1
    FROM public.whatsapp_media wm
    WHERE wm.message_id = m.id
  );

UPDATE public.whatsapp_messages m
SET media_status = CASE
    WHEN COALESCE(m.media_url, '') <> '' THEN 'ready'
    WHEN m.type IN ('image', 'audio', 'video', 'document', 'sticker') THEN 'pending'
    ELSE 'none'
  END
WHERE m.media_status = 'none'
  AND m.type IN ('image', 'audio', 'video', 'document', 'sticker');

ALTER TABLE public.whatsapp_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on whatsapp media" ON public.whatsapp_media;
CREATE POLICY "Service role full access on whatsapp media"
  ON public.whatsapp_media
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation whatsapp media" ON public.whatsapp_media;
CREATE POLICY "Tenant isolation whatsapp media"
  ON public.whatsapp_media
  FOR ALL
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
