-- ============================================
-- WhatsApp Cloud API + Connection Billing
-- Migration: 20260826_whatsapp_cloud_api_billing.sql
-- ============================================

-- 1. Credenciais Cloud API por instância
CREATE TABLE IF NOT EXISTS whatsapp_cloud_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    phone_number_id TEXT NOT NULL,
    business_account_id TEXT NOT NULL,
    app_id TEXT NOT NULL,
    app_secret_encrypted TEXT NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    api_version TEXT DEFAULT 'v21.0',
    webhook_verify_token TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(instance_id)
);

CREATE INDEX IF NOT EXISTS idx_wcc_tenant ON whatsapp_cloud_credentials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wcc_phone ON whatsapp_cloud_credentials(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_wcc_app ON whatsapp_cloud_credentials(app_id);

-- 2. Pool de conexões (compras do mega admin)
CREATE TABLE IF NOT EXISTS connection_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_purchased INT NOT NULL DEFAULT 0,
    total_cost_brl DECIMAL(10,2) DEFAULT 0,
    provider TEXT DEFAULT 'meta_cloud_api',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Alocações de conexões (hierarquia: mega -> reseller -> tenant)
CREATE TABLE IF NOT EXISTS connection_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_org_id UUID NOT NULL REFERENCES organizations(id),
    to_org_id UUID NOT NULL REFERENCES organizations(id),
    instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE SET NULL,
    allocation_type TEXT NOT NULL CHECK (allocation_type IN ('reseller_pool', 'tenant_active')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'pending')),
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ca_from ON connection_allocations(from_org_id);
CREATE INDEX IF NOT EXISTS idx_ca_to ON connection_allocations(to_org_id);
CREATE INDEX IF NOT EXISTS idx_ca_instance ON connection_allocations(instance_id);
CREATE INDEX IF NOT EXISTS idx_ca_status ON connection_allocations(status);

-- 4. Billing de conexões (transações financeiras)
CREATE TABLE IF NOT EXISTS connection_billing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_org_id UUID NOT NULL REFERENCES organizations(id),
    buyer_org_id UUID NOT NULL REFERENCES organizations(id),
    connections_count INT NOT NULL,
    price_per_connection DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    billing_period TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    payment_method TEXT,
    asgardpay_invoice_id TEXT,
    asgardpay_payment_url TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cb_seller ON connection_billing(seller_org_id);
CREATE INDEX IF NOT EXISTS idx_cb_buyer ON connection_billing(buyer_org_id);
CREATE INDEX IF NOT EXISTS idx_cb_status ON connection_billing(status);
CREATE INDEX IF NOT EXISTS idx_cb_invoice ON connection_billing(asgardpay_invoice_id);

-- 5. Campos na organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS connection_credits INT DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS connection_price_per_unit DECIMAL(10,2) DEFAULT 0;

-- 6. Garantir coluna provider em whatsapp_instances
ALTER TABLE whatsapp_instances ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'whatsmeow';

-- 7. RLS — todas as tabelas com service role full access (padrão do projeto)
ALTER TABLE whatsapp_cloud_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on cloud credentials" ON whatsapp_cloud_credentials
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on connection pool" ON connection_pool
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on connection allocations" ON connection_allocations
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on connection billing" ON connection_billing
    FOR ALL USING (true) WITH CHECK (true);

-- 8. Trigger updated_at
CREATE TRIGGER update_whatsapp_cloud_credentials_updated_at
    BEFORE UPDATE ON whatsapp_cloud_credentials
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_connection_pool_updated_at
    BEFORE UPDATE ON connection_pool
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_connection_billing_updated_at
    BEFORE UPDATE ON connection_billing
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
