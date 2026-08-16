-- Fix plans RLS: FOR ALL ... USING only covers SELECT/UPDATE/DELETE.
-- INSERT requires WITH CHECK. Without it, superadmin gets 403 on POST.

DROP POLICY IF EXISTS "Superadmin manage plans" ON public.plans;
CREATE POLICY "Superadmin manage plans" ON public.plans FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

NOTIFY pgrst, 'reload schema';
