CREATE TABLE document_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- Tenants can manage their own templates
CREATE POLICY "Enable ALL for users based on tenant_id" ON document_templates
AS PERMISSIVE FOR ALL
TO authenticated
USING (tenant_id = (SELECT public.get_auth_tenant_id()));

-- Add index
CREATE INDEX idx_document_templates_tenant_type ON document_templates(tenant_id, type);
