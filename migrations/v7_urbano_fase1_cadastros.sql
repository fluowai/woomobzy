-- Migration v7: Imobzy Urbano Fase 1 - Cadastros Gerais e Modalidades
-- Criação da tabela unificada de clientes (CRM avançado) e adaptação de campos

-- 1. Criação da Tabela de Clientes
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN ('CPF', 'CNPJ', 'Passaporte')),
  document_number TEXT,
  email TEXT,
  phone TEXT,
  -- 'Comprador', 'Inquilino', 'Proprietário', 'Fiador', 'Investidor'
  roles TEXT[] DEFAULT '{}', 
  
  -- Dados Pessoais / Profissionais
  birth_date DATE,
  marital_status TEXT,
  profession TEXT,
  monthly_income NUMERIC(12,2),
  
  -- Endereço com base no CEP
  address_zip TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Atualizar tabela de properties para associar a um proprietário
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'owner_id') THEN
    ALTER TABLE properties ADD COLUMN owner_id UUID REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Atualizar tabela de leads para poder linkar com um cliente existente (caso já exista)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'client_id') THEN
    ALTER TABLE leads ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Enable RLS e Policies para Clientes
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation clients" ON clients;
CREATE POLICY "Tenant isolation clients" ON clients
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Done!
SELECT 'Migration v7 (Urbano Fase 1 - Cadastros) completed successfully!' AS result;
