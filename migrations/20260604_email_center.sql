-- Professional email center for ImobFluow.
-- Multi-tenant, Supabase-compatible schema with encrypted external mailbox credentials.

create extension if not exists pgcrypto;

create table if not exists email_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null,
  email text not null,
  encrypted_password text not null,
  imap_host text not null,
  imap_port integer not null default 993,
  imap_secure boolean not null default true,
  smtp_host text not null,
  smtp_port integer not null default 465,
  smtp_secure boolean not null default true,
  auth_method text not null default 'password',
  oauth_provider text,
  oauth_account_id text,
  last_inbox_uid bigint not null default 0,
  last_synced_at timestamptz,
  sync_status text not null default 'idle',
  sync_error text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, email)
);

alter table email_accounts add column if not exists auth_method text not null default 'password';
alter table email_accounts add column if not exists oauth_provider text;
alter table email_accounts add column if not exists oauth_account_id text;
alter table email_accounts add column if not exists last_inbox_uid bigint not null default 0;
alter table email_accounts add column if not exists sync_status text not null default 'idle';
alter table email_accounts add column if not exists sync_error text;
alter table email_accounts add column if not exists updated_at timestamptz not null default now();

create table if not exists emails (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  account_id uuid not null references email_accounts(id) on delete cascade,
  folder text not null default 'inbox',
  direction text not null default 'incoming',
  subject text,
  from_name text,
  from_email text,
  to_email text[] not null default '{}',
  cc_email text[] not null default '{}',
  body_html text,
  body_text text,
  preview text,
  date timestamptz,
  is_read boolean not null default false,
  is_archived boolean not null default false,
  message_id text,
  in_reply_to text,
  references_ids text[] not null default '{}',
  thread_id text not null,
  imap_uid bigint,
  lead_id uuid references leads(id) on delete set null,
  raw_headers jsonb not null default '{}',
  ai_metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table emails add column if not exists ai_metadata jsonb not null default '{}';
alter table emails add column if not exists updated_at timestamptz not null default now();

create table if not exists email_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid,
  account_id uuid references email_accounts(id) on delete cascade,
  email_id uuid references emails(id) on delete cascade,
  event_type text not null check (event_type in ('email_received', 'email_sent')),
  payload jsonb not null default '{}',
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists email_automation_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email_id uuid references emails(id) on delete cascade,
  job_type text not null,
  status text not null default 'queued',
  payload jsonb not null default '{}',
  result jsonb not null default '{}',
  run_after timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists email_accounts_org_user_email_idx
  on email_accounts (organization_id, user_id, lower(email));

create unique index if not exists emails_account_folder_uid_idx
  on emails (account_id, folder, imap_uid)
  where imap_uid is not null;

create unique index if not exists emails_account_message_folder_idx
  on emails (account_id, message_id, folder)
  where message_id is not null;

create index if not exists emails_org_folder_date_idx
  on emails (organization_id, folder, date desc);

create index if not exists emails_org_thread_idx
  on emails (organization_id, thread_id, date asc);

create index if not exists emails_org_lead_idx
  on emails (organization_id, lead_id)
  where lead_id is not null;

create index if not exists email_events_org_type_idx
  on email_events (organization_id, event_type, created_at desc);

alter table email_accounts enable row level security;
alter table emails enable row level security;
alter table email_events enable row level security;
alter table email_automation_jobs enable row level security;

drop policy if exists email_accounts_tenant_select on email_accounts;
create policy email_accounts_tenant_select on email_accounts
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.organization_id = email_accounts.organization_id
    )
  );

drop policy if exists emails_tenant_select on emails;
create policy emails_tenant_select on emails
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.organization_id = emails.organization_id
    )
  );

drop policy if exists email_events_tenant_select on email_events;
create policy email_events_tenant_select on email_events
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.organization_id = email_events.organization_id
    )
  );

drop policy if exists email_automation_jobs_tenant_select on email_automation_jobs;
create policy email_automation_jobs_tenant_select on email_automation_jobs
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.organization_id = email_automation_jobs.organization_id
    )
  );
