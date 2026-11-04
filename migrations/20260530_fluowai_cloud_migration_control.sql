CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.migration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'testing', 'ready', 'running', 'paused', 'completed', 'failed', 'cancelled', 'rolled_back')),
  source_supabase_url TEXT,
  target_supabase_url TEXT,
  target_minio_endpoint TEXT,
  selected_schemas TEXT[] NOT NULL DEFAULT ARRAY['public', 'auth'],
  selected_buckets TEXT[] NOT NULL DEFAULT ARRAY['whatsapp-media', 'imobzyimg', 'imobzymsg', 'documents', 'exports'],
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  dry_run_approved BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.migration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.migration_jobs(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('source', 'target', 'minio')),
  encrypted_payload TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, scope)
);

CREATE TABLE IF NOT EXISTS public.migration_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.migration_jobs(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped', 'cancelled')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.migration_logs (
  id BIGSERIAL PRIMARY KEY,
  job_id UUID REFERENCES public.migration_jobs(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
  step TEXT,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.migration_errors (
  id BIGSERIAL PRIMARY KEY,
  job_id UUID REFERENCES public.migration_jobs(id) ON DELETE CASCADE,
  step TEXT,
  entity_type TEXT,
  entity_name TEXT,
  error_message TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.migration_file_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.migration_jobs(id) ON DELETE CASCADE,
  old_url TEXT,
  new_url TEXT,
  bucket TEXT,
  path TEXT,
  size BIGINT,
  content_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.migration_table_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.migration_jobs(id) ON DELETE CASCADE,
  schema_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  source_count BIGINT,
  target_count BIGINT,
  migrated_count BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.migration_config_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.migration_jobs(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('before_activation', 'after_activation')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS migration_jobs_status_idx ON public.migration_jobs(status);
CREATE UNIQUE INDEX IF NOT EXISTS migration_steps_job_step_idx ON public.migration_steps(job_id, step);
CREATE INDEX IF NOT EXISTS migration_logs_job_created_idx ON public.migration_logs(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS migration_errors_job_created_idx ON public.migration_errors(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS migration_file_map_job_status_idx ON public.migration_file_map(job_id, status);
CREATE INDEX IF NOT EXISTS migration_table_map_job_status_idx ON public.migration_table_map(job_id, status);

ALTER TABLE public.migration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_file_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_table_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_config_snapshots ENABLE ROW LEVEL SECURITY;
