-- Migration: Criar tabela para Leads de Captação de Imóveis
-- Data: 2026-08-21

-- Criação da tabela de captacao_leads
CREATE TABLE IF NOT EXISTS public.captacao_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    title TEXT NOT NULL,
    address TEXT,
    owner_name TEXT,
    owner_phone TEXT,
    owner_email TEXT,
    estimated_value NUMERIC,
    property_type TEXT DEFAULT 'Venda',
    status TEXT DEFAULT 'mapeado' NOT NULL,
    notes TEXT,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexação para busca rápida por organização
CREATE INDEX IF NOT EXISTS idx_captacao_leads_org_id ON public.captacao_leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_captacao_leads_status ON public.captacao_leads(status);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.captacao_leads ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Os usuários podem ver as captações da sua organização
CREATE POLICY "Usuários podem ver captações da sua organização" 
ON public.captacao_leads FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()
  )
);

-- Os usuários podem inserir captações na sua organização
CREATE POLICY "Usuários podem criar captações" 
ON public.captacao_leads FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()
  )
);

-- Os usuários podem atualizar captações da sua organização
CREATE POLICY "Usuários podem atualizar captações" 
ON public.captacao_leads FOR UPDATE 
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()
  )
);

-- Os usuários podem deletar captações da sua organização
CREATE POLICY "Usuários podem deletar captações" 
ON public.captacao_leads FOR DELETE 
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()
  )
);

-- Trigger para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION update_captacao_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_captacao_leads_modtime
BEFORE UPDATE ON public.captacao_leads
FOR EACH ROW EXECUTE PROCEDURE update_captacao_leads_updated_at();
