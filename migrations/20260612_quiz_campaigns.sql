CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS campaign TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS classification TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ai_profile JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.quiz_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  property_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  whatsapp_number TEXT NOT NULL,
  qualification_threshold INTEGER NOT NULL DEFAULT 70 CHECK (qualification_threshold BETWEEN 0 AND 100),
  intro_title TEXT NOT NULL,
  intro_copy TEXT NOT NULL,
  success_message TEXT NOT NULL,
  disqualification_message TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS quiz_campaigns_public_slug_key
  ON public.quiz_campaigns (slug)
  WHERE status <> 'archived';

CREATE TABLE IF NOT EXISTS public.quiz_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.quiz_campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  qualification_status TEXT NOT NULL CHECK (qualification_status IN ('qualified', 'nurture')),
  disqualification_reasons TEXT[] NOT NULL DEFAULT '{}',
  utm JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quiz_campaigns_org_status_idx
  ON public.quiz_campaigns (organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS quiz_submissions_campaign_created_idx
  ON public.quiz_submissions (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quiz_submissions_org_qualification_idx
  ON public.quiz_submissions (organization_id, qualification_status, created_at DESC);

ALTER TABLE public.quiz_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quiz_campaigns_tenant_select ON public.quiz_campaigns;
CREATE POLICY quiz_campaigns_tenant_select ON public.quiz_campaigns
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS quiz_campaigns_tenant_write ON public.quiz_campaigns;
CREATE POLICY quiz_campaigns_tenant_write ON public.quiz_campaigns
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS quiz_submissions_tenant_select ON public.quiz_submissions;
CREATE POLICY quiz_submissions_tenant_select ON public.quiz_submissions
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DO $$
DECLARE
  oka_org_id UUID;
BEGIN
  SELECT id INTO oka_org_id
  FROM public.organizations
  WHERE lower(slug) = 'okaimoveis'
     OR lower(custom_domain) IN ('okaimoveis.com.br', 'www.okaimoveis.com.br')
  ORDER BY created_at ASC
  LIMIT 1;

  IF oka_org_id IS NOT NULL THEN
    INSERT INTO public.quiz_campaigns (
      organization_id,
      title,
      slug,
      property_label,
      status,
      whatsapp_number,
      qualification_threshold,
      intro_title,
      intro_copy,
      success_message,
      disqualification_message,
      questions,
      branding
    ) VALUES (
      oka_org_id,
      'Campanha locação - 3 quartos em Colorado',
      'locacao-3-quartos-colorado',
      'Imóvel de 3 quartos com suíte no centro de Colorado/PR',
      'active',
      '5544997223030',
      70,
      'Este imóvel combina com o momento da sua família?',
      'Responda algumas perguntas rápidas. A OKA usa suas respostas para confirmar se esta locação faz sentido antes de encaminhar você ao atendimento.',
      'Seu perfil é compatível com esta oportunidade. Vamos continuar pelo WhatsApp para confirmar disponibilidade e visita.',
      'Neste momento, não temos um imóvel disponível que corresponda ao seu perfil. Seus dados ficaram registrados para futuras oportunidades da OKA.',
      $questions$[
        {"id":"intent","label":"Você procura um imóvel para morar em Colorado/PR?","type":"single","required":true,"options":[{"value":"yes","label":"Sim, quero morar em Colorado","score":20},{"value":"moving","label":"Estou me mudando para Colorado a trabalho","score":20},{"value":"no","label":"Não, procuro em outra cidade","score":0,"disqualify":true,"reason":"Não pretende morar em Colorado/PR"}]},
        {"id":"household","label":"Para quantas pessoas seria o imóvel?","type":"single","required":true,"options":[{"value":"1","label":"1 pessoa","score":4},{"value":"2-3","label":"2 a 3 pessoas","score":10},{"value":"4-5","label":"4 a 5 pessoas","score":10},{"value":"6+","label":"6 pessoas ou mais","score":5}]},
        {"id":"bedrooms","label":"Você precisa de 3 quartos?","type":"single","required":true,"options":[{"value":"3+","label":"Sim, 3 quartos ou mais","score":15},{"value":"2","label":"Não, 2 quartos seriam suficientes","score":0,"disqualify":true,"reason":"Busca imóvel menor que 3 quartos"},{"value":"1","label":"Procuro kitnet ou 1 quarto","score":0,"disqualify":true,"reason":"Busca kitnet ou quarto"}]},
        {"id":"budget","label":"Qual faixa mensal de aluguel cabe no seu planejamento?","type":"single","required":true,"options":[{"value":"below-1000","label":"Abaixo de R$ 1.000","score":0,"disqualify":true,"reason":"Faixa de aluguel abaixo de R$ 1.000"},{"value":"1000-1299","label":"De R$ 1.000 a R$ 1.299","score":4},{"value":"1300-2000","label":"De R$ 1.300 a R$ 2.000","score":20},{"value":"2001-3000","label":"De R$ 2.001 a R$ 3.000","score":20},{"value":"above-3000","label":"Acima de R$ 3.000","score":20}]},
        {"id":"move_time","label":"Quando pretende se mudar?","type":"single","required":true,"options":[{"value":"15","label":"Em até 15 dias","score":15},{"value":"30","label":"Em até 30 dias","score":15},{"value":"60","label":"Entre 31 e 60 dias","score":8},{"value":"later","label":"Depois de 60 dias ou sem prazo","score":0,"reason":"Sem urgência de mudança"}]},
        {"id":"income","label":"Você possui renda comprovável para o cadastro?","type":"single","required":true,"options":[{"value":"yes","label":"Sim","score":10},{"value":"guarantor","label":"Tenho responsável financeiro ou garantia","score":6},{"value":"no","label":"Não possuo renda ou responsável","score":0,"disqualify":true,"reason":"Sem condição mínima de cadastro"}]},
        {"id":"restrictions","label":"Existe alguma restrição de cadastro que a OKA precisa conhecer?","type":"single","required":true,"options":[{"value":"no","label":"Não","score":5},{"value":"yes","label":"Sim, prefiro explicar no atendimento","score":0,"reason":"Possui restrição de cadastro"}]},
        {"id":"garage","label":"Garagem é importante para você?","type":"single","required":true,"options":[{"value":"yes","label":"Sim","score":3},{"value":"no","label":"Não é essencial","score":1}]},
        {"id":"visit","label":"Se o imóvel estiver disponível, você quer agendar uma visita?","type":"single","required":true,"options":[{"value":"yes","label":"Sim, quero visitar","score":2},{"value":"details","label":"Quero receber mais detalhes primeiro","score":1},{"value":"no","label":"Ainda não","score":0}]}
      ]$questions$::jsonb,
      '{"primary":"#f04b12","charcoal":"#242424","muted":"#6d7178","background":"#faf8f5","logo":"/clients/oka/logo.jpeg"}'::jsonb
    )
    ON CONFLICT (organization_id, slug) DO NOTHING;
  END IF;
END $$;
