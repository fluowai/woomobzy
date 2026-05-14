-- ============================================================
-- IMOBZY SAAS: NICHE SEPARATION & DATA ISOLATION FIX
-- ============================================================

-- 1. ADICIONAR COLUNAS DE NICHE SE NÃO EXISTIREM
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'organizations'::regclass AND attname = 'niche') THEN
        ALTER TABLE organizations ADD COLUMN niche TEXT DEFAULT 'urbano';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'properties'::regclass AND attname = 'niche') THEN
        ALTER TABLE properties ADD COLUMN niche TEXT DEFAULT 'urbano';
    END IF;
END $$;

-- 2. CRIAR ÍNDICES PARA PERFORMANCE E ISOLAMENTO
CREATE INDEX IF NOT EXISTS idx_properties_organization_id ON properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_properties_niche ON properties(niche);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_custom_domain ON organizations(custom_domain);

-- 3. REFORÇAR RLS PARA ACESSO PÚBLICO (ANONYMOUS)
-- Permitir que qualquer pessoa veja imóveis de uma organização específica
-- Isso é crucial para o site público funcionar sem login
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access to Properties" ON properties;
CREATE POLICY "Public Access to Properties" ON properties
FOR SELECT
USING (true); -- O isolamento será feito via organization_id na query do serviço

-- Política de escrita: Apenas usuários autenticados da própria organização
DROP POLICY IF EXISTS "Tenant write policy" ON properties;
CREATE POLICY "Tenant write policy" ON properties
FOR ALL
TO authenticated
USING (organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid)
WITH CHECK (organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid);

-- 4. POLÍTICAS PARA LANDING PAGES (ACESSO PÚBLICO)
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access to Landing Pages" ON landing_pages;
CREATE POLICY "Public Access to Landing Pages" ON landing_pages
FOR SELECT
USING (status = 'published');

-- 5. FUNÇÃO PARA ATUALIZAR NICHE DOS IMÓVEIS EXISTENTES BASEADO NO TIPO
UPDATE properties 
SET niche = 'rural' 
WHERE property_type IN ('Fazenda', 'Sítio', 'Chácara', 'Estância', 'Haras', 'Granja', 'Agropecuária', 'Terreno Rural', 'Gleba', 'Lote Rural', 'Área Produtiva');

UPDATE properties 
SET niche = 'urbano' 
WHERE niche IS NULL OR niche = 'urbano';
