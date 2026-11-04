-- Fix RLS Insert Policies for developments and condominiums

-- Drop existing policies if they don't have WITH CHECK
DROP POLICY IF EXISTS "Tenant isolation developments" ON public.developments;
CREATE POLICY "Tenant isolation developments" ON public.developments
USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Also check condominiums
DROP POLICY IF EXISTS "Tenant isolation condominiums" ON public.condominiums;
CREATE POLICY "Tenant isolation condominiums" ON public.condominiums
USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
