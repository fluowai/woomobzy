BEGIN;

-- Align legacy Baileys WhatsApp tables with the current Go service contract.
-- Older databases may have organization_id/jid/profile_photo_url/key_id/from_me
-- while the service now reads tenant_id/chat_jid/avatar_url/message_id/is_from_me.

ALTER TABLE IF EXISTS public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS jid VARCHAR(100),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_instances'
      AND column_name = 'organization_id'
  ) THEN
    UPDATE public.whatsapp_instances
    SET tenant_id = organization_id
    WHERE tenant_id IS NULL
      AND organization_id IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_instances'
      AND column_name = 'phone_number'
  ) THEN
    UPDATE public.whatsapp_instances
    SET phone = phone_number
    WHERE (phone IS NULL OR phone = '')
      AND phone_number IS NOT NULL;
  END IF;
END $$;

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid
     AND att.attnum = ANY(con.conkey)
    WHERE con.conrelid = 'public.whatsapp_instances'::regclass
      AND con.contype = 'c'
      AND att.attname = 'status'
  LOOP
    EXECUTE format('ALTER TABLE public.whatsapp_instances DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

UPDATE public.whatsapp_instances
SET status = CASE status
  WHEN 'pending' THEN 'qr_pending'
  WHEN 'reconnecting' THEN 'connecting'
  ELSE status
END
WHERE status IN ('pending', 'reconnecting');

ALTER TABLE public.whatsapp_instances
  ALTER COLUMN status SET DEFAULT 'disconnected';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.whatsapp_instances'::regclass
      AND conname = 'whatsapp_instances_status_check'
  ) THEN
    ALTER TABLE public.whatsapp_instances
      ADD CONSTRAINT whatsapp_instances_status_check
      CHECK (status IN ('connected', 'disconnected', 'connecting', 'qr_pending'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_instances'
      AND constraint_name = 'whatsapp_instances_tenant_id_fkey'
  ) THEN
    ALTER TABLE public.whatsapp_instances DROP CONSTRAINT whatsapp_instances_tenant_id_fkey;
  END IF;

  ALTER TABLE public.whatsapp_instances
    ADD CONSTRAINT whatsapp_instances_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
END $$;

ALTER TABLE IF EXISTS public.whatsapp_chats
  ADD COLUMN IF NOT EXISTS chat_jid VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_message TEXT,
  ADD COLUMN IF NOT EXISTS unread_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_chats'
      AND column_name = 'jid'
  ) THEN
    UPDATE public.whatsapp_chats
    SET chat_jid = jid
    WHERE (chat_jid IS NULL OR chat_jid = '')
      AND jid IS NOT NULL;

    ALTER TABLE public.whatsapp_chats ALTER COLUMN jid DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_chats'
      AND column_name = 'profile_photo_url'
  ) THEN
    UPDATE public.whatsapp_chats
    SET avatar_url = profile_photo_url
    WHERE (avatar_url IS NULL OR avatar_url = '')
      AND profile_photo_url IS NOT NULL;
  END IF;
END $$;

UPDATE public.whatsapp_chats
SET chat_jid = id::text
WHERE chat_jid IS NULL OR chat_jid = '';

UPDATE public.whatsapp_chats
SET
  name = COALESCE(name, ''),
  unread_count = COALESCE(unread_count, 0),
  is_group = COALESCE(is_group, chat_jid LIKE '%@g.us', FALSE);

ALTER TABLE public.whatsapp_chats
  ALTER COLUMN chat_jid SET NOT NULL,
  ALTER COLUMN name SET DEFAULT '',
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN unread_count SET DEFAULT 0,
  ALTER COLUMN unread_count SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.whatsapp_chats'::regclass
      AND conname = 'whatsapp_chats_instance_chat_jid_key'
  ) THEN
    ALTER TABLE public.whatsapp_chats
      ADD CONSTRAINT whatsapp_chats_instance_chat_jid_key UNIQUE (instance_id, chat_jid);
  END IF;
END $$;

ALTER TABLE IF EXISTS public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS message_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sender_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_from_me BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_mimetype VARCHAR(100),
  ADD COLUMN IF NOT EXISTS media_filename VARCHAR(255),
  ADD COLUMN IF NOT EXISTS quoted_message_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_messages'
      AND column_name = 'key_id'
  ) THEN
    UPDATE public.whatsapp_messages
    SET message_id = key_id
    WHERE (message_id IS NULL OR message_id = '')
      AND key_id IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_messages'
      AND column_name = 'from_me'
  ) THEN
    UPDATE public.whatsapp_messages
    SET is_from_me = COALESCE(from_me, FALSE);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_messages'
      AND column_name = 'message_type'
  ) THEN
    UPDATE public.whatsapp_messages
    SET type = COALESCE(NULLIF(message_type, ''), 'text')
    WHERE type IS NULL OR type = '' OR type = 'text';
  END IF;
