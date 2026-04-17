-- RPC to get BI Dashboard stats
CREATE OR REPLACE FUNCTION get_bi_stats(org_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_value', COALESCE(SUM(price), 0),
        'total_area_ha', COALESCE(SUM(area_total_ha), 0),
        'property_count', COUNT(*),
        'avg_ha_price', CASE WHEN SUM(area_total_ha) > 0 THEN SUM(price) / SUM(area_total_ha) ELSE 0 END
    ) INTO result
    FROM properties
    WHERE organization_id = org_id AND status != 'Pendente';
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Table for Leads (if not exists, based on previous conversation history it seems to be in flux)
-- Adding a simple version if missing to support BI Source Origin
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    source TEXT DEFAULT 'Direto', -- WhatsApp, Instagram, Portal, Indicação
    status TEXT DEFAULT 'Novo',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RPC to get Lead source distribution
CREATE OR REPLACE FUNCTION get_bi_lead_sources(org_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(json_build_object('name', source, 'value', count)) INTO result
    FROM (
        SELECT source, COUNT(*) as count
        FROM leads
        WHERE organization_id = org_id
        GROUP BY source
    ) s;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
