
-- "Master Key" Access (Chave Mestra) for Super Admins
-- This version DYNAMICALLY finds all tables in the public schema
-- and applies the superadmin policy. No more "table not found" errors.

DO $$
DECLARE
    t text;
BEGIN
    -- Loop through all tables in the 'public' schema
    FOR t IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        -- 1. Enable RLS (Safe to run multiple times)
        EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY;', t);
        
        -- 2. Drop existing superadmin policy if it exists
        EXECUTE format('DROP POLICY IF EXISTS "Superadmin Master Key" ON %I;', t);
        
        -- 3. Create the Master Key Policy
        -- This allows 'superadmin' role (from profiles) to do ANY operation
        EXECUTE format('
            CREATE POLICY "Superadmin Master Key" ON %I
            FOR ALL
            USING (
                (SELECT role FROM profiles WHERE id = auth.uid()) = ''superadmin''
            )
            WITH CHECK (
                (SELECT role FROM profiles WHERE id = auth.uid()) = ''superadmin''
            );
        ', t);
        
        RAISE NOTICE 'Chave Mestra aplicada na tabela: %', t;
    END LOOP;
END $$;
