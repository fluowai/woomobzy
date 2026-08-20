-- Habilitar RLS e policy para tabela properties
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_all_properties ON properties FOR ALL USING (true) WITH CHECK (true);