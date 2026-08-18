-- ============================================
-- SAAS WHITELABEL B2B2B EVOLUTION
-- ============================================

-- 1. Add fields to Organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_reseller BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES organizations(id);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS platform_domain TEXT UNIQUE;

-- 2. Add fields to Site Settings
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS smtp_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS onboarding_config JSONB DEFAULT '{}'::jsonb;

-- 3. Update RLS on Organizations (Example: Reseller can see their sub-organizations)
-- This assumes RLS is enabled on organizations. 
-- We'll add a policy so that if user is in an organization that is a reseller, they can see organizations where parent_id = their_organization_id
-- We need to check if there is an existing policy. For safety, we just CREATE POLICY, which might fail if it already exists, so we use a DO block.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'Reseller can see sub-organizations'
    ) THEN
        CREATE POLICY "Reseller can see sub-organizations"
        ON organizations
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM profiles p 
                JOIN organizations o ON p.organization_id = o.id 
                WHERE p.id = auth.uid() AND o.is_reseller = true AND organizations.parent_id = o.id
            )
        );
    END IF;
END $$;
