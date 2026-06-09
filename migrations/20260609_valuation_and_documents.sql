-- Migration: Valuation System + Document Intelligence
-- Habilita PostGIS (se ainda nao ativo)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- ============================================
-- 1. PRICE HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  price NUMERIC(14,2) NOT NULL,
  price_per_ha NUMERIC(10,2),
  price_per_m2 NUMERIC(10,2),
  source TEXT DEFAULT 'manual',
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_property
  ON price_history(property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_history_created
  ON price_history(created_at DESC);

-- Trigger para capturar mudancas de preco automaticamente
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
DECLARE
  area_ha NUMERIC;
  area_m2 NUMERIC;
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    area_ha := COALESCE((NEW.features->>'areaHectares')::numeric, 0);
    area_m2 := COALESCE((NEW.features->>'areaM2')::numeric, 0);

    INSERT INTO price_history (
      property_id, price,
      price_per_ha, price_per_m2,
      source, metadata
    ) VALUES (
      NEW.id, NEW.price,
      CASE WHEN area_ha > 0 THEN ROUND(NEW.price / area_ha, 2) ELSE NULL END,
      CASE WHEN area_m2 > 0 THEN ROUND(NEW.price / area_m2, 2) ELSE NULL END,
      'system',
      jsonb_build_object('old_price', OLD.price, 'updated_at', now())
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_price_change ON properties;
CREATE TRIGGER trg_log_price_change
  AFTER UPDATE OF price ON properties
  FOR EACH ROW EXECUTE FUNCTION log_price_change();

-- ============================================
-- 2. PROPERTY VALUATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS property_valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  estimated_value NUMERIC(14,2) NOT NULL,
  min_value NUMERIC(14,2),
  max_value NUMERIC(14,2),
  confidence REAL DEFAULT 0.0,

  method TEXT NOT NULL CHECK (method IN ('rule_based', 'hedonic', 'comparative', 'ml_model', 'manual')),
  model_version TEXT,

  currency TEXT DEFAULT 'BRL',
  factors JSONB DEFAULT '[]',
  breakdown JSONB DEFAULT '{}',
  rules_applied TEXT[] DEFAULT '{}',

  triggered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_valuations_property
  ON property_valuations(property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_valuations_org
  ON property_valuations(organization_id);

-- ============================================
-- 3. VALUATION RULES (regras de negocio)
-- ============================================
CREATE TABLE IF NOT EXISTS valuation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('base_price', 'multiplier', 'premium', 'deduction')),
  property_type TEXT,
  city TEXT,
  state TEXT,
  conditions JSONB NOT NULL DEFAULT '{}',
  value NUMERIC(12,4) NOT NULL,
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_valuation_rules_org
  ON valuation_rules(organization_id);

-- ============================================
-- 4. COMPARABLE SALES (vendas comparaveis)
-- ============================================
CREATE TABLE IF NOT EXISTS comparable_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,

  sale_price NUMERIC(14,2) NOT NULL,
  sale_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'internal',
  source_url TEXT,

  property_type TEXT,
  city TEXT,
  state TEXT,
  neighborhood TEXT,
  area_ha NUMERIC(10,2),
  area_m2 NUMERIC(10,2),
  features_summary JSONB DEFAULT '{}',

  reliability REAL DEFAULT 0.5,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comparable_city
  ON comparable_sales(city, state);

CREATE INDEX IF NOT EXISTS idx_comparable_type
  ON comparable_sales(property_type);

-- ============================================
-- 5. MARKET INDICATORS
-- ============================================
CREATE TABLE IF NOT EXISTS market_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_key TEXT UNIQUE NOT NULL,
  indicator_type TEXT NOT NULL,
  city TEXT,
  state TEXT,
  value NUMERIC(14,4) NOT NULL,
  unit TEXT,
  source TEXT NOT NULL,
  reference_date DATE NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_indicators_key
  ON market_indicators(indicator_key);

CREATE INDEX IF NOT EXISTS idx_market_indicators_city
  ON market_indicators(city, state);

-- ============================================
-- 6. DOCUMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,

  bucket TEXT NOT NULL DEFAULT 'documents',
  object_key TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  sha256 TEXT,

  document_type TEXT CHECK (document_type IN (
    'ESCRITURA', 'MATRICULA', 'CAR', 'CCIR', 'ITR', 'IPTU',
    'CONTRATO', 'CND', 'PROCURACAO', 'RG', 'CPF', 'CNPJ',
    'COMPROVANTE_ENDERECO', 'COMPROVANTE_RENDA', 'OUTRO'
  )),
  classification_confidence REAL,
  classified_by TEXT CHECK (classified_by IN ('ia', 'manual')),
  classified_at TIMESTAMPTZ,

  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'analyzed', 'failed', 'validated'
  )),
  processing_error TEXT,

  raw_text TEXT,
  ocr_confidence REAL,

  extracted_data JSONB DEFAULT '{}',

  validation_score REAL CHECK (validation_score >= 0 AND validation_score <= 100),
  validation_status TEXT CHECK (validation_status IN ('unchecked', 'valid', 'inconsistent', 'failed')),
  validation_details JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_doc_type_per_property UNIQUE (organization_id, property_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_documents_property
  ON documents(property_id);

CREATE INDEX IF NOT EXISTS idx_documents_org
  ON documents(organization_id);

CREATE INDEX IF NOT EXISTS idx_documents_status
  ON documents(status);

CREATE INDEX IF NOT EXISTS idx_documents_type
  ON documents(document_type);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation documents" ON documents;
CREATE POLICY "Tenant isolation documents" ON documents
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ============================================
-- 7. DOCUMENT ANALYSES
-- ============================================
CREATE TABLE IF NOT EXISTS document_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,

  analysis_type TEXT NOT NULL CHECK (analysis_type IN (
    'ocr', 'classification', 'extraction', 'validation', 'cross_reference'
  )),
  provider TEXT NOT NULL,
  model_name TEXT,

  input_tokens INT,
  output_tokens INT,
  confidence REAL,
  processing_time_ms INT,

  result JSONB DEFAULT '{}',
  error TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_analyses_document
  ON document_analyses(document_id);

-- ============================================
-- 8. EXTERNAL DATA CACHE
-- ============================================
CREATE TABLE IF NOT EXISTS external_data_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  data JSONB NOT NULL,
  etag TEXT,
  ttl_seconds INT DEFAULT 86400,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '1 day')
);

