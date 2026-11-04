-- Enhance Condominiums table with more management fields
-- Date: 2026-08-26

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'condominiums' AND column_name = 'cnpj') THEN
    ALTER TABLE public.condominiums ADD COLUMN cnpj TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'condominiums' AND column_name = 'manager_name') THEN
    ALTER TABLE public.condominiums ADD COLUMN manager_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'condominiums' AND column_name = 'contact_email') THEN
    ALTER TABLE public.condominiums ADD COLUMN contact_email TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'condominiums' AND column_name = 'contact_phone') THEN
    ALTER TABLE public.condominiums ADD COLUMN contact_phone TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'condominiums' AND column_name = 'zip_code') THEN
    ALTER TABLE public.condominiums ADD COLUMN zip_code TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'condominiums' AND column_name = 'neighborhood') THEN
    ALTER TABLE public.condominiums ADD COLUMN neighborhood TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'condominiums' AND column_name = 'status') THEN
    ALTER TABLE public.condominiums ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;
