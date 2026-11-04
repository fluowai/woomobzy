-- Migration: Add Gemini API key to saas_settings
-- This ensures the Agent Architect service has a valid Gemini key
-- Update the key with a real Gemini API key before production deployment

DO $$
BEGIN
  -- Try to update existing row, or insert if not exists
  UPDATE public.saas_settings
  SET global_gemini_key = 'AIzaSyValidGeminiKeyHereReplaceWithRealKey'
  WHERE id = (SELECT id FROM public.saas_settings LIMIT 1);

  -- If no row exists, insert one
  IF NOT FOUND THEN
    INSERT INTO public.saas_settings (id, global_gemini_key)
    VALUES ('00000000-0000-0000-0000-000000000000', 'AIzaSyValidGeminiKeyHereReplaceWithRealKey');
  END IF;

  NOTIFY pgrst, 'reload schema';
END $$;