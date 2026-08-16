-- Add AI analysis columns to system_contracts
ALTER TABLE public.system_contracts
  ADD COLUMN IF NOT EXISTS analysis_result JSONB,
  ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS analyzed_by UUID REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_system_contracts_analyzed_at ON public.system_contracts(analyzed_at);
