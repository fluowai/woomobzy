-- Ensure Supabase/PostgREST can discover support ticket relationships.
-- CREATE TABLE IF NOT EXISTS does not add foreign keys to tables that already existed.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.support_tickets'::regclass
      AND conname = 'support_tickets_organization_id_fkey'
  ) THEN
    ALTER TABLE public.support_tickets
      ADD CONSTRAINT support_tickets_organization_id_fkey
      FOREIGN KEY (organization_id)
      REFERENCES public.organizations(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.support_tickets'::regclass
      AND conname = 'support_tickets_user_id_fkey'
  ) THEN
    ALTER TABLE public.support_tickets
      ADD CONSTRAINT support_tickets_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.support_messages'::regclass
      AND conname = 'support_messages_ticket_id_fkey'
  ) THEN
    ALTER TABLE public.support_messages
      ADD CONSTRAINT support_messages_ticket_id_fkey
      FOREIGN KEY (ticket_id)
      REFERENCES public.support_tickets(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.support_messages'::regclass
      AND conname = 'support_messages_user_id_fkey'
  ) THEN
    ALTER TABLE public.support_messages
      ADD CONSTRAINT support_messages_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOREACH constraint_name IN ARRAY ARRAY[
    'support_tickets_organization_id_fkey',
    'support_tickets_user_id_fkey',
    'support_messages_ticket_id_fkey',
    'support_messages_user_id_fkey'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I',
        CASE
          WHEN constraint_name LIKE 'support_tickets_%' THEN 'support_tickets'
          ELSE 'support_messages'
        END,
        constraint_name
      );
    EXCEPTION
      WHEN foreign_key_violation THEN
        RAISE NOTICE 'Constraint % contains existing orphaned rows and remains NOT VALID.', constraint_name;
    END;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
