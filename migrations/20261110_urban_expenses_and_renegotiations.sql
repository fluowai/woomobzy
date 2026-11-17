-- Urban expenses table for Financeiro & ERP (Contas a Pagar + DRE)
CREATE TABLE IF NOT EXISTS public.urban_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Operacional',
  description TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_urban_expenses_org_due ON public.urban_expenses(organization_id, due_date DESC);

ALTER TABLE public.urban_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "urban_expenses_tenant_isolation" ON public.urban_expenses;
CREATE POLICY "urban_expenses_tenant_isolation" ON public.urban_expenses
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

