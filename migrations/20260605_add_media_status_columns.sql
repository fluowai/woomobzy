-- Adiciona colunas de controle de mídia na tabela whatsapp_messages
-- Execute este script no Supabase SQL Editor se o run-migrations falhar

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS media_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS media_error TEXT,
  ADD COLUMN IF NOT EXISTS media_retry_count INTEGER NOT NULL DEFAULT 0;

-- Adiciona constraint de check se não existir
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

-- Atualiza registros de mídia existentes
UPDATE public.whatsapp_messages
SET media_status = CASE
    WHEN COALESCE(media_url, '') <> '' THEN 'ready'
    WHEN type IN ('image', 'audio', 'video', 'document', 'sticker') THEN 'pending'
    ELSE 'none'
  END
WHERE media_status = 'none'
  AND type IN ('image', 'audio', 'video', 'document', 'sticker');
