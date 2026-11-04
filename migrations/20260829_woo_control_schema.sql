-- ========================================================================================
-- WOO CONTROL - COMPREHENSIVE SCHEMA MIGRATION
-- Adds hierarchy to organizations, new RBAC roles, Products, Licenses, Snapshots, 
-- Deployments, Releases, and Global Audit.
-- ========================================================================================

-- 1. EXTEND ORGANIZATIONS (Phase 2)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'CUSTOMER' CHECK (type IN ('PLATFORM', 'MASTER_RESELLER', 'RESELLER', 'CUSTOMER'));

-- 2. EXTEND PROFILES ROLES (Phase 3)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN (
    'PLATFORM_OWNER', 'PLATFORM_ADMIN', 'MASTER_RESELLER_ADMIN', 
    'RESELLER_ADMIN', 'SUPPORT_MANAGER', 'SUPPORT_AGENT', 
    'FINANCE_ADMIN', 'DEPLOYMENT_MANAGER', 'CUSTOMER_ADMIN', 'CUSTOMER_USER',
    -- Legacy support:
    'superadmin', 'admin', 'gerente', 'broker', 'assistente', 'user'
  ));

-- Create granular permissions approach (Roles/Permissions) mapping could be done at API level,
-- but we ensure the DB allows the new roles.

-- 3. PRODUCTS
CREATE TABLE IF NOT EXISTS woo_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DEPRECATED', 'ARCHIVED')),
    current_version TEXT,
    stable_version TEXT,
    minimum_supported_version TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. LICENSES
CREATE TABLE IF NOT EXISTS woo_licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_id TEXT UNIQUE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES woo_products(id) ON DELETE RESTRICT,
    plan TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('TRIAL', 'ACTIVE', 'EXPIRING', 'GRACE', 'SUSPENDED', 'REVOKED', 'TRANSFER_PENDING')),
    allowed_domains TEXT[] DEFAULT '{}',
    max_instances INTEGER DEFAULT 1,
    features JSONB DEFAULT '{}'::jsonb,
    version TEXT,
    minimum_version TEXT,
    issued_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ,
    grace_until TIMESTAMPTZ,
    lease_until TIMESTAMPTZ,
    signature TEXT, -- Signed payload
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. DEPLOYMENTS (Instances)
CREATE TABLE IF NOT EXISTS woo_deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id TEXT UNIQUE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES woo_products(id) ON DELETE RESTRICT,
    license_id UUID REFERENCES woo_licenses(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'OFFLINE' CHECK (status IN ('ONLINE', 'DEGRADED', 'OFFLINE', 'SUSPENDED', 'UPDATE_REQUIRED', 'DEACTIVATED')),
    domain TEXT,
    version TEXT,
    release_channel TEXT DEFAULT 'STABLE',
    last_heartbeat TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. RELEASES
CREATE TABLE IF NOT EXISTS woo_releases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES woo_products(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    channel TEXT DEFAULT 'STABLE' CHECK (channel IN ('INTERNAL', 'EARLY_ACCESS', 'BETA', 'STABLE')),
    release_notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb, -- e.g., container hashes
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. SNAPSHOTS
CREATE TABLE IF NOT EXISTS woo_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_id TEXT UNIQUE NOT NULL,
    license_id UUID REFERENCES woo_licenses(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES woo_products(id) ON DELETE RESTRICT,
    version TEXT NOT NULL,
    build_id TEXT,
    source_entitlement TEXT,
    hash TEXT,
    status TEXT DEFAULT 'GENERATED' CHECK (status IN ('GENERATED', 'REVOKED')),
    generated_at TIMESTAMPTZ DEFAULT now(),
    downloaded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. ACADEMY (Simplified core)
CREATE TABLE IF NOT EXISTS woo_academy_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    status TEXT DEFAULT 'PUBLISHED',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS woo_academy_certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES woo_academy_courses(id) ON DELETE CASCADE,
    certification_name TEXT NOT NULL,
    issued_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ
);

-- 9. AUDIT LOGS (Global Control Plane Audit)
CREATE TABLE IF NOT EXISTS woo_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target TEXT, -- e.g., 'LICENSE-A123'
    metadata JSONB DEFAULT '{}'::jsonb,
    request_id TEXT,
    ip_address TEXT,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- 10. SUPPORT SESSIONS
CREATE TABLE IF NOT EXISTS woo_support_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    target_organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    target_role TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ENDED', 'EXPIRED')),
    started_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ
);

-- Enable RLS on new tables
ALTER TABLE woo_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE woo_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE woo_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE woo_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE woo_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE woo_academy_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE woo_academy_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE woo_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE woo_support_sessions ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (PLATFORM_OWNER has full access, others restricted by organization)
CREATE OR REPLACE FUNCTION is_platform_admin(user_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role IN ('PLATFORM_OWNER', 'PLATFORM_ADMIN', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Products: Everyone can read active products. Platform admins can manage.
CREATE POLICY "Products are viewable by everyone" ON woo_products FOR SELECT USING (status = 'ACTIVE' OR is_platform_admin(auth.uid()));
CREATE POLICY "Products are managed by platform admins" ON woo_products USING (is_platform_admin(auth.uid()));

-- Licenses: Viewable by the organization or Platform Admin
CREATE POLICY "Licenses viewable by org or platform admin" ON woo_licenses FOR SELECT USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) OR is_platform_admin(auth.uid()));
CREATE POLICY "Licenses manageable by platform admin" ON woo_licenses USING (is_platform_admin(auth.uid()));

-- Deployments: Viewable by org or Platform Admin
CREATE POLICY "Deployments viewable by org or platform admin" ON woo_deployments FOR SELECT USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) OR is_platform_admin(auth.uid()));
CREATE POLICY "Deployments manageable by platform admin" ON woo_deployments USING (is_platform_admin(auth.uid()));

-- Snapshots: Viewable by org or Platform Admin
CREATE POLICY "Snapshots viewable by org or platform admin" ON woo_snapshots FOR SELECT USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) OR is_platform_admin(auth.uid()));
CREATE POLICY "Snapshots manageable by platform admin" ON woo_snapshots USING (is_platform_admin(auth.uid()));

-- Audit Logs: Viewable by Platform Admin. Organization can view their own.
CREATE POLICY "Audit logs viewable by org or platform admin" ON woo_audit_logs FOR SELECT USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) OR is_platform_admin(auth.uid()));
CREATE POLICY "Audit logs insertable by application" ON woo_audit_logs FOR INSERT WITH CHECK (true);
