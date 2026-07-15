#!/usr/bin/env bash
# Auditoria de RLS Supabase. Requer supabase CLI logado.
set -euo pipefail
if ! command -v supabase >/dev/null; then
  echo "❌ supabase CLI ausente. Instale: https://supabase.com/docs/guides/cli"; exit 1
fi
echo "▶ supabase db lint (falhas de segurança/policy)"
supabase db lint
echo "▶ Tabelas sem RLS habilitado:"
supabase db execute --linked <<'SQL'
select schemaname, tablename
from pg_tables
where schemaname = 'public'
  and tablename not in (
    select c.relname from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relrowsecurity = true
  )
order by tablename;
SQL
echo "▶ Tabelas com RLS habilitado mas SEM policies:"
supabase db execute --linked <<'SQL'
select c.relname as table
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public' and c.relrowsecurity = true
  and not exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename = c.relname)
order by c.relname;
SQL
