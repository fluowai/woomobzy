-- ============================================
-- Central de Licenciamento Wootech — Core Schema
-- Tabelas, índices e RLS do núcleo de licenciamento.
-- Relaciona-se com organizations (tenant) e plans.
-- Idempotente: pode ser executada mais de uma vez.
-- ============================================

-- ------------------------------------------------------------------------------
-- 1. LICENSES — licença-mãe por organização (tenant / whitelabel)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    license_key TEXT NOT NULL UNIQUE,
    plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
    signing_key_id TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'suspended', 'expired', 'revoked', 'blocked')),
    edition TEXT NOT NULL DEFAULT 'standard'
        CHECK (edition IN ('standard', 'pro', 'enterprise')),
    max_installations INTEGER NOT NULL DEFAULT 1,
    grace_days INTEGER NOT NULL DEFAULT 3,
    blocking_policy TEXT NOT NULL DEFAULT 'soft'
        CHECK (blocking_policy IN ('none', 'soft', 'hard')),
    issued_at TIMESTAMPTZ,
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    last_validated_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT licenses_org_unique UNIQUE (organization_id)
);

-- ------------------------------------------------------------------------------
-- 2. LICENSE_INSTALLATIONS — instalações registradas por licença
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.license_installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    installation_id UUID NOT NULL UNIQUE,
    installation_fingerprint TEXT NOT NULL UNIQUE,
    name TEXT,
    hostname TEXT,
    platform TEXT,
    version TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'revoked', 'blocked')),
    last_seen_at TIMESTAMPTZ,
    last_heartbeat_at TIMESTAMPTZ,
    last_ip TEXT,
    activated_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. LICENSE_DOMAINS — domínios vinculados à licença (site / painel)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.license_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'both'
        CHECK (purpose IN ('site', 'panel', 'both')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'verified', 'active', 'failed')),
    dns_verified BOOLEAN NOT NULL DEFAULT false,
    verified_at TIMESTAMPTZ,
    ssl_status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT license_domains_unique UNIQUE (license_id, domain)
);

-- ------------------------------------------------------------------------------
-- 4. LICENSE_ENTITLEMENTS — limites/features granulares (plano ou override)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.license_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    source TEXT NOT NULL DEFAULT 'plan'
        CHECK (source IN ('plan', 'override')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT license_entitlements_unique UNIQUE (license_id, key)
);

