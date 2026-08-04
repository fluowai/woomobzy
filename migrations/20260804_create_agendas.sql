-- Multi-agenda: agendas de visitas a imoveis vinculadas a corretores
-- Cada agenda pertence a uma organizacao e pode ser vinculada a um corretor especifico.
CREATE TABLE IF NOT EXISTS agendas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  broker_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  kind TEXT NOT NULL DEFAULT 'visitas', -- 'visitas', 'reunioes', 'retornos', 'outros'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Vincula agendamentos a uma agenda e/ou a um imovel (visita a imovel)
ALTER TABLE lead_appointments
  ADD COLUMN IF NOT EXISTS agenda_id UUID REFERENCES agendas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agendas_org_broker ON agendas(organization_id, broker_id);
CREATE INDEX IF NOT EXISTS idx_lead_appointments_agenda ON lead_appointments(agenda_id);
CREATE INDEX IF NOT EXISTS idx_lead_appointments_property ON lead_appointments(property_id);

-- RLS
ALTER TABLE agendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization agendas"
  ON agendas FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert agendas to their organization"
  ON agendas FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their organization agendas"
  ON agendas FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their organization agendas"
  ON agendas FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );
