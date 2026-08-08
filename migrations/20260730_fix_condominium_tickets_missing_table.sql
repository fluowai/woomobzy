-- ============================================================================
-- Migration: Fix condominium_tickets missing table + add status to condominiums
-- Date: 2026-07-30
-- Fixes:
--   1. 404 GET /condominium_tickets (table did not exist)
--   2. 400 POST /condominiums (column mismatch: total_units vs units_count,
--      and missing status column — frontend already fixed to match schema)
-- ============================================================================

-- ============================================================
-- 1. Create condominium_tickets table (idempotent)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.condominium_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  condominium_id UUID REFERENCES public.condominiums(id) ON DELETE CASCADE,
  unit_label TEXT,
  category TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. Index for org-scoped queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_condominium_tickets_org_status
  ON public.condominium_tickets (organization_id, status);

-- ============================================================
-- 3. Enable RLS
-- ============================================================
ALTER TABLE public.condominium_tickets ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS policy with explicit WITH CHECK (needed for INSERT)
-- ============================================================
DROP POLICY IF EXISTS "Tenant isolation condominium_tickets" ON public.condominium_tickets;
CREATE POLICY "Tenant isolation condominium_tickets" ON public.condominium_tickets
  USING  (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- ============================================================
-- 5. Add status column to condominiums if missing
--    (frontend was sending status: 'active')
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'condominiums' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.condominiums
      ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

SELECT 'Migration 20260730_fix_condominium_tickets_missing_table completed!' AS result;
