-- Execute esse script no SQL Editor do Supabase para permitir uploads

-- Habilita RLS na tabela de objetos do Storage (geralmente já vem habilitado)
alter table storage.objects enable row level security;

-- Política para permitir acesso PÚBLICO de visualização (download) caso o bucket não esteja marcado como público na UI
create policy "Public Access"
on storage.objects for select
to public
using ( bucket_id in ('agency-assets', 'property-images') );

-- Política CRÍTICA: Permitir UPLOAD (Insert) para qualquer pessoa (anon key)
-- ATENÇÃO: Em um sistema multi-tenant real, você restringiria isso apenas a usuários logados.
-- Como é um setup inicial/single-tenant, estamos liberando para facilitar o Wizard.
create policy "Allow Uploads"
on storage.objects for insert
to public
with check ( bucket_id in ('agency-assets', 'property-images') );

-- Política para permitir deletar imagens (caso queira substituir o logo ou remover foto)
create policy "Allow Deletes"
on storage.objects for delete
to public
using ( bucket_id in ('agency-assets', 'property-images') );
