-- 1. DIAGNÓSTICO DE COLUNAS
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'properties';

-- 2. RECARREGAR CACHE DO POSTGREST (Opcional, mas ajuda no Supabase)
NOTIFY pgrst, 'reload schema';

-- 3. GARANTIR QUE A COLUNA FEATURES EXISTE
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'properties'::regclass AND attname = 'features') THEN
        ALTER TABLE properties ADD COLUMN features JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;
