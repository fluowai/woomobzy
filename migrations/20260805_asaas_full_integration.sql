-- Adiciona campos de integracao Asaas para assinaturas SaaS
-- Data: 2026-08-05

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS asaas_customer_id text,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id text;

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS asaas_price_id text;

CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id),
  gateway_payment_id text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','vencido','cancelado','estornado')),
  amount numeric(12,2) NOT NULL,
  due_date date NOT NULL,
  payment_date date,
  paid_amount numeric(12,2),
  payment_method text,
  pix_code text,
  pix_qr_code text,
  bank_slip_url text,
  invoice_url text,
  invoice_number text,
  description text,
  gateway_response jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT subscription_invoices_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_invoices_org ON public.subscription_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_gateway ON public.subscription_invoices(gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_status ON public.subscription_invoices(status);

ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant read own subscription invoices" ON public.subscription_invoices;
CREATE POLICY "Tenant read own subscription invoices"
  ON public.subscription_invoices FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Superadmin manage subscription invoices" ON public.subscription_invoices;
CREATE POLICY "Superadmin manage subscription invoices"
  ON public.subscription_invoices FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');
