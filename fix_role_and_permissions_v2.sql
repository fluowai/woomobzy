
-- MEGA FIX DE PERMISSÕES E ROLE (V2)
-- Objetivos:
-- 1. Forçar role 'superadmin' na tabela profiles
-- 2. Forçar role 'superadmin' nos metadados do auth.users (caso haja triggers de sync)
-- 3. Liberar RLS da tabela filters/profiles para garantir leitura

DO $$
DECLARE
    target_email text := 'fluowai@gmail.com';
    user_id uuid;
BEGIN
    -- 1. Pegar ID do usuário
    SELECT id INTO user_id FROM auth.users WHERE email = target_email;

    IF user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário % não encontrado!', target_email;
    END IF;

    RAISE NOTICE 'Encontrado usuário ID: %', user_id;

    -- 2. Atualizar Tabela PROFILES (Força Bruta)
    UPDATE profiles 
    SET role = 'superadmin'
    WHERE id = user_id;

    RAISE NOTICE 'Role atualizada na tabela profiles.';

    -- 3. Atualizar Metadados do AUTH.USERS (Para evitar sobrescrita por triggers)
    UPDATE auth.users
    SET raw_user_meta_data = 
        COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "superadmin"}'::jsonb
    WHERE id = user_id;
    
    UPDATE auth.users
    SET raw_app_meta_data = 
        COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "superadmin"}'::jsonb
    WHERE id = user_id;

    RAISE NOTICE 'Metadados do Auth atualizados.';

    -- 4. Garantir Acesso à Tabela Profiles
    -- Habilita RLS
    ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
    
    -- Remove política restritiva antiga se houver duvida
    DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
    
    -- Cria política permissiva para leitura do próprio perfil
    CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT
    USING ( auth.uid() = id );
    
    -- Cria política de Chave Mestra para SuperAdmin ver TODOS os perfis (já estava no outro script, mas reforçando)
    DROP POLICY IF EXISTS "Superadmin Master Key" ON profiles;
    CREATE POLICY "Superadmin Master Key" ON profiles
    FOR ALL
    USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' )
    WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' );

    RAISE NOTICE 'Políticas de segurança (RLS) atualizadas.';

END $$;
