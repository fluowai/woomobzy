-- CONFIGURAÇÕES INICIAIS LANDING PAGES
-- Garante que o schema cache do PostgREST seja atualizado
NOTIFY pgrst, 'reload schema';

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_org ON landing_pages(organization_id);
