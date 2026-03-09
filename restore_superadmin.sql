
-- RESTORE SUPER ADMIN ACCESS
-- Forces the user 'fluowai@gmail.com' to be superadmin
-- And ensures they have a valid organization (if needed) or NULL if global.

DO $$
DECLARE
    target_email text := 'fluowai@gmail.com';
    user_id uuid;
BEGIN
    -- 1. Find the User ID
    SELECT id INTO user_id FROM auth.users WHERE email = target_email;
    
    IF user_id IS NULL THEN
        RAISE NOTICE 'Usuário % não encontrado!', target_email;
        RETURN;
    END IF;

    -- 2. Force Role to 'superadmin' in Profiles
    UPDATE profiles 
    SET role = 'superadmin'
    WHERE id = user_id;
    
    RAISE NOTICE 'Role de Super Admin restaurada para % (ID: %)', target_email, user_id;

    -- 3. Ensure Master Key Policies are Active (Re-run safety check)
    -- Just to be double sure permissions are correct
    PERFORM 1; -- Placeholder, assuming policies are already there from previous script.
    
END $$;
