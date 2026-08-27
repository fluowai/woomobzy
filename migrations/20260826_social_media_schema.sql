-- Migration: Social Media Scheduling Schema
-- Description: Adds tables for OAuth connections (social_accounts) and scheduled posts (social_posts).
-- Fixed: Uses profiles.organization_id for RLS (organization_members does not exist).

CREATE TABLE IF NOT EXISTS public.social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    account_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, platform, account_id)
);

CREATE TABLE IF NOT EXISTS public.social_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    content TEXT,
    media_urls JSONB,
    platforms JSONB,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_accounts_org ON public.social_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_org ON public.social_posts(org_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON public.social_posts(status, scheduled_for);

-- RLS
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Service role bypass
DROP POLICY IF EXISTS "Service role full access on social_accounts" ON public.social_accounts;
CREATE POLICY "Service role full access on social_accounts"
  ON public.social_accounts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access on social_posts" ON public.social_posts;
CREATE POLICY "Service role full access on social_posts"
  ON public.social_posts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- social_accounts: tenant isolation via profiles
DROP POLICY IF EXISTS "Tenant select social_accounts" ON public.social_accounts;
CREATE POLICY "Tenant select social_accounts"
    ON public.social_accounts FOR SELECT TO authenticated
    USING (org_id IN (
        SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
    ));

DROP POLICY IF EXISTS "Tenant insert social_accounts" ON public.social_accounts;
CREATE POLICY "Tenant insert social_accounts"
    ON public.social_accounts FOR INSERT TO authenticated
    WITH CHECK (org_id IN (
        SELECT p.organization_id FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
    ));

DROP POLICY IF EXISTS "Tenant update social_accounts" ON public.social_accounts;
CREATE POLICY "Tenant update social_accounts"
    ON public.social_accounts FOR UPDATE TO authenticated
    USING (org_id IN (
        SELECT p.organization_id FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
    ))
    WITH CHECK (org_id IN (
        SELECT p.organization_id FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
    ));

DROP POLICY IF EXISTS "Tenant delete social_accounts" ON public.social_accounts;
CREATE POLICY "Tenant delete social_accounts"
    ON public.social_accounts FOR DELETE TO authenticated
    USING (org_id IN (
        SELECT p.organization_id FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
    ));

-- social_posts: tenant isolation via profiles
DROP POLICY IF EXISTS "Tenant select social_posts" ON public.social_posts;
CREATE POLICY "Tenant select social_posts"
    ON public.social_posts FOR SELECT TO authenticated
    USING (org_id IN (
        SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
    ));

DROP POLICY IF EXISTS "Tenant insert social_posts" ON public.social_posts;
CREATE POLICY "Tenant insert social_posts"
    ON public.social_posts FOR INSERT TO authenticated
    WITH CHECK (org_id IN (
        SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
    ));

DROP POLICY IF EXISTS "Tenant update social_posts" ON public.social_posts;
CREATE POLICY "Tenant update social_posts"
    ON public.social_posts FOR UPDATE TO authenticated
    USING (org_id IN (
        SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
    ))
    WITH CHECK (org_id IN (
        SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
    ));

DROP POLICY IF EXISTS "Tenant delete social_posts" ON public.social_posts;
CREATE POLICY "Tenant delete social_posts"
    ON public.social_posts FOR DELETE TO authenticated
    USING (org_id IN (
        SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
    ));
