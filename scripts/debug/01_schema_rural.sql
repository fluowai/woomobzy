-- IMOBZY RURAL SCHEMA - Phase 1
-- Requirements: PostgreSQL + PostGIS

-- 1. Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Rural Properties Registry
CREATE TABLE IF NOT EXISTS rural_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL, -- FK to companies (legacy)
  internal_code TEXT UNIQUE,
  title TEXT NOT NULL,
  description_commercial TEXT,
  description_technical TEXT,
  property_type TEXT CHECK (property_type IN ('FAZENDA', 'SITIO', 'CHACARA', 'HARAS', 'AREA_AGRICOLA', 'AREA_PECUARIA', 'REFLORESTAMENTO', 'LAZER_RURAL', 'ARRENDAMENTO')),
  
  -- Area Details (Hectares)
  total_area NUMERIC(15,2) DEFAULT 0,
  useful_area NUMERIC(15,2) DEFAULT 0,
  open_area NUMERIC(15,2) DEFAULT 0,
  consolidated_area NUMERIC(15,2) DEFAULT 0,
  agricultural_area NUMERIC(15,2) DEFAULT 0,
  pasture_area NUMERIC(15,2) DEFAULT 0,
  reserve_area NUMERIC(15,2) DEFAULT 0,
  app_area NUMERIC(15,2) DEFAULT 0,
  
  -- Geographic
  state CHAR(2),
  city TEXT,
  region TEXT,
  centroid GEOGRAPHY(POINT, 4326),
  
  -- Technical/Environmental
  biome TEXT,
  topography TEXT,
  soil_type TEXT,
  altitude NUMERIC(10,2),
  average_pluviometry NUMERIC(10,2),
  has_water BOOLEAN DEFAULT FALSE,
  water_description TEXT,
  access_quality TEXT,
  distance_from_pavement NUMERIC(10,2),
  
  -- Commercial
  price_total NUMERIC(20,2),
  price_per_unit NUMERIC(20,2), -- Calculated or manual
  price_currency TEXT DEFAULT 'BRL',
  accepts_exchange BOOLEAN DEFAULT FALSE,
  is_confidential BOOLEAN DEFAULT FALSE,
  is_exclusive BOOLEAN DEFAULT FALSE,
  
  -- Status & Metadata
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'SOLD', 'SUSPENDED', 'ARCHIVED')),
  liquidity_score INTEGER DEFAULT 0,
  risk_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Polygons (Supporting multiple parcels for a single property)
CREATE TABLE IF NOT EXISTS property_polygons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES rural_properties(id) ON DELETE CASCADE,
  geom GEOMETRY(GEOMETRY, 4326),
  source TEXT, -- 'MANUAL', 'CAR', 'SIGEF', 'KML'
  area_calculated_ha NUMERIC(15,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Owners & Contacts (Rural focus)
CREATE TABLE IF NOT EXISTS rural_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  document TEXT, -- CPF/CNPJ
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link property to owner
ALTER TABLE rural_properties ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES rural_owners(id);

-- 5. Due Diligence Checklist
CREATE TABLE IF NOT EXISTS due_diligence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES rural_properties(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'DOCUMENTAÇÃO', 'AMBIENTAL', 'FUNDIÁRIA', 'JURÍDICA'
  name TEXT NOT NULL, -- 'CAR', 'CCIR', 'ITR', 'MATRÍCULA', etc.
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VALID', 'EXPIRED', 'WARNING', 'NOT_APPLICABLE')),
  description TEXT,
  document_url TEXT,
  expiry_date DATE,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID, -- Link to users (legacy)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_rural_props_company ON rural_properties(company_id);
CREATE INDEX IF NOT EXISTS idx_rural_props_status ON rural_properties(status);
CREATE INDEX IF NOT EXISTS idx_rural_props_geom ON rural_properties USING GIST (centroid);
CREATE INDEX IF NOT EXISTS idx_prop_polygons_geom ON property_polygons USING GIST (geom);
