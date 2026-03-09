
-- SCHEMA DE IMPERSONATION E AUDITORIA
-- Execute este script no Supabase SQL Editor

-- 1. Tabela de Sessões de Impersonation
create table if not exists impersonation_sessions (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid not null references organizations(id),
  actor_user_id uuid not null references auth.users(id), -- Quem está acessando (Admin)
  impersonated_user_id uuid not null references auth.users(id), -- Quem está sendo acessado (Cliente)
  token_hash text, -- Hash do token para revogação (opcional, ou apenas controle de sessão)
  reason text,
  status text default 'active' check (status in ('active', 'revoked', 'expired')),
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

-- Index para buscar sessões ativas rapidamente
create index if not exists idx_impersonation_active on impersonation_sessions(actor_user_id, status);

-- 2. Tabela de Auditoria (Append-Only)
create table if not exists audit_logs (
  id uuid default gen_random_uuid() primary key,
  actor_id uuid references auth.users(id), -- Quem fez a ação
  target_resource text, -- Qual recurso foi afetado
  action text not null, -- Ex: 'IMPERSONATE_START', 'DELETE_TENANT', 'UPDATE_SETTINGS'
  details jsonb default '{}', -- Metadados (IP, User Agent, Diff)
  ip_address text,
  tenant_id uuid, -- Se aplicável
  created_at timestamptz default now()
);

-- Index para buscar logs por tempo
create index if not exists idx_audit_created_at on audit_logs(created_at desc);

-- 3. RLS Policies ( Segurança )

-- Impersonation Sessions: Apenas Super Admin pode ver/criar
alter table impersonation_sessions enable row level security;

create policy "Superadmin manage impersonation"
  on impersonation_sessions for all
  using ( 
    (select role from profiles where id = auth.uid()) = 'superadmin' 
  );

-- Audit Logs: Apenas Super Admin pode ver (ninguém edita/deleta - append only via API/Service Role)
alter table audit_logs enable row level security;

create policy "Superadmin view audit logs"
  on audit_logs for select
  using ( 
    (select role from profiles where id = auth.uid()) = 'superadmin' 
  );

-- Garantir que ninguém apague logs via API Client (apenas banco direto ou service role)
-- Não criamos policy de DELETE/UPDATE para audit_logs intencionalmente.

-- 4. Função Helper para verificar Admin (Backend usa isso ou faz via query direta)
create or replace function is_superadmin(user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from profiles 
    where id = user_id and role = 'superadmin'
  );
end;
$$ language plpgsql security definer;
