ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS agency_name TEXT,
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#064e3b',
  ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#d4af37',
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS header_color TEXT,
  ADD COLUMN IF NOT EXISTS footer_text TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_whatsapp_template TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS tracking_pixels JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS layout_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS integrations JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE public.site_settings
SET social_links = COALESCE(social_links, '{}'::jsonb)
  || jsonb_strip_nulls(
    jsonb_build_object(
      'facebook', facebook_url,
      'instagram', instagram_url,
      'whatsapp', whatsapp_url,
      'youtube', youtube_url,
      'linkedin', linkedin_url
    )
  );

NOTIFY pgrst, 'reload schema';
