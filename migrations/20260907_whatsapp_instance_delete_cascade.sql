-- Make instance deletion safe for databases created before the WhatsApp
-- schema added cascading foreign keys. The service also removes these rows
-- explicitly, keeping deletion compatible until this migration is applied.

ALTER TABLE public.whatsapp_media
  DROP CONSTRAINT IF EXISTS whatsapp_media_instance_id_fkey;
ALTER TABLE public.whatsapp_media
  ADD CONSTRAINT whatsapp_media_instance_id_fkey
  FOREIGN KEY (instance_id) REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE;

ALTER TABLE public.whatsapp_messages
  DROP CONSTRAINT IF EXISTS whatsapp_messages_instance_id_fkey;
ALTER TABLE public.whatsapp_messages
  ADD CONSTRAINT whatsapp_messages_instance_id_fkey
  FOREIGN KEY (instance_id) REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE;

ALTER TABLE public.whatsapp_chats
  DROP CONSTRAINT IF EXISTS whatsapp_chats_instance_id_fkey;
ALTER TABLE public.whatsapp_chats
  ADD CONSTRAINT whatsapp_chats_instance_id_fkey
  FOREIGN KEY (instance_id) REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE;

ALTER TABLE public.whatsapp_contacts
  DROP CONSTRAINT IF EXISTS whatsapp_contacts_instance_id_fkey;
ALTER TABLE public.whatsapp_contacts
  ADD CONSTRAINT whatsapp_contacts_instance_id_fkey
  FOREIGN KEY (instance_id) REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE;
