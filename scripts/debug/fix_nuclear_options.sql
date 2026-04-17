
-- NUCLEAR FIX FOR PROFILES (Desbloqueio Total)
-- Use isso para garantir que o perfil carregue, custe o que custar.

DO $$
DECLARE
    target_email text := 'fluowai@gmail.com';
    user_id uuid;
BEGIN
    -- 1. Identificar ID
    SELECT id INTO user_id FROM auth.users WHERE email = target_email;
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não encontrado!';
    END IF;

    -- 2. Garantir que a linha existe na tabela (UPSERT)
    INSERT INTO public.profiles (id, email, full_name, role, created_at)
    VALUES (
        user_id, 
        target_email, 
        'Super Admin Fluowai', 
        'superadmin', 
        NOW()
    )
    ON CONFLICT (id) DO UPDATE 
    SET role = 'superadmin',
        full_name = 'Super Admin Fluowai'; -- Força um nome para vermos a mudança

    RAISE NOTICE '✅ Perfil garantido na tabela.';

    -- 3. NUCLEAR RLS: Liberar geral para a tabela profiles (Temporário para teste)
    -- Isso remove todas as travas de segurança da tabela de perfis
    
    ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE '☢️ RLS DESATIVADO na tabela profiles (Leitura liberada).';
    
    -- Opcional: Se quiser manter RLS ativado mas permissivo:
    -- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    -- DROP POLICY IF EXISTS "Allow All" ON public.profiles;
    -- CREATE POLICY "Allow All" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

END $$;
