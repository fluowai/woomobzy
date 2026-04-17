
-- ⚠️ MIGRATION TO SINGLE TENANT (FIX) ⚠️
-- This script CREATES the missing organization table and links everything to it.

BEGIN;

-- 1. Create Organizations Table (if missing)
CREATE TABLE IF NOT EXISTS organizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    subdomain text, -- Legacy but useful for finding
    created_at timestamptz DEFAULT now()
);

-- 2. Insert the Single Main Organization
-- We use ON CONFLICT to avoid errors if it was partially created somehow, though strict ID usage is better.
-- But since we don't have a fixed ID, we check existence.
DO $$
DECLARE
    new_org_id uuid;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM organizations) THEN
        INSERT INTO organizations (name, subdomain) VALUES ('Imobisaas Agency', 'admin') RETURNING id INTO new_org_id;
    ELSE
        SELECT id INTO new_org_id FROM organizations LIMIT 1;
    END IF;

    -- 3. Ensure columns exist in other tables
    -- (The user didn't mention these errors, but let's be safe)
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
    ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
    ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

    -- 4. Link ALL Data to this new Organization
    UPDATE profiles SET organization_id = new_org_id WHERE organization_id IS NULL;
    UPDATE properties SET organization_id = new_org_id WHERE organization_id IS NULL;
    UPDATE leads SET organization_id = new_org_id WHERE organization_id IS NULL;
    UPDATE landing_pages SET organization_id = new_org_id WHERE organization_id IS NULL;
    
    -- Link Site Settings (There should be only 1 row typically in a single tenant setup)
    UPDATE site_settings SET organization_id = new_org_id WHERE organization_id IS NULL;

END $$;

-- 5. Enable Access
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for all users" ON organizations;
CREATE POLICY "Enable all access for all users" ON organizations FOR ALL USING (true);

-- 6. Cleanup broken references (Plans/Subscriptions)
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;

COMMIT;
