-- Fix: urban_lots missing, developments RLS + CHECK, status CHECK mismatch
-- Date: 2026-07-27
-- Addresses: 404 urban_lots, 403 developments INSERT, status CHECK constraint

-- ============================================================
-- 1. Ensure urban_lots table exists (migration 20260620 may not have been applied)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.urban_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  development_id UUID NOT NULL REFERENCES public.developments(id) ON DELETE CASCADE,
  block_name TEXT NOT NULL DEFAULT 'Quadra A',
  lot_number TEXT NOT NULL,
  area_m2 NUMERIC(12,2) DEFAULT 0,
  price NUMERIC(14,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'blocked')),
  buyer_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  reservation_expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_urban_lots_org_dev_status
  ON public.urban_lots (organization_id, development_id, status);

-- ============================================================
-- 2. Enable RLS + policy on urban_lots (with explicit WITH CHECK)
-- ============================================================
ALTER TABLE public.urban_lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation urban_lots" ON public.urban_lots;
CREATE POLICY "Tenant isolation urban_lots" ON public.urban_lots
  USING  (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- ============================================================
-- 3. Fix developments RLS: drop + recreate with explicit WITH CHECK
--    The original policy had only USING (no WITH CHECK), which causes
--    INSERT failures with error 42501 "new row violates row-level security"
-- ============================================================
DROP POLICY IF EXISTS "Tenant isolation developments" ON public.developments;
CREATE POLICY "Tenant isolation developments" ON public.developments
  USING  (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- ============================================================
-- 4. Fix developments status CHECK to match frontend options
--    Old: ('em_obras', 'lancamento', 'pronto', 'esgotado')
--    New: adds 'projeto', 'aprovacao', 'pre_venda' used by Empreendimentos UI
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'developments_status_check') THEN
    ALTER TABLE public.developments DROP CONSTRAINT developments_status_check;
  END IF;
END $$;

ALTER TABLE public.developments ADD CONSTRAINT developments_status_check
  CHECK (status IN ('projeto', 'aprovacao', 'pre_venda', 'em_obras', 'lancamento', 'pronto', 'esgotado'));

-- ============================================================
-- 5. Add missing columns to developments that the frontend expects
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'developments' AND column_name = 'registration_number') THEN
    ALTER TABLE public.developments ADD COLUMN registration_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'developments' AND column_name = 'total_area') THEN
    ALTER TABLE public.developments ADD COLUMN total_area NUMERIC(12,2) DEFAULT 0;
  END IF;
END $$;

-- ============================================================
-- 6. Ensure other urban module tables + RLS (idempotent)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.key_control (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'checked_out', 'overdue', 'lost')),
  location TEXT,
  responsible_name TEXT,
  checked_out_at TIMESTAMPTZ,
  expected_return_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.condominiums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  units_count INTEGER DEFAULT 0,
  residents_count INTEGER DEFAULT 0,
  delinquent_units INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.urban_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'signed', 'expired', 'rejected')),
  file_url TEXT,
  file_size TEXT,
  expires_at DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS + policies for urban tables
ALTER TABLE public.key_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condominiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urban_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation key_control" ON public.key_control;
CREATE POLICY "Tenant isolation key_control" ON public.key_control
  USING  (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation condominiums" ON public.condominiums;
CREATE POLICY "Tenant isolation condominiums" ON public.condominiums
  USING  (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation urban_documents" ON public.urban_documents;
CREATE POLICY "Tenant isolation urban_documents" ON public.urban_documents
  USING  (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

SELECT 'Migration 20260727_fix_urban_lots_and_developments_rls completed!' AS result;
