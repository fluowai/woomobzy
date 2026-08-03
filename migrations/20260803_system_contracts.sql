-- Criação da tabela system_contracts para o Mega Admin
CREATE TABLE IF NOT EXISTS public.system_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    contract_type TEXT CHECK (contract_type IN ('reseller', 'agency')),
    status TEXT CHECK (status IN ('draft', 'pending_signature', 'active', 'terminated')),
    contratada_details JSONB,
    contratante_details JSONB,
    product_version TEXT,
    use_sector TEXT,
    ip_modality TEXT CHECK (ip_modality IN ('saas', 'lifetime', 'restricted_code', 'assignment')),
    production_domain TEXT,
    staging_domains TEXT,
    usage_limits TEXT,
    start_date DATE,
    end_date DATE,
    renewal_type TEXT,
    setup_fee NUMERIC,
    setup_milestones TEXT,
    monthly_fee NUMERIC,
    payment_periodicity TEXT,
    cloud_fees TEXT,
    support_included BOOLEAN DEFAULT true,
    readjustment_index TEXT,
    early_termination_penalty TEXT,
    domain_validation TEXT,
    special_assignment TEXT,
    official_contacts JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.system_contracts ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Super admin pode ver e gerenciar todos os contratos
CREATE POLICY "Super admins podem gerenciar todos os contratos"
    ON public.system_contracts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

-- Trigger de updated_at (assumindo que a function handle_updated_at já existe, o que é padrão)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_system_contracts') THEN
        CREATE TRIGGER set_updated_at_system_contracts
            BEFORE UPDATE ON public.system_contracts
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;
