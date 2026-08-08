-- ============================================
-- Domínio por finalidade (site / painel) para whitelabels
-- Permite que o mega admin vincule um domínio a uma revenda
-- whitelabel e o classifique como site público ou painel (sistema).
-- ============================================

ALTER TABLE public.domains
    ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT 'site'
    CHECK (purpose IN ('site', 'panel', 'both'));

CREATE INDEX IF NOT EXISTS idx_organizations_platform_domain
    ON public.organizations (platform_domain);
