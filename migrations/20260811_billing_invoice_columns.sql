-- Adiciona colunas de fatura (gateway) na tabela billing usada pelo painel de cobranca
-- Frontend: views/urban/Cobranca.tsx (handleGenerateInvoice)

ALTER TABLE public.billing
  ADD COLUMN IF NOT EXISTS invoice_url text,
  ADD COLUMN IF NOT EXISTS payment_gateway_id text;

SELECT 'Migration 20260811_billing_invoice_columns completed!' AS result;
