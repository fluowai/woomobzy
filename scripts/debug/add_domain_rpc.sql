
-- RPC to resolve tenant by Custom Domain
create or replace function get_tenant_by_domain(domain_input text)
returns table (id uuid, name text, slug text, plan_id uuid, custom_domain text)
security definer
set search_path = public
as $$
begin
  return query
  select o.id, o.name, o.slug, o.plan_id, o.custom_domain
  from organizations o
  where lower(o.custom_domain) = lower(trim(domain_input))
  limit 1;
end;
$$ language plpgsql;

-- Grant permissions
grant execute on function get_tenant_by_domain(text) to anon, authenticated, service_role;
