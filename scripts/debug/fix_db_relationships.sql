
-- 1. Ensure Plans Table Exists
CREATE TABLE IF NOT EXISTS plans (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  price decimal(10,2) not null,
  currency text default 'BRL',
  limits jsonb default '{}',
  features jsonb default '[]',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 2. Ensure Organization.plan_id column exists
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_id uuid;

-- 3. Explicitly Re-create the Foreign Key Constraint
-- (First drop to avoid duplicates/errors)
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_id_fkey;

ALTER TABLE organizations
    ADD CONSTRAINT organizations_plan_id_fkey
    FOREIGN KEY (plan_id)
    REFERENCES plans(id);

-- 4. Fix Permissions (RLS)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Allow Authenticated users to read plans (needed for dashboard display)
DROP POLICY IF EXISTS "Authenticated read plans" ON plans;
CREATE POLICY "Authenticated read plans"
  ON plans FOR SELECT
  TO authenticated
  USING (true);

-- Allow Superadmins full control
DROP POLICY IF EXISTS "Superadmin manage plans" ON plans;
CREATE POLICY "Superadmin manage plans"
  ON plans FOR ALL
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' );

-- 5. Force Schema Cache Reload (by notifying PostgREST)
NOTIFY pgrst, 'reload config';
