-- RPC to resolve tenant by either platform_domain or custom_domain
create or replace function get_tenant_by_any_domain(domain_input text)
returns table (
  id uuid, 
  name text, 
  slug text, 
  plan_id uuid, 
  custom_domain text,
  platform_domain text,
  domain_type text
)
security definer
set search_path = public
as $$
begin
  return query
  select 
    o.id, 
    o.name, 
    o.slug, 
    o.plan_id, 
    o.custom_domain,
    o.platform_domain,
    case 
      when lower(o.platform_domain) = lower(trim(domain_input)) then 'platform'
      else 'site'
    end as domain_type
  from organizations o
  where lower(o.custom_domain) = lower(trim(domain_input))
     or lower(o.platform_domain) = lower(trim(domain_input))
  limit 1;
end;
$$ language plpgsql;

grant execute on function get_tenant_by_any_domain(text) to anon, authenticated, service_role;
