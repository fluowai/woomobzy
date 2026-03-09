-- ============================================
-- ImobiSaaS - Setup Completo do Novo Banco de Dados
-- ============================================
-- Execute este script no SQL Editor do novo Supabase
-- URL: https://wcumnqteyrgwdqpjzqlt.supabase.co
-- ============================================

-- ============================================
-- 1. CRIAÇÃO DAS TABELAS
-- ============================================

-- Tabela de Configurações do Site
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_name TEXT NOT NULL DEFAULT 'Minha Imobiliária',
  primary_color TEXT DEFAULT '#4F46E5',
  secondary_color TEXT DEFAULT '#1E293B',
  header_color TEXT DEFAULT '#1E293B',
  logo_url TEXT,
  logo_height INTEGER DEFAULT 60,
  font_family TEXT DEFAULT 'Inter',
  base_font_size INTEGER DEFAULT 16,
  heading_font_size INTEGER DEFAULT 32,
  contact_phone TEXT,
  contact_email TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  whatsapp_number TEXT,
  footer_text TEXT,
  template_id TEXT DEFAULT 'modern',
  home_content JSONB DEFAULT '{}'::jsonb,
  integrations JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Propriedades
CREATE TABLE IF NOT EXISTS properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  type TEXT,
  status TEXT DEFAULT 'Disponível',
  
  -- Campos de endereço
  city TEXT,
  neighborhood TEXT,
  state TEXT,
  address TEXT,
  
  -- Features em JSONB (quartos, banheiros, área, etc)
  features JSONB DEFAULT '{}'::jsonb,
  
  -- Array de URLs de imagens
  images TEXT[] DEFAULT '{}',
  
  highlighted BOOLEAN DEFAULT false,
  owner_info JSONB,
  broker_id TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  source TEXT DEFAULT 'Site',
  status TEXT DEFAULT 'Novo',
  budget NUMERIC,
  preferences JSONB DEFAULT '{}'::jsonb,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Perfis de Usuários
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  role TEXT DEFAULT 'user',
  agency_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- 2. ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_highlighted ON properties(highlighted);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_property_id ON leads(property_id);

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. POLÍTICAS DE ACESSO - SITE_SETTINGS
-- ============================================

-- Permitir leitura pública (para landing page)
CREATE POLICY "Allow public read access to settings"
ON site_settings FOR SELECT
TO public
USING (true);

-- Permitir inserção pública (para wizard inicial)
CREATE POLICY "Allow public insert to settings"
ON site_settings FOR INSERT
TO public
WITH CHECK (true);

-- Permitir atualização pública (para admin sem auth)
CREATE POLICY "Allow public update to settings"
ON site_settings FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- ============================================
-- 5. POLÍTICAS DE ACESSO - PROPERTIES
-- ============================================

-- Permitir leitura pública (para landing page)
CREATE POLICY "Allow public read access to properties"
ON properties FOR SELECT
TO public
USING (true);

-- Permitir inserção pública (para admin sem auth)
CREATE POLICY "Allow public insert to properties"
ON properties FOR INSERT
TO public
WITH CHECK (true);

-- Permitir atualização pública (para admin sem auth)
CREATE POLICY "Allow public update to properties"
ON properties FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Permitir deleção pública (para admin sem auth)
CREATE POLICY "Allow public delete to properties"
ON properties FOR DELETE
TO public
USING (true);

-- ============================================
-- 6. POLÍTICAS DE ACESSO - LEADS
-- ============================================

-- Permitir leitura pública
CREATE POLICY "Allow public read access to leads"
ON leads FOR SELECT
TO public
USING (true);

-- Permitir inserção pública (para formulários de contato)
CREATE POLICY "Allow public insert to leads"
ON leads FOR INSERT
TO public
WITH CHECK (true);

-- Permitir atualização pública
CREATE POLICY "Allow public update to leads"
ON leads FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Permitir deleção pública
CREATE POLICY "Allow public delete to leads"
ON leads FOR DELETE
TO public
USING (true);

-- ============================================
-- 7. POLÍTICAS DE ACESSO - PROFILES
-- ============================================

-- Permitir leitura pública
CREATE POLICY "Allow public read access to profiles"
ON profiles FOR SELECT
TO public
USING (true);

-- Permitir inserção para usuários autenticados
CREATE POLICY "Allow authenticated insert to profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir atualização para usuários autenticados
CREATE POLICY "Allow authenticated update to profiles"
ON profiles FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- 8. CONFIGURAÇÃO DE STORAGE
-- ============================================

-- Habilitar RLS na tabela de objetos do Storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso PÚBLICO de visualização
CREATE POLICY "Public Access to Storage"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id IN ('agency-assets', 'property-images') );

-- Política para permitir UPLOAD (Insert) público
CREATE POLICY "Allow Public Uploads to Storage"
ON storage.objects FOR INSERT
TO public
WITH CHECK ( bucket_id IN ('agency-assets', 'property-images') );

-- Política para permitir UPDATE público
CREATE POLICY "Allow Public Updates to Storage"
ON storage.objects FOR UPDATE
TO public
USING ( bucket_id IN ('agency-assets', 'property-images') )
WITH CHECK ( bucket_id IN ('agency-assets', 'property-images') );

-- Política para permitir DELETE público
CREATE POLICY "Allow Public Deletes from Storage"
ON storage.objects FOR DELETE
TO public
USING ( bucket_id IN ('agency-assets', 'property-images') );

-- ============================================
-- 9. DADOS INICIAIS
-- ============================================

-- Inserir configuração padrão se não existir
INSERT INTO site_settings (agency_name, footer_text)
SELECT 
  'Minha Imobiliária',
  '© 2024 Minha Imobiliária. Todos os direitos reservados.'
WHERE NOT EXISTS (SELECT 1 FROM site_settings);

-- ============================================
-- 10. FUNÇÕES AUXILIARES
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_site_settings_updated_at ON site_settings;
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SETUP COMPLETO!
-- ============================================
-- Próximos passos:
-- 1. Criar os buckets 'agency-assets' e 'property-images' no Storage
-- 2. Marcar os buckets como PÚBLICOS na interface do Supabase
-- 3. Atualizar o arquivo .env com as novas credenciais
-- 4. Testar a aplicação
-- ============================================
