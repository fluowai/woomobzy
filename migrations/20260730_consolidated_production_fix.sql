-- ============================================================================
-- Consolidated Production Fix Migration
-- Generated: 2026-07-30
-- Combines: 20260604_email_center.sql + 20260608_ai_agent_orchestration.sql + 20260730_fix_all_production_errors.sql
-- Safe to run multiple times (idempotent).
-- ============================================================================

-- ============================================================================
-- PART 1: Email Center (from 20260604_email_center.sql)
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists email_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null,
  email text not null,
  encrypted_password text not null,
  imap_host text not null,
  imap_port integer not null default 993,
  imap_secure boolean not null default true,
  smtp_host text not null,
  smtp_port integer not null default 465,
  smtp_secure boolean not null default true,
  auth_method text not null default 'password',
  oauth_provider text,
  oauth_account_id text,
  last_inbox_uid bigint not null default 0,
  last_synced_at timestamptz,
  sync_status text not null default 'idle',
  sync_error text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, email)
);

alter table email_accounts add column if not exists auth_method text not null default 'password';
alter table email_accounts add column if not exists oauth_provider text;
alter table email_accounts add column if not exists oauth_account_id text;
alter table email_accounts add column if not exists last_inbox_uid bigint not null default 0;
alter table email_accounts add column if not exists sync_status text not null default 'idle';
alter table email_accounts add column if not exists sync_error text;
alter table email_accounts add column if not exists updated_at timestamptz not null default now();

create table if not exists emails (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  account_id uuid not null references email_accounts(id) on delete cascade,
  folder text not null default 'inbox',
  direction text not null default 'incoming',
  subject text,
  from_name text,
  from_email text,
  to_email text[] not null default '{}',
  cc_email text[] not null default '{}',
  body_html text,
  body_text text,
  preview text,
  date timestamptz,
  is_read boolean not null default false,
  is_archived boolean not null default false,
  message_id text,
  in_reply_to text,
  references_ids text[] not null default '{}',
  thread_id text not null,
  imap_uid bigint,
  lead_id uuid references leads(id) on delete set null,
  raw_headers jsonb not null default '{}',
  ai_metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table emails add column if not exists ai_metadata jsonb not null default '{}';
alter table emails add column if not exists updated_at timestamptz not null default now();

create table if not exists email_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid,
  account_id uuid references email_accounts(id) on delete cascade,
  email_id uuid references emails(id) on delete cascade,
  event_type text not null check (event_type in ('email_received', 'email_sent')),
  payload jsonb not null default '{}',
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists email_automation_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email_id uuid references emails(id) on delete cascade,
  job_type text not null,
  status text not null default 'queued',
  payload jsonb not null default '{}',
  result jsonb not null default '{}',
  run_after timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists email_accounts_org_user_email_idx
  on email_accounts (organization_id, user_id, lower(email));

create unique index if not exists emails_account_folder_uid_idx
  on emails (account_id, folder, imap_uid)
  where imap_uid is not null;

create unique index if not exists emails_account_message_folder_idx
  on emails (account_id, message_id, folder)
  where message_id is not null;

create index if not exists emails_org_folder_date_idx
  on emails (organization_id, folder, date desc);

create index if not exists emails_org_thread_idx
  on emails (organization_id, thread_id, date asc);

create index if not exists emails_org_lead_idx
  on emails (organization_id, lead_id)
  where lead_id is not null;

create index if not exists email_events_org_type_idx
  on email_events (organization_id, event_type, created_at desc);

alter table email_accounts enable row level security;
alter table emails enable row level security;
alter table email_events enable row level security;
alter table email_automation_jobs enable row level security;

drop policy if exists email_accounts_tenant_select on email_accounts;
create policy email_accounts_tenant_select on email_accounts
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.organization_id = email_accounts.organization_id
    )
  );

drop policy if exists emails_tenant_select on emails;
create policy emails_tenant_select on emails
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.organization_id = emails.organization_id
    )
  );

drop policy if exists email_events_tenant_select on email_events;
create policy email_events_tenant_select on email_events
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.organization_id = email_events.organization_id
    )
  );

drop policy if exists email_automation_jobs_tenant_select on email_automation_jobs;
create policy email_automation_jobs_tenant_select on email_automation_jobs
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.organization_id = email_automation_jobs.organization_id
    )
  );

