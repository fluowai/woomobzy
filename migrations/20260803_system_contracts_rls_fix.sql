-- Fix RLS policy for system_contracts to use correct role name
DROP POLICY IF EXISTS "Super admins podem gerenciar todos os contratos" ON public.system_contracts;

CREATE POLICY "Super admins podem gerenciar todos os contratos"
    ON public.system_contracts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'superadmin'
        )
    );