-- ------------------------------------------------------------------------------
-- 5. LICENSE_HEARTBEATS — log de heartbeats (observabilidade / anti-replay)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.license_heartbeats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    installation_id UUID NOT NULL REFERENCES public.license_installations(id) ON DELETE CASCADE,
    nonce TEXT NOT NULL UNIQUE,
    status TEXT,
    ip_address TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 6. LICENSE_AUDIT_EVENTS — auditoria à prova de adulteração (hash encadeado)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.license_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID REFERENCES public.licenses(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    installation_id UUID REFERENCES public.license_installations(id) ON DELETE SET NULL,
    actor_id UUID,
    action TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info'
        CHECK (severity IN ('info', 'warn', 'error', 'critical')),
    event_data JSONB DEFAULT '{}'::jsonb,
    previous_hash TEXT,
    event_hash TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- Índices de consulta
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_licenses_status ON public.licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_expires_at ON public.licenses(expires_at);
CREATE INDEX IF NOT EXISTS idx_license_installations_license ON public.license_installations(license_id);
CREATE INDEX IF NOT EXISTS idx_license_installations_status ON public.license_installations(status);
CREATE INDEX IF NOT EXISTS idx_license_installations_heartbeat ON public.license_installations(last_heartbeat_at);
CREATE INDEX IF NOT EXISTS idx_license_domains_license ON public.license_domains(license_id);
CREATE INDEX IF NOT EXISTS idx_license_domains_domain ON public.license_domains(domain);
CREATE INDEX IF NOT EXISTS idx_license_entitlements_license ON public.license_entitlements(license_id);
CREATE INDEX IF NOT EXISTS idx_license_heartbeats_license ON public.license_heartbeats(license_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_license_heartbeats_installation ON public.license_heartbeats(installation_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_license_audit_license ON public.license_audit_events(license_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_license_audit_hash ON public.license_audit_events(event_hash);

-- ------------------------------------------------------------------------------
-- Helper RLS: identidade do Mega Admin (espelha verifyMegaAdmin do backend)
--   superadmin SEM organização OU com organização não-reseller
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_mega_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'superadmin'
          AND (
              p.organization_id IS NULL
              OR EXISTS (
                  SELECT 1
                  FROM public.organizations o
                  WHERE o.id = p.organization_id
                    AND o.is_reseller = false
              )
          )
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_mega_admin() TO authenticated;

-- ------------------------------------------------------------------------------
-- RLS: habilitar em todas as tabelas de licenciamento
-- ------------------------------------------------------------------------------
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_audit_events ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- RLS: Mega Admin — acesso total a todas as tabelas de licenciamento
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Mega admin all licenses" ON public.licenses;
CREATE POLICY "Mega admin all licenses"
    ON public.licenses FOR ALL
    USING (public.is_mega_admin())
    WITH CHECK (public.is_mega_admin());

DROP POLICY IF EXISTS "Mega admin all license_installations" ON public.license_installations;
CREATE POLICY "Mega admin all license_installations"
    ON public.license_installations FOR ALL
    USING (public.is_mega_admin())
    WITH CHECK (public.is_mega_admin());

DROP POLICY IF EXISTS "Mega admin all license_domains" ON public.license_domains;
CREATE POLICY "Mega admin all license_domains"
    ON public.license_domains FOR ALL
    USING (public.is_mega_admin())
    WITH CHECK (public.is_mega_admin());

DROP POLICY IF EXISTS "Mega admin all license_entitlements" ON public.license_entitlements;
CREATE POLICY "Mega admin all license_entitlements"
    ON public.license_entitlements FOR ALL
    USING (public.is_mega_admin())
    WITH CHECK (public.is_mega_admin());

DROP POLICY IF EXISTS "Mega admin all license_heartbeats" ON public.license_heartbeats;
CREATE POLICY "Mega admin all license_heartbeats"
    ON public.license_heartbeats FOR ALL
    USING (public.is_mega_admin())
    WITH CHECK (public.is_mega_admin());

DROP POLICY IF EXISTS "Mega admin all license_audit_events" ON public.license_audit_events;
CREATE POLICY "Mega admin all license_audit_events"
    ON public.license_audit_events FOR ALL
    USING (public.is_mega_admin())
    WITH CHECK (public.is_mega_admin());

-- ------------------------------------------------------------------------------
-- RLS: Tenant (membro da organização) — leitura apenas dos próprios dados
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tenant read own licenses" ON public.licenses;
CREATE POLICY "Tenant read own licenses"
    ON public.licenses FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Tenant read own license_installations" ON public.license_installations;
CREATE POLICY "Tenant read own license_installations"
    ON public.license_installations FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Tenant read own license_domains" ON public.license_domains;
CREATE POLICY "Tenant read own license_domains"
    ON public.license_domains FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Tenant read own license_entitlements" ON public.license_entitlements;
CREATE POLICY "Tenant read own license_entitlements"
    ON public.license_entitlements FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Tenant read own license_heartbeats" ON public.license_heartbeats;
CREATE POLICY "Tenant read own license_heartbeats"
    ON public.license_heartbeats FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Tenant read own license_audit_events" ON public.license_audit_events;
CREATE POLICY "Tenant read own license_audit_events"
    ON public.license_audit_events FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- Notifica o PostgREST para recarregar o schema
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

SELECT 'Central de Licenciamento Wootech — schema aplicado com sucesso' AS result;
