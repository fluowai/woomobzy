-- WhatsApp media recovery hardening.
-- Old history imports could leave media rows pending without object data and
-- without the original WhatsApp payload required for the async worker retry.

BEGIN;

WITH orphan_media AS (
  UPDATE public.whatsapp_media
  SET status = 'failed',
      last_error = 'Midia sem payload de recuperacao. Reimporte a conversa para recriar o job de download.',
      next_retry_at = now(),
      claimed_at = NULL,
      updated_at = now()
  WHERE status IN ('pending', 'downloading', 'processing')
    AND COALESCE(object_key, '') = ''
    AND COALESCE(public_url, '') = ''
    AND whatsapp_payload IS NULL
  RETURNING message_id, last_error, retry_count
)
UPDATE public.whatsapp_messages m
SET media_status = 'failed',
    media_error = orphan_media.last_error,
    media_retry_count = orphan_media.retry_count
FROM orphan_media
WHERE m.id = orphan_media.message_id;

CREATE INDEX IF NOT EXISTS idx_whatsapp_media_recoverable_payload
  ON public.whatsapp_media(status, next_retry_at, retry_count)
  WHERE whatsapp_payload IS NOT NULL;

COMMIT;
