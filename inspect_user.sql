
-- INSPECT USER DATA
-- Run this to see exactly what is in the database for your email.
DO $$
DECLARE
    target_email text := 'fluowai@gmail.com';
    u record;
    p record;
BEGIN
    RAISE NOTICE '---------------------------------------------------';
    RAISE NOTICE 'INSPECTING USER: %', target_email;
    RAISE NOTICE '---------------------------------------------------';

    -- 1. Check Auth User
    SELECT * INTO u FROM auth.users WHERE email = target_email;
    
    IF u.id IS NULL THEN
        RAISE NOTICE '❌ User NOT FOUND in auth.users';
    ELSE
        RAISE NOTICE '✅ Found in auth.users (ID: %)', u.id;
        RAISE NOTICE '   Email: %', u.email;
        RAISE NOTICE '   Raw Meta: %', u.raw_user_meta_data;
        RAISE NOTICE '   App Meta: %', u.raw_app_meta_data;
    END IF;

    -- 2. Check Profile
    SELECT * INTO p FROM public.profiles WHERE id = u.id;
    
    IF p.id IS NULL THEN
        RAISE NOTICE '❌ User NOT FOUND in public.profiles';
    ELSE
        RAISE NOTICE '✅ Found in public.profiles';
        RAISE NOTICE '   Role: %', p.role;
        RAISE NOTICE '   Organization ID: %', p.organization_id;
    END IF;
    RAISE NOTICE '---------------------------------------------------';
END $$;
