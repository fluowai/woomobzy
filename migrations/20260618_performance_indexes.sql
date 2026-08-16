-- Performance indexes for Kanban cursor pagination and CRM detail.
-- This file must be executed without wrapping it in an explicit transaction.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_kanban_stage_cursor
  ON public.leads (organization_id, status, created_at DESC, id DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_org_created_cursor
  ON public.leads (organization_id, created_at DESC, id DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_activities_org_lead_created
  ON public.lead_activities (organization_id, lead_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_org_phone
  ON public.leads (organization_id, phone);

-- Validated on 2026-06-18 using pg_stat_user_indexes:
-- idx_leads_organization and idx_properties_organization had zero scans,
-- while their equivalent indexes were actively used.
DROP INDEX CONCURRENTLY IF EXISTS public.idx_leads_organization;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_properties_organization;
