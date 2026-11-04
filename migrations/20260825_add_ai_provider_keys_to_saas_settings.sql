-- Migration: Add AI provider keys to saas_settings
-- Adds columns for OpenAI, Anthropic, Groq, and OpenRouter API keys
-- These are stored globally and used by the LLM Orchestrator

DO $$
BEGIN
  -- Add global_openai_key column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saas_settings' AND column_name = 'global_openai_key') THEN
    ALTER TABLE public.saas_settings ADD COLUMN global_openai_key TEXT;
  END IF;

  -- Add global_anthropic_key column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saas_settings' AND column_name = 'global_anthropic_key') THEN
    ALTER TABLE public.saas_settings ADD COLUMN global_anthropic_key TEXT;
  END IF;

  -- Add global_groq_key column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saas_settings' AND column_name = 'global_groq_key') THEN
    ALTER TABLE public.saas_settings ADD COLUMN global_groq_key TEXT;
  END IF;

  -- Add global_openrouter_key column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saas_settings' AND column_name = 'global_openrouter_key') THEN
    ALTER TABLE public.saas_settings ADD COLUMN global_openrouter_key TEXT;
  END IF;

  NOTIFY pgrst, 'reload schema';
END $$;