-- ============================================================
-- Migration: Lease Management Complete Module
-- Novo módulo de Gestão de Locação do ImobFluow
-- Base: Lei 8.245/91 (Lei do Inquilinato)
-- ============================================================

-- 0. Helper functions
CREATE OR REPLACE FUNCTION generate_contract_number(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(contract_number, '-', 1) AS INTEGER)), 0) + 1
  INTO seq
  FROM leases
  WHERE organization_id = org_id;
  RETURN LPAD(seq::TEXT, 5, '0') || '-' || TO_CHAR(NOW(), 'YYYY');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. LEASES (contrato de locação) — tabela principal
-- ============================================================
CREATE TABLE IF NOT EXISTS leases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  contract_number TEXT,

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft','cadastral_analysis','income_analysis',
      'pending_signatures','active','suspended','terminated','expired','archived'
    )),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  signed_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,

  -- Relacionamentos
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Locatário principal (PF ou PJ)
  tenant_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  tenant_name TEXT,
  tenant_email TEXT,
  tenant_phone TEXT,
  tenant_cpf TEXT,
  tenant_rg TEXT,
  tenant_type TEXT CHECK (tenant_type IN ('PF', 'PJ')),
  tenant_birth_date DATE,
  tenant_marital_status TEXT,
  tenant_profession TEXT,
  tenant_employer TEXT,
  tenant_monthly_income NUMERIC(12,2),

  -- Cônjuge / co-locatários
  co_tenants UUID[] DEFAULT '{}',

  -- Fiador
  guarantor_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  guarantor_name TEXT,
  guarantor_cpf TEXT,
  guarantor_phone TEXT,
  guarantor_email TEXT,
  guarantor_monthly_income NUMERIC(12,2),

  -- Testemunhas
  witness_1_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  witness_1_name TEXT,
  witness_1_cpf TEXT,
  witness_2_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  witness_2_name TEXT,
  witness_2_cpf TEXT,

  -- Garantia
  guarantee_type TEXT CHECK (guarantee_type IN ('fiador','seguro_fianca','deposito_caucao','titulo_capitalizacao','sem')),
  guarantee_value NUMERIC(12,2),
  guarantee_details JSONB,
  caution_amount NUMERIC(12,2),
  caution_payment_date DATE,
  insurance_company TEXT,
  insurance_policy_number TEXT,

  -- Condições Comerciais
  monthly_rent NUMERIC(12,2) NOT NULL DEFAULT 0,
  condominium_fee NUMERIC(10,2) DEFAULT 0,
  iptu_amount NUMERIC(10,2) DEFAULT 0,
  due_day INTEGER CHECK (due_day BETWEEN 1 AND 31),
  adjustment_index TEXT DEFAULT 'IGPM',
  adjustment_period_months INTEGER DEFAULT 12,
  late_fee_percent NUMERIC(5,2) DEFAULT 2.00,
  late_interest_percent NUMERIC(8,5) DEFAULT 0.03333,
  currency_correction BOOLEAN DEFAULT true,

  start_date DATE,
  end_date DATE,
  contract_duration_months INTEGER,
  occupation_date DATE,
  key_delivery_date DATE,
  rental_purpose TEXT,

  commission_percent NUMERIC(5,2) DEFAULT 0,
  commission_payer TEXT CHECK (commission_payer IN ('locador','locatario','ambos')),

  -- Assinatura
  signature_method TEXT,
  signature_status TEXT DEFAULT 'pending'
    CHECK (signature_status IN ('pending','sent','partially_signed','signed','refused','expired')),
  signed_document_url TEXT,

  -- Análise cadastral
  evaluation_score INTEGER DEFAULT 0,
  evaluation_status TEXT DEFAULT 'em_analise'
    CHECK (evaluation_status IN ('em_analise','aprovado','aprovado_com_ressalva','reprovado')),
  credit_score INTEGER,
  has_restrictions BOOLEAN DEFAULT false,
  restriction_notes TEXT,
  analysis_notes TEXT,

  -- Financeiro
  payment_status TEXT DEFAULT 'em_dia'
    CHECK (payment_status IN ('em_dia','atrasado','inadimplente')),

  -- Metadata
  current_template_id UUID,
  last_rent_adjustment DATE,
  next_rent_adjustment DATE,
  renewal_count INTEGER DEFAULT 0,
  previous_lease_id UUID REFERENCES leases(id),

  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- ============================================================
-- 2. CONTRACT TEMPLATES (modelos de contrato persistentes)
-- ============================================================
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'locacao',
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  source_file_url TEXT,
  source_file_name TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. CONTRACT VERSIONS (histórico de versões)