-- ============================================================================
-- PART 2: AI Agent Orchestration (from 20260608_ai_agent_orchestration.sql)
-- ============================================================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_profile JSONB DEFAULT '{}'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_next_action TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_last_intent TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_last_confidence NUMERIC(4,3);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_visit_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_org_score
  ON leads(organization_id, lead_score DESC);

CREATE INDEX IF NOT EXISTS idx_leads_org_next_follow_up
  ON leads(organization_id, next_follow_up_at)
  WHERE next_follow_up_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_org_next_visit
  ON leads(organization_id, next_visit_at)
  WHERE next_visit_at IS NOT NULL;

ALTER TABLE lead_followups ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'follow_up';
ALTER TABLE lead_followups ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- PART 3: Fix ALL production 404/400/500 errors (from 20260730_fix_all_production_errors.sql)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'organization_id', '')::uuid,
    (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin');
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

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
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'condominiums' AND column_name = 'status') THEN
    ALTER TABLE public.condominiums ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'condominiums' AND column_name = 'units_count') THEN
    ALTER TABLE public.condominiums ADD COLUMN units_count INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'condominiums' AND column_name = 'delinquent_units') THEN
    ALTER TABLE public.condominiums ADD COLUMN delinquent_units INTEGER DEFAULT 0;
  END IF;
END $$;

ALTER TABLE public.condominiums ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation condominiums" ON public.condominiums;
CREATE POLICY "Tenant isolation condominiums" ON public.condominiums
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS on_condominiums_updated ON public.condominiums;
CREATE TRIGGER on_condominiums_updated
  BEFORE UPDATE ON public.condominiums
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_condominiums_org ON public.condominiums (organization_id);

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

ALTER TABLE public.condominium_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation condominium_tickets" ON public.condominium_tickets;
CREATE POLICY "Tenant isolation condominium_tickets" ON public.condominium_tickets
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS on_condominium_tickets_updated ON public.condominium_tickets;
CREATE TRIGGER on_condominium_tickets_updated
  BEFORE UPDATE ON public.condominium_tickets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_condominium_tickets_org_status ON public.condominium_tickets (organization_id, status);

CREATE TABLE IF NOT EXISTS public.rental_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tenant_name TEXT NOT NULL,
  tenant_email TEXT,
  tenant_phone TEXT,
  tenant_cpf TEXT,
  tenant_rg TEXT,
  tenant_type TEXT CHECK (tenant_type IN ('PF', 'PJ')),
  tenant_birth_date DATE,
  tenant_marital_status TEXT,
  tenant_profession TEXT,
  tenant_employer TEXT,
  tenant_monthly_income NUMERIC(12,2),
  tenant_address TEXT,
  tenant_city TEXT,
  tenant_state TEXT,
  tenant_zip TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  reference_1_name TEXT,
  reference_1_phone TEXT,
  reference_2_name TEXT,
  reference_2_phone TEXT,
  start_date DATE,
  end_date DATE,
  monthly_rent NUMERIC(12,2) DEFAULT 0,
  due_day INTEGER CHECK (due_day BETWEEN 1 AND 31),
  adjustment_index TEXT DEFAULT 'IGPM',
  guarantee_type TEXT,
  guarantee_document TEXT,
  deposit_caucao_amount NUMERIC(12,2),
  insurance_company TEXT,
  insurance_policy_number TEXT,
  late_fee_percent NUMERIC(5,2) DEFAULT 2.00,
  late_interest_percent NUMERIC(8,5) DEFAULT 0.03333,
  contract_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'cadastral_analysis', 'income_analysis', 'pending_signatures', 'active', 'suspended', 'terminated', 'expired', 'archived')),
  payment_status TEXT DEFAULT 'em_dia' CHECK (payment_status IN ('em_dia', 'atrasado', 'inadimplente')),
  observation TEXT,
  notes TEXT,
  evaluation_score INTEGER DEFAULT 0,
  evaluation_status TEXT DEFAULT 'em_analise',
  credit_score INTEGER,
  has_restrictions BOOLEAN DEFAULT false,
  restriction_notes TEXT,
  income_proof_status TEXT DEFAULT 'pendente',
  guarantor_name TEXT,
  guarantor_cpf TEXT,
  guarantor_phone TEXT,
  guarantor_monthly_income NUMERIC(12,2),
  recommended_limit NUMERIC(12,2),
  analysis_notes TEXT,
  signed_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.rental_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation rental_contracts" ON public.rental_contracts;
