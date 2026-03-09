-- Create a table for site settings (Single Tenancy for now, but extensible)
-- Since it's single install, we might just have one row, but let's use a singleton pattern or just ID 1.

CREATE TABLE IF NOT EXISTS site_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_name TEXT NOT NULL DEFAULT 'Minha Imobiliária',
  primary_color TEXT DEFAULT '#4F46E5', -- Indigo 600
  secondary_color TEXT DEFAULT '#1E293B', -- Slate 800
  logo_url TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  whatsapp_number TEXT,
  footer_text TEXT,
  template_id TEXT DEFAULT 'modern',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Policy to allow public read (for the landing page)
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to settings"
ON site_settings FOR SELECT
TO public
USING (true);

-- Policy to allow authenticated update (for the admin panel)
-- For now, allowing all interactions if we don't have auth fully set up, 
-- BUT robust way is to restrict to authenticated users.
CREATE POLICY "Allow authenticated update to settings"
ON site_settings FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create a table for properties
CREATE TABLE IF NOT EXISTS properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  type TEXT, -- Apartment, House, etc.
  status TEXT DEFAULT 'Disponível', -- Available, Sold, etc.
  
  -- Address fields
  city TEXT,
  neighborhood TEXT,
  state TEXT,
  address TEXT,
  
  -- Features JSONB for flexibility (bedrooms, bathrooms, area, etc)
  features JSONB DEFAULT '{}'::jsonb,
  
  -- Images array
  images TEXT[] DEFAULT '{}',
  
  highlighted BOOLEAN DEFAULT false,
  
  -- Extended fields
  owner_info JSONB,
  analysis JSONB,
  purpose TEXT,
  aptitude TEXT[],
  broker_id TEXT,
  organization_id TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Storage Bucket for Images
-- Note: You entered this via SQL Editor, but you also need to create the bucket 'images' in the Storage menu manually in Supabase dashboard usually, 
-- or use an extension. For simplicity, we assume the user will create a public bucket named 'property-images' and 'agency-assets'.

-- Insert default settings row if not exists
INSERT INTO site_settings (agency_name)
SELECT 'Minha Imobiliária'
WHERE NOT EXISTS (SELECT 1 FROM site_settings);
