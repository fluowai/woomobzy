-- ============================================================
-- Migration: Lease Portals Evolution
-- Tabelas para Portal do Inquilino e Portal do Proprietário
-- ============================================================

-- 1. LEASE TICKETS (Chamados de manutenção)
CREATE TABLE IF NOT EXISTS lease_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_analise', 'aguardando_orcamento', 'em_execucao', 'resolvido', 'cancelado')),
  priority TEXT DEFAULT 'baixa' CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
  category TEXT DEFAULT 'manutencao' CHECK (category IN ('manutencao', 'financeiro', 'duvida', 'outro')),
  photos_urls TEXT[] DEFAULT '{}',
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- 2. LEASE STATEMENTS (Extratos de Repasse do Proprietário)
CREATE TABLE IF NOT EXISTS lease_statements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  reference_month DATE NOT NULL,
  
  -- Entradas
  total_received NUMERIC(12,2) DEFAULT 0,
  rent_received NUMERIC(12,2) DEFAULT 0,
  
  -- Saídas (Descontos)
  administration_fee NUMERIC(12,2) DEFAULT 0,
  iptu_deduction NUMERIC(12,2) DEFAULT 0,
  condominium_deduction NUMERIC(12,2) DEFAULT 0,
  irrf_deduction NUMERIC(12,2) DEFAULT 0,
  other_deductions NUMERIC(12,2) DEFAULT 0,
  
  -- Resultado
  net_transfer_amount NUMERIC(12,2) NOT NULL,
  
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'agendado', 'pago', 'cancelado')),
  transfer_date DATE,
  receipt_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. LEASE GUARANTEES (Gestão de Garantias)
CREATE TABLE IF NOT EXISTS lease_guarantees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL CHECK (type IN ('seguro_fianca', 'deposito_caucao', 'titulo_capitalizacao', 'fiador')),
  provider_name TEXT,
  policy_number TEXT,
  amount NUMERIC(12,2),
  
  valid_from DATE,
  valid_until DATE,
  
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'vencido', 'acionado', 'encerrado')),
  document_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices e RLS
CREATE INDEX IF NOT EXISTS idx_lease_tickets_lease ON lease_tickets(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_statements_lease ON lease_statements(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_guarantees_lease ON lease_guarantees(lease_id);

ALTER TABLE lease_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_guarantees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation lease_tickets" ON lease_tickets
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation lease_statements" ON lease_statements
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation lease_guarantees" ON lease_guarantees
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Triggers de Updated At
CREATE TRIGGER trg_lease_tickets_updated_at BEFORE UPDATE ON lease_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_lease_statements_updated_at BEFORE UPDATE ON lease_statements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_lease_guarantees_updated_at BEFORE UPDATE ON lease_guarantees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
