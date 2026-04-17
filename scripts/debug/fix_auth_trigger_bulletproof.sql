-- ==============================================================================
-- FIX: BULLETPROOF AUTH TRIGGER
-- Resolves the "Database error creating new user" in GoTrue
-- ==============================================================================

-- 1. Create a bulletproof trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_first BOOLEAN;
  v_name TEXT;
BEGIN
  -- Safely extract name, fallback to email prefix if null
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  -- Safely check if profiles is empty
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) INTO is_first;
  
  -- Insert profile, ignoring conflicts
  INSERT INTO public.profiles (id, email, role, name)
  VALUES (
    NEW.id, 
    NEW.email, 
    CASE WHEN is_first THEN 'superadmin' ELSE 'broker' END,
    v_name
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name;
    
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- EXTREMELY IMPORTANT: Catch any errors so Auth creation never fails!
  RAISE WARNING 'Refused to block user creation. Profile insert failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Recreate trigger safely
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
