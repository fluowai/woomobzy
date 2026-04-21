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
END $$;

-- 5. Enable RLS on new tables
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
CREATE POLICY "Tenant isolation payment_history" ON payment_history
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation contract_renewals" ON contract_renewals
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation billing" ON billing
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Done!
SELECT 'Migration v4 (Locação Estendida) completed successfully!' AS result;