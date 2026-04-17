
-- 1. Garante que a tabela existe
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  status TEXT DEFAULT 'Novo',
  source TEXT DEFAULT 'Site',
  property_id UUID, -- Removida FK estrita temporariamente para evitar erro se imóvel não existir
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilita RLS (Segurança)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- 3. REMOVE TODAS AS POLÍTICAS ANTIGAS (Limpeza geral para evitar conflitos)
DROP POLICY IF EXISTS "Allow public insert to leads" ON leads;
DROP POLICY IF EXISTS "Allow authenticated full access to leads" ON leads;
DROP POLICY IF EXISTS "Public select" ON leads;
DROP POLICY IF EXISTS "Public insert" ON leads;

-- 4. CRIA AS NOVAS POLÍTICAS CORRETAS

-- Permitir que QUALQUER UM (anon) insira dados (Formulário do Site)
CREATE POLICY "Public insert"
ON leads FOR INSERT
TO public, anon, authenticated
WITH CHECK (true);

-- Permitir que usuários LOGADOS (authenticated) vejam e editem tudo (Admin Panel)
CREATE POLICY "Authenticated full access"
ON leads FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- (Opcional) Permitir leitura pública se quiser debug (mas idealmente não)
-- CREATE POLICY "Public read" ON leads FOR SELECT TO public USING (true);
