
-- Adicionar coluna SLUG na tabela organizations
alter table organizations add column if not exists slug text unique;

-- Função para gerar slug a partir do nome (simples)
create or replace function generate_slug(name text) returns text as $$
begin
  return lower(regexp_replace(trim(name), '\s+', '-', 'g'));
end;
$$ language plpgsql;

-- Popular slugs para organizações existentes
-- Usamos 'on conflict do nothing' caso já exista algo (embora seja novo)
update organizations 
set slug = generate_slug(name)
where slug is null;

-- Index para busca rápida por slug (usado no Router)
create index if not exists idx_organizations_slug on organizations(slug);

-- Remover a função auxiliar se não for mais necessária (opcional, deixamos caso precise)
-- drop function generate_slug;
