-- ⚠️ ATENÇÃO: Isso apaga dados destas tabelas se elas já existirem!
-- Use apenas se estiver configurando do zero ou se puder limpar o histórico de mensagens/instâncias.
drop table if exists messages cascade;
drop table if exists contacts cascade;
drop table if exists instances cascade;

-- 1. Tabela de Instâncias (Conecta a Evolution API com a Organização/Empresa)
create table instances (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) not null,
  name text not null, -- Nome da instância na Evolution (ex: "empresa_x")
  status text default 'disconnected',
  server_url text, -- URL da API Evolution específica se houver
  token text, -- Token da API se necessário
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Garante que o nome da instância seja único globalmente
  constraint instances_name_key unique (name)
);

-- 2. Tabela de Contatos (Clientes do WhatsApp)
create table contacts (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) not null,
  instance_id uuid references instances(id),
  remote_jid text not null, -- ID do WhatsApp (número@s.whatsapp.net)
  push_name text, -- Nome de exibição
  profile_pic_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Um contato é único DENTRO de uma organização
  constraint contacts_org_jid_key unique (organization_id, remote_jid)
);

-- 3. Tabela de Mensagens
create table messages (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) not null,
  instance_id uuid references instances(id),
  contact_id uuid references contacts(id),
  
  key_id text, -- ID da mensagem no WhatsApp
  message_id text, -- ID interno da Evolution
  
  content text, 
  media_url text,
  media_type text, -- image, video, audio, document, text
  
  from_me boolean default false,
  status text default 'pending', -- pending, sent, delivered, read
  timestamp timestamptz default now(),
  
  raw_payload jsonb, -- Guardar payload original por segurança/debug
  
  created_at timestamptz default now()
);

-- Índices para performance
create index idx_messages_org on messages(organization_id);
create index idx_messages_contact on messages(contact_id);
create index idx_messages_timestamp on messages(timestamp desc);
create index idx_contacts_org on contacts(organization_id);
create index idx_instances_name on instances(name);

-- RLS (Row Level Security) - Segurança Multi-Tenant
alter table instances enable row level security;
alter table contacts enable row level security;
alter table messages enable row level security;

-- Políticas de Acesso
-- Usuário só vê dados da SUA organização

create policy "Users can view own organization instances"
  on instances for select
  using ( organization_id = (select organization_id from profiles where id = auth.uid()) );

create policy "Users can view own organization contacts"
  on contacts for select
  using ( organization_id = (select organization_id from profiles where id = auth.uid()) );

create policy "Users can view own organization messages"
  on messages for select
  using ( organization_id = (select organization_id from profiles where id = auth.uid()) );

-- Service Role (Backend) tem acesso total
create policy "Service role manages instances" on instances using (true) with check (true);
create policy "Service role manages contacts" on contacts using (true) with check (true);
create policy "Service role manages messages" on messages using (true) with check (true);
