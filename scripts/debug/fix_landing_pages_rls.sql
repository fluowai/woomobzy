-- Fix RLS policies for landing_pages table
-- This allows authenticated users to create and manage their own landing pages

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own landing pages" ON landing_pages;
DROP POLICY IF EXISTS "Users can create their own landing pages" ON landing_pages;
DROP POLICY IF EXISTS "Users can update their own landing pages" ON landing_pages;
DROP POLICY IF EXISTS "Users can delete their own landing pages" ON landing_pages;

-- Enable RLS on the table
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;

-- Create new policies
-- Allow authenticated users to view their own landing pages
CREATE POLICY "Users can view their own landing pages"
ON landing_pages
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow authenticated users to create landing pages
CREATE POLICY "Users can create their own landing pages"
ON landing_pages
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to update their own landing pages
CREATE POLICY "Users can update their own landing pages"
ON landing_pages
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to delete their own landing pages
CREATE POLICY "Users can delete their own landing pages"
ON landing_pages
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Grant access to authenticated users
GRANT ALL ON landing_pages TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
