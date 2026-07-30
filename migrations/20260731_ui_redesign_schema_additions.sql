-- Migration: Campos e Tabelas para os novos Redesigns UI Premium (Julho/2026)
-- Este arquivo adiciona as estruturas de dados necessárias para suportar as 
-- novas features e campos exibidos nos dashboards recém criados.

-- 1. Tabela: properties (Central de Portfólio)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS quality_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS publication_status text DEFAULT 'not_published',
  ADD COLUMN IF NOT EXISTS portals_published text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS leads_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_update_date timestamp with time zone;

-- 2. Tabela: leads (Pipeline Comercial / Kanban)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS temperature text DEFAULT 'Frio',
  ADD COLUMN IF NOT EXISTS property_interest text,
  ADD COLUMN IF NOT EXISTS next_action_type text,
  ADD COLUMN IF NOT EXISTS next_action_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS sla_deadline timestamp with time zone,
  ADD COLUMN IF NOT EXISTS is_starred boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_connected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS funnel_stage text DEFAULT '1. Novo contato',
  ADD COLUMN IF NOT EXISTS temperature_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;

-- 3. Tabela: conversations / messages (Central de Mensagens)
-- Assuming 'conversations' table handles the chat channels
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS sla_deadline timestamp with time zone,
  ADD COLUMN IF NOT EXISTS ai_insight text;

-- 4. Tabela: developments & development_lots (Central de Loteamentos)
CREATE TABLE IF NOT EXISTS public.developments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  vgv_total numeric(15,2) DEFAULT 0,
  percent_sold numeric(5,2) DEFAULT 0,
  status text DEFAULT 'Em comercialização',
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.development_lots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  development_id uuid REFERENCES public.developments(id) ON DELETE CASCADE,
  block text NOT NULL,
  lot_number text NOT NULL,
  area numeric(10,2),
  price numeric(15,2),
  status text DEFAULT 'available', -- available, reserved, sold, blocked
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Tabela: lease_contracts / rentals (Central de Locações)
ALTER TABLE public.lease_contracts
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'Em dia',
  ADD COLUMN IF NOT EXISTS guarantee_type text,
  ADD COLUMN IF NOT EXISTS next_adjustment_date date;

-- 6. Tabela: condominiums (Novo Condomínio)
ALTER TABLE public.condominiums
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS total_units integer,
  ADD COLUMN IF NOT EXISTS blocks integer,
  ADD COLUMN IF NOT EXISTS year_built integer,
  ADD COLUMN IF NOT EXISTS amenities jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS syndic_name text,
  ADD COLUMN IF NOT EXISTS syndic_phone text,
  ADD COLUMN IF NOT EXISTS syndic_email text;

-- 7. Tabela: financing_simulations (Simulador Financeiro)
CREATE TABLE IF NOT EXISTS public.financing_simulations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  lead_id uuid,
  bank_name text,
  amortization_type text,
  property_value numeric(15,2),
  down_payment numeric(15,2),
  interest_rate numeric(5,2),
  term_months integer,
  status text DEFAULT 'Em análise',
  created_at timestamp with time zone DEFAULT now()
);

-- 8. Tabela: legal_contracts (Contratos e Jurídico)
CREATE TABLE IF NOT EXISTS public.legal_contracts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  contract_type text,
  title text,
  party_a text,
  party_b text,
  value numeric(15,2),
  status text DEFAULT 'Rascunho',
  signatures_required integer DEFAULT 1,
  signatures_collected integer DEFAULT 0,
  expiration_date date,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS (Row Level Security) para as novas tabelas
ALTER TABLE public.developments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.development_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financing_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_contracts ENABLE ROW LEVEL SECURITY;

-- Políticas básicas de segurança (Tenant Isolation)
CREATE POLICY "Tenant Isolation Developments" ON public.developments FOR ALL USING (tenant_id = (SELECT auth.uid()));
CREATE POLICY "Tenant Isolation Lots" ON public.development_lots FOR ALL USING (development_id IN (SELECT id FROM public.developments WHERE tenant_id = (SELECT auth.uid())));
CREATE POLICY "Tenant Isolation Simulations" ON public.financing_simulations FOR ALL USING (tenant_id = (SELECT auth.uid()));
CREATE POLICY "Tenant Isolation Contracts" ON public.legal_contracts FOR ALL USING (tenant_id = (SELECT auth.uid()));