CREATE INDEX IF NOT EXISTS idx_cache_expires
  ON external_data_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_cache_source
  ON external_data_cache(source);

-- ============================================
-- 9. IBGE MUNICIPIOS (malha geografica)
-- ============================================
CREATE TABLE IF NOT EXISTS ibge_municipios (
  codigo_ibge TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  uf TEXT NOT NULL,
  regiao TEXT,
  geom geometry(MultiPolygon, 4326),
  area_km2 NUMERIC(12,2),
  populacao INT,
  pib_per_capita NUMERIC(12,2),
  idh NUMERIC(4,3),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ibge_municipios_geom
  ON ibge_municipios USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_ibge_municipios_uf
  ON ibge_municipios(uf);

CREATE INDEX IF NOT EXISTS idx_ibge_municipios_nome
  ON ibge_municipios(nome);

ALTER TABLE ibge_municipios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read ibge_municipios" ON ibge_municipios;
CREATE POLICY "Public read ibge_municipios" ON ibge_municipios
  FOR SELECT USING (true);

-- ============================================
-- SEED: valuation_rules default
-- ============================================
INSERT INTO valuation_rules (organization_id, name, description, rule_type, property_type, conditions, value, priority) VALUES
  (NULL, 'Topografia Plana', '+10% para terrenos planos (melhor aptidao mecanizavel)', 'multiplier', 'RURAL', '{"topography": "Plana"}', 1.10, 10),
  (NULL, 'Topografia Levemente Ondulada', '+5% para relevo suave', 'multiplier', 'RURAL', '{"topography": "Levemente Ondulada"}', 1.05, 10),
  (NULL, 'Topografia Ondulada', '-15% para relevo ondulado (menos mecanizavel)', 'multiplier', 'RURAL', '{"topography": "Ondulada"}', 0.85, 10),
  (NULL, 'Topografia Montanhosa', '-35% para relevo montanhoso', 'multiplier', 'RURAL', '{"topography": "Montanhosa"}', 0.65, 10),
  (NULL, 'Solo Terra Roxa', '+15% para terra roxa (alta fertilidade)', 'multiplier', 'RURAL', '{"soilTexture": "Terra Roxa"}', 1.15, 10),
  (NULL, 'Solo Massape', '+10% para massape (boa fertilidade)', 'multiplier', 'RURAL', '{"soilTexture": "Massapê"}', 1.10, 10),
  (NULL, 'Solo Latossolo', '0% para latossolo (media fertilidade)', 'multiplier', 'RURAL', '{"soilTexture": "Latossolo"}', 1.00, 10),
  (NULL, 'Solo Argiloso', '+5% para solo argiloso', 'multiplier', 'RURAL', '{"soilTexture": "Argiloso"}', 1.05, 10),
  (NULL, 'Solo Misto', '0% para solo misto', 'multiplier', 'RURAL', '{"soilTexture": "Misto"}', 1.00, 10),
  (NULL, 'Solo Arenoso', '-20% para solo arenoso (baixa fertilidade)', 'multiplier', 'RURAL', '{"soilTexture": "Arenoso"}', 0.80, 10),
  (NULL, 'Com CAR', '+5% se possui Cadastro Ambiental Rural', 'multiplier', 'RURAL', '{"legal.car": true}', 1.05, 20),
  (NULL, 'Com SIGEF', '+3% se possui georreferenciamento SIGEF', 'multiplier', 'RURAL', '{"legal.geo": true}', 1.03, 20),
  (NULL, 'Com CCIR', '+2% se possui CCIR', 'multiplier', 'RURAL', '{"legal.ccir": true}', 1.02, 20),
  (NULL, 'Com ITR', '+2% se possui ITR regular', 'multiplier', 'RURAL', '{"legal.itr": true}', 1.02, 20),
  (NULL, 'Casa Sede', '+R$ 50k se possui casa sede', 'premium', 'RURAL', '{"infra.casaSede": true}', 50000, 30),
  (NULL, 'Curral/Brete', '+R$ 15k se possui curral e brete', 'premium', 'RURAL', '{"infra.curral": true, "infra.brete": true}', 15000, 30),
  (NULL, 'Galpao', '+R$ 10k por galao', 'premium', 'RURAL', '{"infra.galpaes": {"min": 1}}', 10000, 30),
  (NULL, 'Energia Eletrica', '+3% se possui energia eletrica', 'multiplier', 'RURAL', '{"infra.energiaEletrica": true}', 1.03, 20),
  (NULL, 'Poco Artesiano', '+2% se possui poco artesiano', 'multiplier', 'RURAL', '{"infra.pocoArtesiano": true}', 1.02, 20),
  (NULL, 'Irrigacao', '+5% se possui sistema de irrigacao', 'multiplier', 'RURAL', '{"infra.irrigacao": true}', 1.05, 20),
  (NULL, 'Pivot Central', '+8% se possui pivot central', 'multiplier', 'RURAL', '{"infra.pivotCentral": true}', 1.08, 20),
  (NULL, 'Rio', '+5% se possui rio na propriedade', 'multiplier', 'RURAL', '{"water.rio": true}', 1.05, 25),
  (NULL, 'Nascente', '+3% se possui nascente', 'multiplier', 'RURAL', '{"water.nascente": true}', 1.03, 25),
  (NULL, 'Represa/Acude', '+4% se possui represa ou acude', 'multiplier', 'RURAL', '{"water.represa": true}', 1.04, 25);

-- ============================================
-- 10. DOCUMENT EXTERNAL VALIDATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS document_external_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  queried_at TIMESTAMPTZ DEFAULT now(),
  response_status TEXT,
  matched BOOLEAN,
  match_confidence REAL,
  response_data JSONB DEFAULT '{}',
  response_time_ms INT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_ext_val_document
  ON document_external_validations(document_id);

CREATE INDEX IF NOT EXISTS idx_doc_ext_val_source
  ON document_external_validations(source);

ALTER TABLE document_external_validations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on doc ext validations" ON document_external_validations;
CREATE POLICY "Service role full access on doc ext validations"
  ON document_external_validations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

SELECT 'Migration 20260609_valuation_and_documents completed successfully!' AS result;
