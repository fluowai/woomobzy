
-- 1. Garantir que a coluna de preço na tabela plans se chama price_monthly
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plans' AND column_name='price' AND table_schema='public') THEN
    ALTER TABLE public.plans RENAME COLUMN price TO price_monthly;
    RAISE NOTICE 'Coluna plans.price renomeada para price_monthly';
  END IF;
END $$;

-- 2. Garantir que organizations.plan_id seja do tipo UUID
-- Se for TEXT ou outro tipo, precisamos converter
DO $$
BEGIN
  -- Se a coluna existir e não for UUID, convertemos
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizations' AND column_name='plan_id' AND data_type != 'uuid' AND table_schema='public') THEN
    ALTER TABLE public.organizations ALTER COLUMN plan_id TYPE uuid USING plan_id::uuid;
  END IF;
END $$;

-- 3. Criar a Chave Estrangeira (Foreign Key)
-- Remove se já existir para evitar erro de duplicata
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_plan_id_fkey;

ALTER TABLE public.organizations 
  ADD CONSTRAINT organizations_plan_id_fkey 
  FOREIGN KEY (plan_id) 
  REFERENCES public.plans(id)
  ON DELETE SET NULL;

-- 4. Garantir permissões básicas para a tabela de planos
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on active plans" ON public.plans;
CREATE POLICY "Allow public read on active plans" 
  ON public.plans FOR SELECT 
  USING (is_active = true);

DROP POLICY IF EXISTS "Allow superadmins full access on plans" ON public.plans;
CREATE POLICY "Allow superadmins full access on plans" 
  ON public.plans FOR ALL 
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  );

-- 5. Recarregar o cache do PostgREST para o Supabase reconhecer o novo relacionamento
NOTIFY pgrst, 'reload config';
