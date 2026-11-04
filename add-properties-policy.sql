-- Policy para tabela properties (corrige erro 401)
CREATE POLICY service_role_all_properties ON properties FOR ALL USING (true) WITH CHECK (true);