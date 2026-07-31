-- ============================================================================
-- Migration: Fix Contratos e Juridico (LegalContracts) em producao
-- Date: 2026-07-30
-- Fixes:
--   1. Tabela `contracts` usada por `views/LegalContracts.tsx` (/urban/contracts
--      e /rural/contracts) nao possui as colunas title/type/value/template_id
--      que a UI le e grava (o schema local esperava essas colunas).
--   2. `contracts` estava com RLS habilitada e SEM nenhuma policy -> usuarios
--      autenticados nao conseguiam ler (lista vazia) nem inserir contratos.
--
-- Idempotente (safe to run multiple times).
-- ============================================================================

-- 1. Colunas usadas pela UI de Contratos e Juridico
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS value NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS template_id TEXT;

-- 2. RLS ativa sem policies: garante policy de tenant isolation
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation contracts" ON public.contracts;
CREATE POLICY "Tenant isolation contracts" ON public.contracts
  FOR ALL TO authenticated
  USING (organization_id = public.get_my_org_id() OR public.is_superadmin())
  WITH CHECK (organization_id = public.get_my_org_id() OR public.is_superadmin());

-- 3. Trigger de updated_at (paridade com demais tabelas)
DROP TRIGGER IF EXISTS on_contracts_updated ON public.contracts;
CREATE TRIGGER on_contracts_updated
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Indice de performance
CREATE INDEX IF NOT EXISTS idx_contracts_org_created ON public.contracts (organization_id, created_at DESC);
