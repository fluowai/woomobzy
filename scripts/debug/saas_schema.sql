-- ⚠️ ATENÇÃO: Isso apaga dados destas tabelas se elas já existirem!
drop table if exists plans cascade;
drop table if exists saas_settings cascade;

-- 1. Remover travas antigas para liberar edição
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles drop constraint if exists profiles_roles_check;

-- 2. Limpar Polices Antigas para evitar conflito
drop policy if exists "Superadmin view all organizations" on organizations;
drop policy if exists "Superadmin update all organizations" on organizations;
drop policy if exists "Everyone can view active plans" on plans;
drop policy if exists "Superadmin manage plans" on plans;
drop policy if exists "Superadmin manage settings" on saas_settings;

-- 3. Criar Tabela de Planos
create table plans (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  price decimal(10,2) not null,
  currency text default 'BRL',
  limits jsonb default '{}',
  features jsonb default '[]',
  is_active boolean default true,
  created_at timestamptz default now()
);

insert into plans (name, price, limits, features) values 
('Starter', 97.00, '{"users": 2, "properties": 50, "whatsapp_instances": 1}', '["crm", "site"]'),
('Pro', 197.00, '{"users": 10, "properties": 500, "whatsapp_instances": 3}', '["crm", "site", "ia_chat"]'),
('Enterprise', 497.00, '{"users": 999, "properties": 9999, "whatsapp_instances": 10}', '["crm", "site", "ia_chat", "api"]');

-- 4. Atualizar Colunas
alter table organizations add column if not exists plan_id uuid references plans(id);
alter table organizations add column if not exists status text default 'active'; 
alter table organizations add column if not exists subscription_data jsonb default '{}';
alter table organizations add column if not exists owner_email text;
alter table profiles add column if not exists role text default 'user';
alter table profiles add column if not exists organization_id uuid references organizations(id);

-- 5. DEFINIR SUPERADMIN
update profiles set role = 'superadmin' where email = 'fluowai@gmail.com';

-- 5.1 Adicionar suporte a Multi-tenancy nas tabelas existentes
alter table properties add column if not exists organization_id uuid references organizations(id);
alter table leads add column if not exists organization_id uuid references organizations(id);
alter table landing_pages add column if not exists organization_id uuid references organizations(id);

-- 6. Tabela de Configurações Globais
create table saas_settings (
  id int primary key default 1,
  global_evolution_api_key text,
  global_evolution_url text,
  global_openai_key text,
  global_gemini_key text,
  maintenance_mode boolean default false,
  check (id = 1)
);
insert into saas_settings (id) values (1) on conflict do nothing;

-- 7. Policies de Acesso (Agora recriadas limpas)
create policy "Superadmin view all organizations"
  on organizations for select
  using ( (select role from profiles where id = auth.uid()) = 'superadmin' );

create policy "Superadmin update all organizations"
  on organizations for update
  using ( (select role from profiles where id = auth.uid()) = 'superadmin' );

create policy "Everyone can view active plans"
  on plans for select
  using ( is_active = true or (select role from profiles where id = auth.uid()) = 'superadmin' );
  
create policy "Superadmin manage plans"
  on plans for all
  using ( (select role from profiles where id = auth.uid()) = 'superadmin' );

alter table saas_settings enable row level security;
create policy "Superadmin manage settings"
  on saas_settings for all
  using ( (select role from profiles where id = auth.uid()) = 'superadmin' );
