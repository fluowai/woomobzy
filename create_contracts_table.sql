-- Create contracts table
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    title TEXT NOT NULL,
    type TEXT NOT NULL, -- Venda, Arrendamento, etc
    property_id UUID REFERENCES properties(id),
    lead_id UUID REFERENCES leads(id),
    status TEXT DEFAULT 'Draft', -- Draft, Pending, Active, Archived
    value NUMERIC(15, 2),
    template_id TEXT,
    content TEXT, -- The generated content
    metadata JSONB DEFAULT '{}', -- Store placeholders or extra info
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for contracts (assuming organizations is the main tenant unit)
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members to see their org contracts" ON contracts
FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Allow members to insert org contracts" ON contracts
FOR INSERT WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Allow members to update org contracts" ON contracts
FOR UPDATE USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
));
