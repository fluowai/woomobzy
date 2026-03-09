
-- 1. Add 'integrations' column to existing 'site_settings' table if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'site_settings' and column_name = 'integrations') then
    alter table site_settings add column integrations jsonb default '{}'::jsonb;
  end if;
end $$;

-- 2. Ensure RLS is enabled
alter table site_settings enable row level security;

-- 3. Update Policies for Single Tenant (Authenticated Users can Update)

-- Drop complex policies if they were accidentally created by the previous script
drop policy if exists "Users can view their organization settings" on site_settings;
drop policy if exists "Users can update their organization settings" on site_settings;
drop policy if exists "Users can insert their organization settings" on site_settings;

-- Re-apply simple policies matching 'supabase_schema.sql' style

-- Allow everyone to read settings (for the public website to work)
drop policy if exists "Allow public read access to settings" on site_settings;
create policy "Allow public read access to settings"
  on site_settings for select
  to public
  using (true);

-- Allow any authenticated user to update settings (Simpler for single-tenant admin)
drop policy if exists "Allow authenticated update to settings" on site_settings;
create policy "Allow authenticated update to settings"
  on site_settings for update
  to authenticated
  using (true)
  with check (true);

-- Allow insert just in case (though one row usually exists)
drop policy if exists "Allow authenticated insert to settings" on site_settings;
create policy "Allow authenticated insert to settings"
  on site_settings for insert
  to authenticated
  with check (true);
