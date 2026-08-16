-- Create global_templates table for system-wide template management
-- Run this migration in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS global_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('landing_page', 'email', 'contract', 'report')),
  category TEXT NOT NULL DEFAULT 'Geral',
  description TEXT DEFAULT '',
  preview TEXT DEFAULT '📄',
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_global_templates_org ON global_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_global_templates_type ON global_templates(type);
CREATE INDEX IF NOT EXISTS idx_global_templates_category ON global_templates(category);

-- RLS policies
ALTER TABLE global_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage global templates"
  ON global_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
        AND profiles.organization_id = global_templates.organization_id
    )
  );

CREATE POLICY "Authenticated users can read global templates"
  ON global_templates
  FOR SELECT
  USING (auth.role() = 'authenticated');