END $$;

UPDATE public.whatsapp_messages m
SET
  message_id = COALESCE(NULLIF(m.message_id, ''), m.id::text),
  sender_phone = COALESCE(NULLIF(m.sender_phone, ''), regexp_replace(split_part(c.chat_jid, '@', 1), '\D', '', 'g'), ''),
  sender_name = COALESCE(m.sender_name, ''),
  type = CASE
    WHEN COALESCE(m.type, '') IN ('text', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'contact', 'unknown')
    THEN m.type
    ELSE 'unknown'
  END,
  is_group = COALESCE(m.is_group, c.is_group, FALSE)
FROM public.whatsapp_chats c
WHERE c.id = m.chat_id;

UPDATE public.whatsapp_messages
SET
  message_id = COALESCE(NULLIF(message_id, ''), id::text),
  sender_phone = COALESCE(NULLIF(sender_phone, ''), ''),
  sender_name = COALESCE(sender_name, ''),
  type = CASE
    WHEN COALESCE(type, '') IN ('text', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'contact', 'unknown')
    THEN type
    ELSE 'unknown'
  END
WHERE message_id IS NULL
   OR message_id = ''
   OR sender_phone IS NULL
   OR type IS NULL
   OR type = '';

ALTER TABLE public.whatsapp_messages
  ALTER COLUMN message_id SET NOT NULL,
  ALTER COLUMN sender_phone SET DEFAULT '',
  ALTER COLUMN sender_phone SET NOT NULL,
  ALTER COLUMN sender_name SET DEFAULT '',
  ALTER COLUMN sender_name SET NOT NULL,
  ALTER COLUMN is_from_me SET DEFAULT FALSE,
  ALTER COLUMN is_from_me SET NOT NULL,
  ALTER COLUMN is_group SET DEFAULT FALSE,
  ALTER COLUMN is_group SET NOT NULL,
  ALTER COLUMN type SET DEFAULT 'text',
  ALTER COLUMN type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.whatsapp_messages'::regclass
      AND conname = 'whatsapp_messages_instance_message_id_key'
  ) THEN
    ALTER TABLE public.whatsapp_messages
      ADD CONSTRAINT whatsapp_messages_instance_message_id_key UNIQUE (instance_id, message_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  phone VARCHAR(20),
  push_name VARCHAR(255),
  display_name VARCHAR(255) NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.whatsapp_contacts
  ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS push_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_contacts'
      AND column_name = 'jid'
  ) THEN
    UPDATE public.whatsapp_contacts
    SET phone = regexp_replace(split_part(jid, '@', 1), '\D', '', 'g')
    WHERE (phone IS NULL OR phone = '')
      AND jid IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_contacts'
      AND column_name = 'profile_photo_url'
  ) THEN
    UPDATE public.whatsapp_contacts
    SET avatar_url = profile_photo_url
    WHERE (avatar_url IS NULL OR avatar_url = '')
      AND profile_photo_url IS NOT NULL;
  END IF;
END $$;

UPDATE public.whatsapp_contacts
SET
  phone = COALESCE(NULLIF(phone, ''), id::text),
  display_name = COALESCE(display_name, push_name, '');

ALTER TABLE public.whatsapp_contacts
  ALTER COLUMN display_name SET DEFAULT '',
  ALTER COLUMN display_name SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.whatsapp_contacts'::regclass
      AND conname = 'whatsapp_contacts_instance_phone_key'
  ) THEN
    ALTER TABLE public.whatsapp_contacts
      ADD CONSTRAINT whatsapp_contacts_instance_phone_key UNIQUE (instance_id, phone);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_tenant ON public.whatsapp_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_instance ON public.whatsapp_chats(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_jid ON public.whatsapp_chats(chat_jid);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_last_msg ON public.whatsapp_chats(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat ON public.whatsapp_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instance ON public.whatsapp_messages(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON public.whatsapp_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_instance ON public.whatsapp_contacts(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone ON public.whatsapp_contacts(phone);

COMMIT;
