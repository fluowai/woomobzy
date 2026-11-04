-- ============================================================
-- IMOBZY Multi-Panel Architecture — Database Migration v2.0
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add niche column to organizations (if not exists)
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS niche TEXT DEFAULT 'traditional';

-- 2. Add feature_flags column for plan-based feature toggling
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}'::jsonb;

-- 3. Expand RBAC roles (add 'gerente' and 'assistente')
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('superadmin', 'admin', 'gerente', 'broker', 'assistente', 'user'));

-- 4. Create audit_log table for global change tracking
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create developments table (Urban Empreendimentos)
CREATE TABLE IF NOT EXISTS developments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  total_units INT DEFAULT 0,
  available_units INT DEFAULT 0,
  status TEXT DEFAULT 'em_obras' CHECK (status IN ('em_obras', 'lancamento', 'pronto', 'esgotado')),
  progress_pct INT DEFAULT 0,
  price_table JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create rental_contracts table (Urban Locação)
CREATE TABLE IF NOT EXISTS rental_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  tenant_name TEXT NOT NULL,
  tenant_email TEXT,
  tenant_phone TEXT,
  start_date DATE,
  end_date DATE,
  monthly_rent NUMERIC(12,2),
  adjustment_index TEXT DEFAULT 'IGPM',
  payment_status TEXT DEFAULT 'em_dia' CHECK (payment_status IN ('em_dia', 'atrasado', 'inadimplente')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Enable RLS on new tables
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE developments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenant isolation audit_log" ON audit_log
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation developments" ON developments
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation rental_contracts" ON rental_contracts
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Done!
SELECT 'Migration v2.0 completed successfully!' AS result;
