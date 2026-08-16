-- Migration: Add missing unique constraints for WhatsApp upserts
-- Date: 2026-08-07
--
-- The whatsapp-service uses ON CONFLICT (instance_id, chat_jid),
-- (instance_id, phone) and (instance_id, message_id). These constraints
-- were missing on production, so every upsert failed with SQLSTATE 42P10
-- and no messages were persisted or broadcast.

-- 1) Deduplicate rows that would block the unique constraints
-- whatsapp_chats: keep the row with the newest last_message_at
DELETE FROM public.whatsapp_chats a
USING public.whatsapp_chats b
WHERE a.instance_id = b.instance_id
  AND a.chat_jid = b.chat_jid
  AND a.id <> b.id
  AND (a.last_message_at < b.last_message_at
       OR (a.last_message_at IS NOT DISTINCT FROM b.last_message_at AND a.id > b.id));

-- whatsapp_contacts: keep the row with the newest updated_at
DELETE FROM public.whatsapp_contacts a
USING public.whatsapp_contacts b
WHERE a.instance_id = b.instance_id
  AND a.phone = b.phone
  AND a.id <> b.id
  AND (a.updated_at < b.updated_at
       OR (a.updated_at IS NOT DISTINCT FROM b.updated_at AND a.id > b.id));

-- whatsapp_messages: keep the row with the newest timestamp
DELETE FROM public.whatsapp_messages a
USING public.whatsapp_messages b
WHERE a.instance_id = b.instance_id
  AND a.message_id = b.message_id
  AND a.id <> b.id
  AND (a.timestamp < b.timestamp
       OR (a.timestamp IS NOT DISTINCT FROM b.timestamp AND a.id > b.id));

-- 2) Add unique constraints (idempotent)
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
