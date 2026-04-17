-- Adicionando colunas ausentes na tabela 'landing_pages'
ALTER TABLE public.landing_pages 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS meta_keywords TEXT[],
ADD COLUMN IF NOT EXISTS og_image TEXT,
ADD COLUMN IF NOT EXISTS template_id TEXT,
ADD COLUMN IF NOT EXISTS theme_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS blocks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS property_selection JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS form_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS leads_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS custom_css TEXT,
ADD COLUMN IF NOT EXISTS custom_js TEXT,
ADD COLUMN IF NOT EXISTS custom_head TEXT;

-- Tenta recarregar o cache do schema REST no Supabase
NOTIFY pgrst, 'reload schema';
