-- Execute este script no SQL Editor do Supabase para corrigir o erro de salvamento

-- Remove a política antiga restritiva (se existir)
DROP POLICY IF EXISTS "Allow authenticated update to settings" ON site_settings;
DROP POLICY IF EXISTS "Allow public read access to settings" ON site_settings;

-- Cria uma política permitindo LEITURA para todos (Público)
CREATE POLICY "Enable read access for all users"
ON site_settings FOR SELECT
TO public
USING (true);

-- Cria uma política permitindo ATUALIZAÇÃO para todos (Público) -> Necessário para o Salvar funcionar sem login
CREATE POLICY "Enable update access for all users"
ON site_settings FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Cria uma política permitindo INSERÇÃO para todos (Público) -> Necessário para o primeiro salvamento
CREATE POLICY "Enable insert access for all users"
ON site_settings FOR INSERT
TO public
WITH CHECK (true);
