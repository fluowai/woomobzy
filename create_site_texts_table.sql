-- Tabela para gerenciar todos os textos editáveis do site
-- Permite que o usuário personalize 100% do conteúdo via painel admin

CREATE TABLE IF NOT EXISTS site_texts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,           -- Chave única (ex: "hero.title", "header.creci")
  value TEXT NOT NULL,                 -- Valor do texto
  category TEXT NOT NULL,              -- Categoria (ui, content, navigation, marketing, system)
  section TEXT,                        -- Seção do site (header, hero, services, contact, footer, etc)
  description TEXT,                    -- Descrição para o admin entender o contexto
  default_value TEXT NOT NULL,         -- Valor padrão (fallback)
  is_html BOOLEAN DEFAULT false,       -- Se aceita HTML
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_site_texts_key ON site_texts(key);
CREATE INDEX IF NOT EXISTS idx_site_texts_category ON site_texts(category);
CREATE INDEX IF NOT EXISTS idx_site_texts_section ON site_texts(section);

-- RLS Policies
ALTER TABLE site_texts ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública (necessário para o site)
DROP POLICY IF EXISTS "Textos públicos para leitura" ON site_texts;
CREATE POLICY "Textos públicos para leitura"
  ON site_texts FOR SELECT
  TO public
  USING (true);

-- Política para edição apenas por usuários autenticados
DROP POLICY IF EXISTS "Apenas autenticados podem editar textos" ON site_texts;
CREATE POLICY "Apenas autenticados podem editar textos"
  ON site_texts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_site_texts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_site_texts_updated_at_trigger ON site_texts;
CREATE TRIGGER update_site_texts_updated_at_trigger
  BEFORE UPDATE ON site_texts
  FOR EACH ROW
  EXECUTE FUNCTION update_site_texts_updated_at();
