-- ============================================
-- Migration: Add property/development selection to sites and landing pages
-- Adds visibility controls for properties and developments on sites
-- ============================================

-- 1. Add property_selection and development_selection to sites
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS property_selection JSONB DEFAULT '{"mode":"all","propertyIds":[],"filters":{},"sortBy":"price","sortOrder":"desc","limit":20}'::jsonb,
  ADD COLUMN IF NOT EXISTS development_selection JSONB DEFAULT '{"mode":"all","developmentIds":[],"filters":{},"sortBy":"date","sortOrder":"desc","limit":20}'::jsonb;

-- 2. Add development_selection to landing_pages (property_selection already exists)
ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS development_selection JSONB DEFAULT '{"mode":"all","developmentIds":[],"filters":{},"sortBy":"date","sortOrder":"desc","limit":12}'::jsonb;

-- 3. Add show_on_site flag to properties (individual visibility override)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS show_on_site BOOLEAN DEFAULT true;

-- 4. Add show_on_site flag to developments (individual visibility override)
ALTER TABLE public.developments
  ADD COLUMN IF NOT EXISTS show_on_site BOOLEAN DEFAULT true;

-- 5. Indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_properties_show_on_site ON public.properties(show_on_site);
CREATE INDEX IF NOT EXISTS idx_developments_show_on_site ON public.developments(show_on_site);

-- 6. Helper view: properties visible on site per organization
CREATE OR REPLACE VIEW public.site_visible_properties AS
SELECT p.*
FROM public.properties p
WHERE p.show_on_site = true
  AND (p.status = 'Disponível' OR p.status IS NULL);

-- 7. Helper view: developments visible on site per organization
CREATE OR REPLACE VIEW public.site_visible_developments AS
SELECT d.*
FROM public.developments d
WHERE d.show_on_site = true;

-- Allow anon to read the helper views
GRANT SELECT ON public.site_visible_properties TO anon, authenticated;
GRANT SELECT ON public.site_visible_developments TO anon, authenticated;
