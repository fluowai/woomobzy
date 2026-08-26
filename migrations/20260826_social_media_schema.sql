-- Migration: Social Media Scheduling Schema
-- Description: Adds tables for OAuth connections (social_accounts) and scheduled posts (social_posts).

CREATE TABLE public.social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    platform TEXT NOT NULL, -- e.g., 'facebook', 'instagram'
    account_id TEXT NOT NULL, -- ID on the social platform
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, platform, account_id)
);

CREATE TABLE public.social_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    content TEXT,
    media_urls JSONB, -- Array of media URLs
    platforms JSONB, -- Array of target platforms e.g. ['facebook', 'instagram']
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- social_accounts policies
CREATE POLICY "Users can view social accounts of their organization"
    ON public.social_accounts FOR SELECT
    USING (org_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert social accounts for their organization"
    ON public.social_accounts FOR INSERT
    WITH CHECK (org_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    ));

CREATE POLICY "Users can update social accounts of their organization"
    ON public.social_accounts FOR UPDATE
    USING (org_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    ));

CREATE POLICY "Users can delete social accounts of their organization"
    ON public.social_accounts FOR DELETE
    USING (org_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    ));

-- social_posts policies
CREATE POLICY "Users can view social posts of their organization"
    ON public.social_posts FOR SELECT
    USING (org_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert social posts for their organization"
    ON public.social_posts FOR INSERT
    WITH CHECK (org_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update social posts of their organization"
    ON public.social_posts FOR UPDATE
    USING (org_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete social posts of their organization"
    ON public.social_posts FOR DELETE
    USING (org_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    ));
