-- Seed: Criar usuário admin padrão
-- Execute após as migrações principais

-- Criar usuário admin no auth.users (apenas se não existir)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) SELECT
  '00000000-0000-0000-0000-000000000000',
  '550e8400-e29b-41d4-a716-446655440000',
  'authenticated',
  'authenticated',
  'admin@imobzy.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Administrador IMOBZY"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE id = '550e8400-e29b-41d4-a716-446655440000'
);

-- Criar perfil do usuário (apenas se não existir)
INSERT INTO profiles (id, name, email, role)
SELECT '550e8400-e29b-41d4-a716-446655440000', 'Administrador IMOBZY', 'admin@imobzy.com', 'superadmin'
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE id = '550e8400-e29b-41d4-a716-446655440000'
);

-- Criar organização padrão (apenas se não existir)
INSERT INTO organizations (id, name, slug, status)
SELECT '550e8400-e29b-41d4-a716-446655440000', 'IMOBZY Demo', 'imobzy-demo', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM organizations WHERE id = '550e8400-e29b-41d4-a716-446655440000'
);

-- Vincular usuário à organização
UPDATE profiles
SET organization_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE id = '550e8400-e29b-41d4-a716-446655440000';