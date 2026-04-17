-- Fix RLS policies for leads table to allow contact form submissions

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public insert to leads" ON leads;
DROP POLICY IF EXISTS "Allow authenticated full access to leads" ON leads;
DROP POLICY IF EXISTS "Enable insert for anon users" ON leads;

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert leads (for contact form)
CREATE POLICY "Enable insert for anon users"
ON leads FOR INSERT
TO anon
WITH CHECK (true);

-- Allow service role full access
CREATE POLICY "Enable all for service role"
ON leads FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users (admins) full access
CREATE POLICY "Enable all for authenticated users"
ON leads FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
