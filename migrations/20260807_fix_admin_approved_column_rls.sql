-- Corrige coluna `approved` ausente em profiles + RLS de admin por organizacao
-- Data: 2026-08-07
-- Contexto: views/admin/UserManagement.tsx envia { approved } / { role } via
--   supabase.from('profiles').update(...). A coluna `approved` nao existia em
--   profiles, entao o PATCH retornava 400 (coluna inexistente no schema cache)
--   e disparava "Error updating user". Alem disso, a unica policy de UPDATE
--   em profiles era self-only (auth.uid() = id), entao admin nao conseguia
--   alterar role/aprovacao de outros usuarios da propria organizacao.

-- 1. Coluna `approved` (backfill: usuarios existentes ficam aprovados)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false;

UPDATE public.profiles
   SET approved = true
 WHERE approved = false;

-- 2. Helper SECURITY DEFINER para checagem de admin/superadmin (evita RLS
--    recursivo no subquery inline e espelha o padrao de public.is_superadmin()).
CREATE OR REPLACE FUNCTION public.is_org_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  );
$$;

-- 3. RLS: admins/superadmins podem atualizar perfis da propria organizacao.
--    Impede escalada para 'superadmin' por quem nao e superadmin.
DROP POLICY IF EXISTS "Admins can update profiles in their organization" ON public.profiles;
CREATE POLICY "Admins can update profiles in their organization"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    public.is_org_admin()
    AND (
      organization_id = public.get_my_org_id()
      OR public.is_superadmin()
    )
  )
  WITH CHECK (
    public.is_org_admin()
    AND (
      organization_id = public.get_my_org_id()
      OR public.is_superadmin()
    )
    AND (
      role IS DISTINCT FROM 'superadmin'
      OR public.is_superadmin()
    )
  );

-- 4. Fecha brecha de escalada na policy pre-existente "Profiles isolation"
--    (FOR ALL sem WITH CHECK -> WITH CHECK implicito = USING, permitia que
--    qualquer membro da org alterasse role, inclusive para 'superadmin').
DROP POLICY IF EXISTS "Profiles isolation" ON public.profiles;
CREATE POLICY "Profiles isolation" ON public.profiles
  FOR ALL
  TO public
  USING (
    organization_id = public.get_my_org_id()
    OR id = auth.uid()
  )
  WITH CHECK (
    (
      organization_id = public.get_my_org_id()
      OR id = auth.uid()
    )
    AND (
      NOT (role IN ('admin', 'superadmin'))
      OR (role = 'admin' AND public.is_org_admin())
      OR public.is_superadmin()
    )
  );