-- ============================================================
CREATE TABLE IF NOT EXISTS contract_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES contract_templates(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  change_log TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. GENERATED CONTRACTS (contratos gerados)
-- ============================================================
CREATE TABLE IF NOT EXISTS generated_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  template_id UUID REFERENCES contract_templates(id),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_html TEXT,
  pdf_url TEXT,
  docx_url TEXT,
  hash_sha256 TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. SIGNATURES (registro de assinaturas)
-- ============================================================
CREATE TABLE IF NOT EXISTS signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  signer_type TEXT NOT NULL CHECK (signer_type IN ('locador','locatario','fiador','co_locatario','testemunha_1','testemunha_2')),
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signer_phone TEXT,
  signer_cpf TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','signed','refused','expired')),
  signed_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  signature_hash TEXT,
  document_hash TEXT,
  signature_provider TEXT,
  provider_signature_id TEXT,
  invitation_sent_at TIMESTAMPTZ,
  invitation_method TEXT CHECK (invitation_method IN ('whatsapp','email','ambos')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. INSPECTIONS (vistorias)
-- ============================================================
CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('entrada','saida','periodica')),
  inspection_date DATE NOT NULL,
  inspector_name TEXT,
  tenant_present BOOLEAN DEFAULT false,
  owner_present BOOLEAN DEFAULT false,
  items JSONB DEFAULT '[]',
  meter_readings JSONB,
  notes TEXT,
  report_url TEXT,
  signed_by_tenant BOOLEAN DEFAULT false,
  signed_by_owner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. INVOICES (boletos/cobranças)
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number TEXT,
  due_date DATE NOT NULL,
  reference_month DATE,
  amount NUMERIC(12,2) NOT NULL,
  rent_amount NUMERIC(12,2),
  condominium_amount NUMERIC(10,2),
  iptu_amount NUMERIC(10,2),
  late_fee NUMERIC(10,2) DEFAULT 0,
  late_interest NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','vencido','pago','cancelado','protestado')),
  payment_date DATE,
  payment_method TEXT,
  payment_proof_url TEXT,
  barcode TEXT,
  nossonumero TEXT,
  invoice_url TEXT,
  pix_code TEXT,
  paid_amount NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 8. RENT ADJUSTMENTS (histórico de reajustes)
-- ============================================================
CREATE TABLE IF NOT EXISTS rent_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  previous_rent NUMERIC(12,2) NOT NULL,
  new_rent NUMERIC(12,2) NOT NULL,
  adjustment_index TEXT NOT NULL,
  index_rate NUMERIC(8,5),
  adjustment_date DATE NOT NULL,
  calculated_by TEXT DEFAULT 'system',
  approved BOOLEAN DEFAULT false,
  notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 9. LEASE TERMINATIONS (rescisões)
-- ============================================================
CREATE TABLE IF NOT EXISTS lease_terminations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  termination_type TEXT NOT NULL CHECK (termination_type IN ('acordo','unilateral_locatario','unilateral_locador','quebra_contratual')),
  termination_date DATE NOT NULL,
  fine_amount NUMERIC(12,2),
  fine_paid BOOLEAN DEFAULT false,
  days_notice INTEGER,
  notice_date DATE,
  reason TEXT,
  key_return_date DATE,
  inspection_report_url TEXT,
  settlement_document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 10. LEASE HISTORY (log de alterações)
-- ============================================================
CREATE TABLE IF NOT EXISTS lease_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leases_org_status ON leases(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_leases_tenant ON leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_property ON leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_dates ON leases(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leases_org_tenant_name ON leases(organization_id, tenant_name);
CREATE INDEX IF NOT EXISTS idx_invoices_lease_due ON invoices(lease_id, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON invoices(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_contract_templates_org ON contract_templates(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_signatures_lease ON signatures(lease_id);
CREATE INDEX IF NOT EXISTS idx_signatures_status ON signatures(status);
CREATE INDEX IF NOT EXISTS idx_lease_history_lease ON lease_history(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_history_created ON lease_history(created_at);
CREATE INDEX IF NOT EXISTS idx_inspections_lease ON inspections(lease_id);
CREATE INDEX IF NOT EXISTS idx_rent_adjustments_lease ON rent_adjustments(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_terminations_lease ON lease_terminations(lease_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_terminations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_history ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES (tenant isolation)
-- ============================================================
CREATE POLICY "Tenant isolation leases" ON leases
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation contract_templates" ON contract_templates
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()) OR organization_id IS NULL);

CREATE POLICY "Tenant isolation contract_versions" ON contract_versions
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation generated_contracts" ON generated_contracts
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation signatures" ON signatures
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation inspections" ON inspections
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation invoices" ON invoices
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation rent_adjustments" ON rent_adjustments
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation lease_terminations" ON lease_terminations
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation lease_history" ON lease_history
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- TRIGGER: Auto-generate contract_number on INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION set_contract_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_number IS NULL THEN
    NEW.contract_number := generate_contract_number(NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_contract_number ON leases;
CREATE TRIGGER trg_set_contract_number
  BEFORE INSERT ON leases
  FOR EACH ROW
  EXECUTE FUNCTION set_contract_number();

-- ============================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leases_updated_at ON leases;
CREATE TRIGGER trg_leases_updated_at
  BEFORE UPDATE ON leases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TRIGGER: Log lease history on UPDATE
-- ============================================================
CREATE OR REPLACE FUNCTION log_lease_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields TEXT[] := '{}';
  field_name TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO lease_history (lease_id, organization_id, action, description, field_changed, old_value, new_value, user_id)
    VALUES (NEW.id, NEW.organization_id, 'status_change', 'Status alterado', 'status', OLD.status, NEW.status, NEW.updated_by);
  END IF;

  IF OLD.monthly_rent IS DISTINCT FROM NEW.monthly_rent THEN
    INSERT INTO lease_history (lease_id, organization_id, action, description, field_changed, old_value, new_value, user_id)
    VALUES (NEW.id, NEW.organization_id, 'rent_change', 'Aluguel alterado', 'monthly_rent', OLD.monthly_rent::TEXT, NEW.monthly_rent::TEXT, NEW.updated_by);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lease_history ON leases;
CREATE TRIGGER trg_lease_history
  AFTER UPDATE ON leases
  FOR EACH ROW
  EXECUTE FUNCTION log_lease_changes();

-- ============================================================
-- VIEW: lease_overview (visão consolidada para dashboard)
-- ============================================================
CREATE OR REPLACE VIEW lease_overview AS
SELECT
  l.id,
  l.organization_id,
  l.contract_number,
  l.status,
  l.tenant_name,
  l.tenant_cpf,
  l.tenant_phone,
  l.tenant_email,
  l.property_id,
  p.title AS property_title,
  p.city AS property_city,
  p.state AS property_state,
  l.monthly_rent,
  l.due_day,
  l.start_date,
  l.end_date,
  l.contract_duration_months,
  l.guarantee_type,
  l.evaluation_status,
  l.evaluation_score,
  l.payment_status,
  l.signature_status,
  l.last_rent_adjustment,
  l.next_rent_adjustment,
  l.signed_at,
  l.activated_at,
  l.created_at,
  l.owner_id,
  l.guarantor_name,
  l.occupation_date,
  l.renewal_count,
  -- Indicadores calculados
  CASE
    WHEN l.status = 'active' AND l.end_date IS NOT NULL THEN
      GREATEST(0, (l.end_date - CURRENT_DATE))
    ELSE NULL
  END AS dias_restantes,
  CASE
    WHEN l.status = 'active' AND l.end_date IS NOT NULL THEN
      GREATEST(0, EXTRACT(MONTH FROM age(l.end_date, CURRENT_DATE))::INTEGER)
    ELSE NULL
  END AS meses_restantes
FROM leases l
LEFT JOIN properties p ON p.id = l.property_id;

-- ============================================================
-- VIEW: lease_financial_summary
-- ============================================================
CREATE OR REPLACE VIEW lease_financial_summary AS
SELECT
  l.id AS lease_id,
  l.organization_id,
  l.contract_number,
  l.tenant_name,
  l.monthly_rent,
  l.payment_status,
  l.status,
  l.due_day,
  COALESCE(inv_pend.total_pending, 0) AS total_pending,
  COALESCE(inv_pend.count_pending, 0) AS pending_invoices,
  COALESCE(inv_overdue.total_overdue, 0) AS total_overdue,
  COALESCE(inv_overdue.count_overdue, 0) AS overdue_invoices,
  COALESCE(inv_paid.last_payment_date, NULL) AS last_payment_date,
  l.last_rent_adjustment,
  l.next_rent_adjustment
FROM leases l
LEFT JOIN (
  SELECT lease_id,
    SUM(total) AS total_pending,
    COUNT(*) AS count_pending
  FROM invoices
  WHERE status IN ('pendente', 'vencido')
  GROUP BY lease_id
) inv_pend ON inv_pend.lease_id = l.id
LEFT JOIN (
  SELECT lease_id,
    SUM(total) AS total_overdue,
    COUNT(*) AS count_overdue
  FROM invoices
  WHERE status = 'vencido'
  GROUP BY lease_id
) inv_overdue ON inv_overdue.lease_id = l.id
LEFT JOIN (
  SELECT lease_id,
    MAX(payment_date) AS last_payment_date
  FROM invoices
  WHERE status = 'pago'
  GROUP BY lease_id
) inv_paid ON inv_paid.lease_id = l.id;

-- Done!
SELECT 'Migration Lease Management v1.0 completed successfully!' AS result;
