-- ============================================
-- MULTI-TENANT SAAS - DATABASE SCHEMA
-- ============================================
-- Adiciona suporte para múltiplos tenants com domínios customizados
-- ============================================

-- 1. ATUALIZAR TABELA ORGANIZATIONS
-- ============================================

-- Adicionar campos de domínio
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100) UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free'; -- free, basic, pro, enterprise

-- Índices
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain ON organizations(subdomain);
CREATE INDEX IF NOT EXISTS idx_organizations_custom_domain ON organizations(custom_domain);

-- 2. CRIAR TABELA DE DOMÍNIOS
-- ============================================

CREATE TABLE IF NOT EXISTS domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- Domínio
  domain VARCHAR(255) UNIQUE NOT NULL,
  is_custom BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, verifying, verified, active, failed
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- DNS Configuration
  dns_records JSONB DEFAULT '[]'::jsonb,
  
  -- SSL
  ssl_status VARCHAR(50) DEFAULT 'pending', -- pending, active, expired, failed
  ssl_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_domains_organization ON domains(organization_id);
CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain);
CREATE INDEX IF NOT EXISTS idx_domains_status ON domains(status);

-- Apenas um domínio primário por organização
CREATE UNIQUE INDEX IF NOT EXISTS idx_domains_primary 
  ON domains(organization_id) 
  WHERE is_primary = true;

-- 3. FUNÇÃO PARA GERAR SUBDOMAIN AUTOMÁTICO
-- ============================================

CREATE OR REPLACE FUNCTION generate_subdomain()
RETURNS TRIGGER AS $$
DECLARE
  base_subdomain TEXT;
  final_subdomain TEXT;
  counter INTEGER := 0;
BEGIN
  -- Se subdomain já foi definido, não fazer nada
  IF NEW.subdomain IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Gerar subdomain base a partir do nome
  base_subdomain := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]', '', 'g'));
  final_subdomain := base_subdomain;
  
  -- Verificar se já existe e adicionar número se necessário
  WHILE EXISTS (SELECT 1 FROM organizations WHERE subdomain = final_subdomain) LOOP
    counter := counter + 1;
    final_subdomain := base_subdomain || counter;
  END LOOP;
  
  NEW.subdomain := final_subdomain;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar subdomain
DROP TRIGGER IF EXISTS set_subdomain ON organizations;
CREATE TRIGGER set_subdomain
  BEFORE INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION generate_subdomain();

-- 4. FUNÇÃO PARA CRIAR DOMÍNIO PADRÃO
-- ============================================

CREATE OR REPLACE FUNCTION create_default_domain()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar domínio com o subdomain da organização
  INSERT INTO domains (organization_id, domain, is_custom, is_primary, status)
  VALUES (NEW.id, NEW.subdomain || '.imobisaas.com', false, true, 'active');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar domínio padrão
DROP TRIGGER IF EXISTS create_org_domain ON organizations;
CREATE TRIGGER create_org_domain
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_default_domain();

-- 5. ROW LEVEL SECURITY PARA DOMAINS
-- ============================================

ALTER TABLE domains ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver domínios da sua organização
CREATE POLICY "Users can view their org domains"
  ON domains FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Usuários podem criar domínios para sua organização
CREATE POLICY "Users can create domains for their org"
  ON domains FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Usuários podem atualizar domínios da sua organização
CREATE POLICY "Users can update their org domains"
  ON domains FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Usuários podem deletar domínios da sua organização (exceto o primário)
CREATE POLICY "Users can delete non-primary domains"
  ON domains FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND is_primary = false
  );

-- 6. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE domains IS 'Domínios customizados e subdomínios das organizações';
COMMENT ON COLUMN domains.domain IS 'Nome completo do domínio (ex: cliente.imobisaas.com ou www.cliente.com.br)';
COMMENT ON COLUMN domains.is_custom IS 'Se true, é um domínio customizado do cliente';
COMMENT ON COLUMN domains.is_primary IS 'Domínio principal da organização';
COMMENT ON COLUMN domains.status IS 'Status: pending, verifying, verified, active, failed';
COMMENT ON COLUMN domains.dns_records IS 'Registros DNS necessários para verificação';

COMMENT ON COLUMN organizations.subdomain IS 'Subdomínio único da organização (ex: "cliente" para cliente.imobisaas.com)';
COMMENT ON COLUMN organizations.custom_domain IS 'Domínio customizado principal (deprecated - usar tabela domains)';
COMMENT ON COLUMN organizations.plan IS 'Plano da organização: free, basic, pro, enterprise';

-- ============================================
-- FIM DO SCRIPT
-- ============================================
