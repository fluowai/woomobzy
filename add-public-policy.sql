-- Policy para permitir leitura via API anônima (corrige check-db 401)
CREATE POLICY public_select_properties ON properties FOR SELECT USING (true);

-- Verificar se a policy foi criada
SELECT polname, polcmd, polroles FROM pg_policies WHERE tablename = 'properties';