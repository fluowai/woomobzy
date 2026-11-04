-- Indexes for reseller/whitelabel architecture
CREATE INDEX IF NOT EXISTS idx_organizations_parent_id ON organizations(parent_id);
CREATE INDEX IF NOT EXISTS idx_organizations_is_reseller ON organizations(is_reseller);
