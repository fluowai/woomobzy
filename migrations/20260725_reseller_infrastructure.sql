CREATE TABLE IF NOT EXISTS public.reseller_infrastructure (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    domain TEXT NOT NULL UNIQUE,
    supabase_url TEXT,
    supabase_anon_key TEXT,
    supabase_service_role_key TEXT,
    minio_endpoint TEXT,
    minio_access_key TEXT,
    minio_secret_key TEXT,
    minio_bucket_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id)
);

ALTER TABLE public.reseller_infrastructure ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mega admin read all reseller_infrastructure"
    ON public.reseller_infrastructure FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.organizations o 
            WHERE o.id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) 
            AND o.is_reseller = false
        )
    );

CREATE POLICY "Mega admin insert reseller_infrastructure"
    ON public.reseller_infrastructure FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organizations o 
            WHERE o.id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) 
            AND o.is_reseller = false
        )
    );

CREATE POLICY "Mega admin update reseller_infrastructure"
    ON public.reseller_infrastructure FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.organizations o 
            WHERE o.id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) 
            AND o.is_reseller = false
        )
    );

CREATE POLICY "Mega admin delete reseller_infrastructure"
    ON public.reseller_infrastructure FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.organizations o 
            WHERE o.id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) 
            AND o.is_reseller = false
        )
    );

CREATE OR REPLACE VIEW public.public_tenant_discovery AS
SELECT 
    domain,
    supabase_url,
    supabase_anon_key
FROM 
    public.reseller_infrastructure
WHERE 
    is_active = true;
GRANT SELECT ON public.public_tenant_discovery TO anon;
GRANT SELECT ON public.public_tenant_discovery TO authenticated;
