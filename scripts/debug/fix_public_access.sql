
-- RPC SAFE FUNCTIONS PARA ACESSO PÚBLICO (Bypass RLS)

-- 1. Obter Tenant Público pelo Slug
-- Retorna apenas dados não sensíveis
create or replace function get_tenant_public(slug_input text)
returns table (id uuid, name text, slug text, plan_id uuid)
security definer -- Executa com permissões de quem criou (Admin), ignorando RLS do usuário anon
as $$
begin
  return query
  select o.id, o.name, o.slug, o.plan_id
  from organizations o
  where o.slug = slug_input 
  limit 1;
end;
$$ language plpgsql;

-- 2. Obter Configurações Públicas do Site (Logo, Cores, Titulo)
-- Retorna JSON simples, filtrando chaves de API secretas
create or replace function get_site_settings_public(org_id uuid)
returns json
security definer
as $$
declare
  data record;
begin
  select * into data
  from site_settings
  where organization_id = org_id
  limit 1;
  
  if not found then
    return null;
  end if;

  -- Retornar apenas campos seguros
  -- Ajuste os nomes das colunas conforme sua tabela real (assumindo jsonb 'appearance' ou colunas soltas)
  -- Se você usa colunas: logo_url, brand_color, etc.
  -- Se usa jsonb: appearance->>'logo', etc.
  
  -- Abaixo um exemplo genérico, tentando pegar colunas comuns ou retornar um subset seguro
  return json_build_object(
    'organization_id', data.organization_id,
    'logo', data.logo,  -- Verifique se a coluna se chama 'logo' ou 'logo_url'
    'primary_color', data.primary_color,
    'secondary_color', data.secondary_color,
    'site_title', data.site_title,
    'contact_email', data.contact_email,
    'contact_phone', data.contact_phone
  );
end;
$$ language plpgsql;

-- 3. Permitir leitura pública de Landing Pages publicadas (Rascunho apenas admin)
-- Se já existir policy, drop.
drop policy if exists "Public view published pages" on landing_pages;
create policy "Public view published pages"
  on landing_pages for select
  using ( status = 'published' );

-- 4. Garantir que anon pode executar as funções
grant execute on function get_tenant_public(text) to anon, authenticated, service_role;
grant execute on function get_site_settings_public(uuid) to anon, authenticated, service_role;
