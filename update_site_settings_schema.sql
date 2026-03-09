
-- 1. Create table if not exists
create table if not exists site_settings (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references organizations(id),
  integrations jsonb default '{}'::jsonb,
  agency_name text,
  primary_color text,
  secondary_color text,
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(organization_id)
);

-- 2. Safe check to add extensions column if table exists without it
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'site_settings' and column_name = 'integrations') then
    alter table site_settings add column integrations jsonb default '{}'::jsonb;
  end if;
end $$;

-- 3. Enable RLS
alter table site_settings enable row level security;

-- 4. Create Policies (Drop first to avoid conflicts)
drop policy if exists "Users can view their organization settings" on site_settings;
create policy "Users can view their organization settings"
  on site_settings for select
  using ( 
    auth.uid() in ( 
      select user_id from organization_members where organization_id = site_settings.organization_id 
    ) 
    OR 
    organization_id in (
      select organization_id from organization_members where user_id = auth.uid()
    )
  );

drop policy if exists "Users can update their organization settings" on site_settings;
create policy "Users can update their organization settings"
  on site_settings for update
  using ( 
    organization_id in (
      select organization_id from organization_members where user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert their organization settings" on site_settings;
create policy "Users can insert their organization settings"
  on site_settings for insert
  with check ( 
    organization_id in (
      select organization_id from organization_members where user_id = auth.uid()
    )
  );
