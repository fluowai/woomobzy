-- Migration v4: Extensão de Locação
-- Tabelas para gestão de cobranças, boletos, histórico de pagamentos e renovações

-- 1. Tabela de histórico de pagamentos
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID REFERENCES rental_contracts(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  payment_date DATE,
  due_date DATE,
  amount_paid NUMERIC(12,2),
  amount_due NUMERIC(12,2),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  payment_method TEXT,
  observation TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de renovações de contratos
CREATE TABLE IF NOT EXISTS contract_renewals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID REFERENCES rental_contracts(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  old_rent NUMERIC(12,2),
  new_rent NUMERIC(12,2),
  old_end_date DATE,
  new_start_date DATE,
  new_end_date DATE,
  adjustment_index TEXT,
  renewal_type TEXT DEFAULT 'reajuste' CHECK (renewal_type IN ('reajuste', 'renovacao', 'novo_contrato')),
  observation TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de boletos/cobranças
CREATE TABLE IF NOT EXISTS billing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID REFERENCES rental_contracts(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  amount NUMERIC(12,2),
  status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto', 'pago', 'vencido', 'cancelado', 'protesto')),
  payment_date DATE,
  barcode TEXT,
  nossonumero TEXT,
  invoice_url TEXT,
  observation TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Adicionar colunas extras na tabela de contratos (se não existirem)
DO $$ 
BEGIN
  -- Check if column exists before adding
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_cpf') THEN
    ALTER TABLE rental_contracts ADD COLUMN tenant_cpf TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_rg') THEN
    ALTER TABLE rental_contracts ADD COLUMN tenant_rg TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'guarantee_type') THEN
    ALTER TABLE rental_contracts ADD COLUMN guarantee_type TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'guarantee_document') THEN
    ALTER TABLE rental_contracts ADD COLUMN guarantee_document TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'observation') THEN
    ALTER TABLE rental_contracts ADD COLUMN observation TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_birth_date') THEN
    ALTER TABLE rental_contracts ADD COLUMN tenant_birth_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_marital_status') THEN
    ALTER TABLE rental_contracts ADD COLUMN tenant_marital_status TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_profession') THEN
    ALTER TABLE rental_contracts ADD COLUMN tenant_profession TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_employer') THEN
    ALTER TABLE rental_contracts ADD COLUMN tenant_employer TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_monthly_income') THEN
    ALTER TABLE rental_contracts ADD COLUMN tenant_monthly_income NUMERIC(12,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_address') THEN
    ALTER TABLE rental_contracts ADD COLUMN tenant_address TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_city') THEN
    ALTER TABLE rental_contracts ADD COLUMN tenant_city TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_state') THEN
    ALTER TABLE rental_contracts ADD COLUMN tenant_state TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_zip') THEN
    ALTER TABLE rental_contracts ADD COLUMN tenant_zip TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'emergency_contact_name') THEN
    ALTER TABLE rental_contracts ADD COLUMN emergency_contact_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'emergency_contact_phone') THEN
    ALTER TABLE rental_contracts ADD COLUMN emergency_contact_phone TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'reference_1_name') THEN
    ALTER TABLE rental_contracts ADD COLUMN reference_1_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'reference_1_phone') THEN
    ALTER TABLE rental_contracts ADD COLUMN reference_1_phone TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'reference_2_name') THEN
    ALTER TABLE rental_contracts ADD COLUMN reference_2_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'reference_2_phone') THEN
    ALTER TABLE rental_contracts ADD COLUMN reference_2_phone TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'evaluation_score') THEN
    ALTER TABLE rental_contracts ADD COLUMN evaluation_score INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'evaluation_status') THEN
    ALTER TABLE rental_contracts ADD COLUMN evaluation_status TEXT DEFAULT 'em_analise';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'credit_score') THEN
    ALTER TABLE rental_contracts ADD COLUMN credit_score INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'has_restrictions') THEN
    ALTER TABLE rental_contracts ADD COLUMN has_restrictions BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'restriction_notes') THEN
    ALTER TABLE rental_contracts ADD COLUMN restriction_notes TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'income_proof_status') THEN
    ALTER TABLE rental_contracts ADD COLUMN income_proof_status TEXT DEFAULT 'pendente';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'guarantor_name') THEN
    ALTER TABLE rental_contracts ADD COLUMN guarantor_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'guarantor_cpf') THEN
    ALTER TABLE rental_contracts ADD COLUMN guarantor_cpf TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'guarantor_phone') THEN
    ALTER TABLE rental_contracts ADD COLUMN guarantor_phone TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'guarantor_monthly_income') THEN
    ALTER TABLE rental_contracts ADD COLUMN guarantor_monthly_income NUMERIC(12,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'recommended_limit') THEN
    ALTER TABLE rental_contracts ADD COLUMN recommended_limit NUMERIC(12,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'analysis_notes') THEN
    ALTER TABLE rental_contracts ADD COLUMN analysis_notes TEXT;
  END IF;
END $$;

-- 5. Enable RLS on new tables
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DROP POLICY IF EXISTS "Tenant isolation payment_history" ON payment_history;
CREATE POLICY "Tenant isolation payment_history" ON payment_history
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation contract_renewals" ON contract_renewals;
CREATE POLICY "Tenant isolation contract_renewals" ON contract_renewals
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation billing" ON billing;
CREATE POLICY "Tenant isolation billing" ON billing
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Done!
SELECT 'Migration v4 (Locação Estendida) completed successfully!' AS result;
