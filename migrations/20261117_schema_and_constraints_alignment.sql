-- =============================================================================
-- Migration: 20261117_schema_and_constraints_alignment.sql
-- Purpose: Align rural property columns, landing_pages columns, and CRM check
--          constraints with full-stack application usage.
-- =============================================================================

-- 1. Colunas complementares para imóveis rurais e urbanos em public.properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS car_number text,
  ADD COLUMN IF NOT EXISTS productive_area_ha numeric,
  ADD COLUMN IF NOT EXISTS soil_type text,
  ADD COLUMN IF NOT EXISTS water_resources text;

-- 2. Colunas completas do construtor de Landing Pages em public.landing_pages
ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS meta_keywords jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS og_image text,
  ADD COLUMN IF NOT EXISTS template_id text,
  ADD COLUMN IF NOT EXISTS theme_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS blocks jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS property_selection jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS form_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS custom_css text,
  ADD COLUMN IF NOT EXISTS custom_js text,
  ADD COLUMN IF NOT EXISTS custom_head text;

-- 3. Atualizar CHECK constraint de status do Funil CRM / Kanban em public.leads
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check CHECK (
  status = ANY (ARRAY[
    'Novo'::text,
    'Em Atendimento'::text,
    'Qualificado'::text,
    'Visita Agendada'::text,
    'Proposta'::text,
    'Negociação'::text,
    'Documentação'::text,
    'Fechado'::text,
    'Ganho'::text,
    'Perdido'::text,
    'Arquivado'::text,
    'Nutrição Quiz'::text
  ])
);

-- 4. Atualizar CHECK constraint de tipos de atividade em public.lead_activities
ALTER TABLE public.lead_activities DROP CONSTRAINT IF EXISTS lead_activities_type_check;
ALTER TABLE public.lead_activities ADD CONSTRAINT lead_activities_type_check CHECK (
  type = ANY (ARRAY[
    'Nota'::text,
    'Chamada'::text,
    'Ligação'::text,
    'Ligacao'::text,
    'WhatsApp'::text,
    'Email'::text,
    'Visita'::text,
    'Proposta'::text,
    'Status'::text,
    'Sistema'::text,
    'Matchmaking IA'::text,
    'Match'::text,
    'IA'::text,
    'Tarefa'::text,
    'Reunião'::text
  ])
);

-- 5. Recarregar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';

