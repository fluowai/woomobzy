-- Create a table for leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  status TEXT DEFAULT 'Novo', -- Novo, Em Atendimento, Visita, Proposta, Fechado, Perdido
  source TEXT DEFAULT 'Site',
  property_id UUID REFERENCES properties(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow public to insert (for lead capture form)
CREATE POLICY "Allow public insert to leads"
ON leads FOR INSERT
TO public
WITH CHECK (true);

-- Allow authenticated (admins) to do everything
CREATE POLICY "Allow authenticated full access to leads"
ON leads FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
