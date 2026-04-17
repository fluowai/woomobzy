
-- 0. Fix Missing Column (Safe to run multiple times)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

-- 1. Create Organization if not exists
INSERT INTO organizations (name, status, owner_email, plan_id)
SELECT 'Imobiliaria Fazendas Brasil', 'active', 'contato@fazendasbrasil.com.br', (SELECT id FROM plans WHERE name = 'Enterprise')
WHERE NOT EXISTS (
    SELECT 1 FROM organizations WHERE owner_email = 'contato@fazendasbrasil.com.br'
);

-- 2. Get the Organization ID
DO $$
DECLARE
    org_id uuid;
    user_id uuid;
BEGIN
    SELECT id INTO org_id FROM organizations WHERE owner_email = 'contato@fazendasbrasil.com.br';
    
    -- 3. Find the user ID
    SELECT id INTO user_id FROM auth.users WHERE email = 'contato@fazendasbrasil.com.br';

    IF org_id IS NOT NULL AND user_id IS NOT NULL THEN
        -- 4. Update Profile with Organization ID and Role
        UPDATE profiles 
        SET organization_id = org_id,
            role = 'admin' -- Make him admin of his org
        WHERE id = user_id;

        -- 5. Link ALL existing properties to this new Organization
        -- (Assuming valid legacy data belongs to this main user)
        -- WARNING: This updates ALL properties that have NULL organization_id
        UPDATE properties 
        SET organization_id = org_id 
        WHERE organization_id IS NULL;
        
        -- Link Leads as well
        UPDATE leads 
        SET organization_id = org_id 
        WHERE organization_id IS NULL;

        -- Link Landing Pages
        UPDATE landing_pages 
        SET organization_id = org_id 
        WHERE organization_id IS NULL;

        RAISE NOTICE 'Migration successful for Fazendas Brasil';
    ELSE
        RAISE NOTICE 'User or Organization not found. Org: %, User: %', org_id, user_id;
    END IF;
END $$;
