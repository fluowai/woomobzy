
-- 1. Ensure RLS is CONSISTENT
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- 2. Force Superadmin Role (Case insensitve check)
UPDATE profiles 
SET role = 'superadmin' 
WHERE email ILIKE 'fluowai@gmail.com';

-- 3. Re-apply Policies (Drop first to avoid errors)
DROP POLICY IF EXISTS "Superadmin view all organizations" ON organizations;
DROP POLICY IF EXISTS "Superadmin update all organizations" ON organizations;
DROP POLICY IF EXISTS "Superadmin manage plans" ON plans;

-- 4. Create Policies
CREATE POLICY "Superadmin view all organizations"
  ON organizations FOR SELECT
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' );

CREATE POLICY "Superadmin update all organizations"
  ON organizations FOR UPDATE
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' );

CREATE POLICY "Superadmin manage plans"
  ON plans FOR ALL
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' );

-- 5. Verification (Will appear in output messages)
DO $$
DECLARE
    user_role text;
    org_count int;
BEGIN
    SELECT role INTO user_role FROM profiles WHERE email = 'fluowai@gmail.com';
    SELECT count(*) INTO org_count FROM organizations;
    RAISE NOTICE 'User Role is: %', user_role;
    RAISE NOTICE 'Total Organizations in DB: %', org_count;
END $$;
