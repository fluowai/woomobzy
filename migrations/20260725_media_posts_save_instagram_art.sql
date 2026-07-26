-- media_posts: persists generated Instagram post images.
-- Each row links a property to a saved image in Supabase Storage.

CREATE TABLE IF NOT EXISTS public.media_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  template TEXT NOT NULL DEFAULT 'padrao',
  format TEXT NOT NULL DEFAULT '1080x1080',
  image_index INTEGER NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  caption TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT media_posts_template_check
    CHECK (template IN ('padrao', 'luxo', 'rural', 'moderno')),
  CONSTRAINT media_posts_format_check
    CHECK (format IN ('1080x1080', '1080x1350')),
  CONSTRAINT media_posts_status_check
    CHECK (status IN ('draft', 'scheduled', 'posted', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_media_posts_company_id
  ON public.media_posts(company_id);
CREATE INDEX IF NOT EXISTS idx_media_posts_property_id
  ON public.media_posts(property_id);
CREATE INDEX IF NOT EXISTS idx_media_posts_company_property
  ON public.media_posts(company_id, property_id, created_at DESC);

-- RLS
ALTER TABLE public.media_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on media_posts" ON public.media_posts;
CREATE POLICY "Service role full access on media_posts"
  ON public.media_posts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation media_posts" ON public.media_posts;
CREATE POLICY "Tenant isolation media_posts"
  ON public.media_posts
  FOR ALL
  USING (
    company_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

-- Storage bucket for generated media posts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media-posts',
  'media-posts',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;
