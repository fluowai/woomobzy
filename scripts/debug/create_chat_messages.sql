-- Create table for storing WhatsApp chat messages
create table if not exists chat_messages (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id),
  remote_jid text not null, -- The WhatsApp ID (e.g. 5511999999999@s.whatsapp.net)
  sender_name text,
  content text,
  from_me boolean default false,
  timestamp timestamptz default now(),
  status text default 'sent' -- sent, delivered, read
);

-- Index for faster queries by contact and time
create index if not exists idx_chat_messages_jid on chat_messages(remote_jid);
create index if not exists idx_chat_messages_org on chat_messages(organization_id);
create index if not exists idx_chat_messages_time on chat_messages(timestamp desc);

-- Enable RLS
alter table chat_messages enable row level security;

-- Policies (assuming single tenant or auth based on org)
create policy "Users can view their organization's messages"
  on chat_messages for select
  using ( organization_id = (select organization_id from profiles where id = auth.uid()) );

create policy "Users can insert messages (for sending)"
  on chat_messages for insert
  with check ( organization_id = (select organization_id from profiles where id = auth.uid()) );

-- Allow service role (server) to manage all
create policy "Service role can manage all messages"
  on chat_messages
  using ( true )
  with check ( true );
