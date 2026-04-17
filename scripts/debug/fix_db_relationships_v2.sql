
-- 1. Garantir que a tabela 'plans' existe com a estrutura correta
CREATE TABLE IF NOT EXISTS plans (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  price decimal(10,2) not null,
  currency text default 'BRL',
  limits jsonb default '{}',
  features jsonb default '[]',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 2. Garantir que a coluna 'plan_id' existe na tabela 'organizations'
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_id uuid;

-- 3. Criar ou Recriar a Chave Estrangeira (Foreign Key)
-- PostgREST usa FKs para deduzir relacionamentos no JOIN
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_id_fkey;

ALTER TABLE organizations
    ADD CONSTRAINT organizations_plan_id_fkey
    FOREIGN KEY (plan_id)
    REFERENCES plans(id);

-- 4. Inserir planos básicos se a tabela estiver vazia
INSERT INTO plans (name, price, limits, features)
SELECT 'Starter', 97.00, '{"users": 2, "properties": 50, "whatsapp_instances": 1}', '["crm", "site"]'
WHERE NOT EXISTS (SELECT 1 FROM plans LIMIT 1);

INSERT INTO plans (name, price, limits, features)
SELECT 'Pro', 197.00, '{"users": 10, "properties": 500, "whatsapp_instances": 3}', '["crm", "site", "ia_chat"]'
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Pro');

-- 5. Recarregar o Schema Cache do PostgREST
-- Isso é CRITICO para o Supabase reconhecer a nova FK imediatamente
NOTIFY pgrst, 'reload config';