CREATE POLICY "Tenant isolation rental_contracts" ON public.rental_contracts
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS on_rental_contracts_updated ON public.rental_contracts;
CREATE TRIGGER on_rental_contracts_updated
  BEFORE UPDATE ON public.rental_contracts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_rental_contracts_org_status ON public.rental_contracts (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_org_created ON public.rental_contracts (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.lease_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES public.rental_contracts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lease_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation lease_history" ON public.lease_history;
CREATE POLICY "Tenant isolation lease_history" ON public.lease_history
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_lease_history_lease ON public.lease_history (lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_history_created ON public.lease_history (created_at);

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  document_type TEXT DEFAULT 'CPF',
  document_number TEXT,
  cpf_cnpj TEXT,
  roles TEXT[] DEFAULT '{Cliente}',
  birth_date DATE,
  marital_status TEXT,
  profession TEXT,
  monthly_income NUMERIC(12,2),
  address_zip TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_clients" ON public.clients;
DROP POLICY IF EXISTS "Tenant isolation clients" ON public.clients;
DROP POLICY IF EXISTS "superadmin_all_clients" ON public.clients;

CREATE POLICY "tenant_isolation_clients" ON public.clients
  FOR ALL USING (organization_id = public.get_my_org_id() OR public.is_superadmin());
CREATE POLICY "superadmin_all_clients" ON public.clients
  FOR ALL USING (public.is_superadmin());

DROP TRIGGER IF EXISTS on_clients_updated ON public.clients;
CREATE TRIGGER on_clients_updated
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

GRANT ALL ON public.clients TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'lead_score') THEN
      ALTER TABLE public.leads ADD COLUMN lead_score INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'ai_next_action') THEN
      ALTER TABLE public.leads ADD COLUMN ai_next_action TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'next_follow_up_at') THEN
      ALTER TABLE public.leads ADD COLUMN next_follow_up_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'next_visit_at') THEN
      ALTER TABLE public.leads ADD COLUMN next_visit_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'chat_jid') THEN
      ALTER TABLE public.leads ADD COLUMN chat_jid TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'campaign') THEN
      ALTER TABLE public.leads ADD COLUMN campaign TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'classification') THEN
      ALTER TABLE public.leads ADD COLUMN classification TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'budget_min') THEN
      ALTER TABLE public.leads ADD COLUMN budget_min NUMERIC(14,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'budget_max') THEN
      ALTER TABLE public.leads ADD COLUMN budget_max NUMERIC(14,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'bedrooms') THEN
      ALTER TABLE public.leads ADD COLUMN bedrooms INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'area_min') THEN
      ALTER TABLE public.leads ADD COLUMN area_min NUMERIC(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'area_max') THEN
      ALTER TABLE public.leads ADD COLUMN area_max NUMERIC(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'property_type') THEN
      ALTER TABLE public.leads ADD COLUMN property_type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'property_id') THEN
      ALTER TABLE public.leads ADD COLUMN property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'client_id') THEN
      ALTER TABLE public.leads ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'last_contacted_at') THEN
      ALTER TABLE public.leads ADD COLUMN last_contacted_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'ad_reference') THEN
      ALTER TABLE public.leads ADD COLUMN ad_reference TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'organic_channel') THEN
      ALTER TABLE public.leads ADD COLUMN organic_channel TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'budget') THEN
      ALTER TABLE public.leads ADD COLUMN budget TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'aptitude_interest') THEN
      ALTER TABLE public.leads ADD COLUMN aptitude_interest TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'preferences') THEN
      ALTER TABLE public.leads ADD COLUMN preferences JSONB DEFAULT '{}';
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.lead_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation lead_activities" ON public.lead_activities;
CREATE POLICY "Tenant isolation lead_activities" ON public.lead_activities
  FOR ALL TO authenticated
  USING (organization_id = public.get_my_org_id() OR public.is_superadmin())
  WITH CHECK (organization_id = public.get_my_org_id() OR public.is_superadmin());

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON public.lead_activities (lead_id, created_at DESC);

SELECT 'Consolidated migration 20260730 completed!' AS result;
