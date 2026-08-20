/**
 * server/lib/organization-deletion.js
 *
 * Helpers compartilhados para excluir organizações com todas as dependências
 * de forma segura (evita violações de FK que geravam 500).
 *
 * Estratégia:
 * 1. unlinkKnownOrganizationReferences: desvincula as referências opcionais
 *    conhecidas via Supabase (profiles, storage, calls, domains, ...).
 * 2. deleteOrganizationsWithDirectDb: fallback transacional via conexão
 *    direta ao Postgres que percorre TODAS as FKs apontando para
 *    organizations e deleta/seta NULL dinamicamente antes de remover a org.
 */

import pg from 'pg';
import { getSupabaseServer } from './supabase-server.js';

export async function unlinkKnownOrganizationReferences(ids) {
  const supabase = getSupabaseServer();
  await Promise.all([
    updateOptionalReference(supabase, 'profiles', 'organization_id', ids),
    updateOptionalReference(supabase, 'support_tickets', 'organization_id', ids),
    updateOptionalReference(supabase, 'storage_objects', 'tenant_id', ids),
    updateOptionalReference(supabase, 'call_sessions', 'tenant_id', ids),
    updateOptionalReference(supabase, 'call_recordings', 'tenant_id', ids),
    deleteOptionalReferenceRows(supabase, 'domains', 'organization_id', ids),
  ]);
}

async function updateOptionalReference(supabase, table, column, ids) {
  const { error } = await supabase
    .from(table)
    .update({ [column]: null })
    .in(column, ids);
  if (error && !isMissingOptionalRelation(error)) throw error;
}

async function deleteOptionalReferenceRows(supabase, table, column, ids) {
  const { error } = await supabase.from(table).delete().in(column, ids);
  if (error && !isMissingOptionalRelation(error)) throw error;
}

function isMissingOptionalRelation(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return (
    ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(code) ||
    /does not exist|could not find|schema cache/i.test(message)
  );
}

export function isForeignKeyError(error) {
  return (
    String(error?.code || '') === '23503' ||
    /foreign key|violates.*constraint|still referenced/i.test(
      String(error?.message || '')
    )
  );
}

export async function deleteOrganizationsWithDirectDb(ids) {
  const rawConnectionString = getDirectDatabaseUrl();
  const connectionString = normalizeDirectDatabaseUrl(rawConnectionString);
  if (!connectionString) {
    return {
      deleted: [],
      error: new Error(
        'Fallback Postgres indisponivel: configure DATABASE_URL ou SUPABASE_DB_URL.'
      ),
    };
  }

  const pool = new pg.Pool({
    connectionString,
    ssl: shouldUseSsl(rawConnectionString)
      ? { rejectUnauthorized: false }
      : false,
    max: 1,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 5000,
  });

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const fkResult = await client.query(`
      SELECT
        ns.nspname AS schema_name,
        rel.relname AS table_name,
        attr.attname AS column_name,
        attr.attnotnull AS not_null,
        con.confdeltype AS delete_action
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = rel.relnamespace
      JOIN LATERAL unnest(con.conkey) AS cols(attnum) ON true
      JOIN pg_attribute attr ON attr.attrelid = con.conrelid AND attr.attnum = cols.attnum
      WHERE con.contype = 'f'
        AND con.confrelid = 'public.organizations'::regclass
        AND array_length(con.conkey, 1) = 1
    `);

    for (const row of fkResult.rows) {
      // PostgreSQL confdeltype: c=cascade, n=set null, d=set default, a=no action, r=restrict.
      if (!['a', 'r'].includes(row.delete_action)) continue;

      const tableName = `${quoteIdent(row.schema_name)}.${quoteIdent(row.table_name)}`;
      const columnName = quoteIdent(row.column_name);

      if (row.not_null) {
        await client.query(
          `DELETE FROM ${tableName} WHERE ${columnName} = ANY($1::uuid[])`,
          [ids]
        );
      } else {
        await client.query(
          `UPDATE ${tableName} SET ${columnName} = NULL WHERE ${columnName} = ANY($1::uuid[])`,
          [ids]
        );
      }
    }

    const deleted = await client.query(
      'DELETE FROM public.organizations WHERE id = ANY($1::uuid[]) RETURNING id',
      [ids]
    );

    await client.query('COMMIT');
    return { deleted: deleted.rows, error: null };
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    return { deleted: [], error };
  } finally {
    if (client) client.release();
    await pool.end().catch(() => {});
  }
}

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function normalizeDirectDatabaseUrl(connectionString) {
  if (!connectionString) return '';

  try {
    const url = new URL(connectionString);
    // The pg connection-string parser may turn sslmode=require into certificate
    // verification. We pass SSL options explicitly to support Supabase pooler certs.
    url.searchParams.delete('sslmode');
    return url.toString();
  } catch {
    return connectionString;
  }
}

export function getDirectDatabaseUrl() {
  return (
    [
      'DATABASE_URL',
      'SUPABASE_DB_URL',
      'DATABASE_PRIVATE_URL',
      'POSTGRES_URL',
      'POSTGRES_PRIVATE_URL',
      'POSTGRES_PRISMA_URL',
      'POSTGRES_URL_NON_POOLING',
      'POSTGRESQL_URL',
      'PGDATABASE_URL',
      'PG_URL',
      'DB_URL',
    ]
      .map((key) => String(process.env[key] || '').trim())
      .find(Boolean) || ''
  );
}

export function shouldUseSsl(connectionString) {
  if (process.env.PGSSLMODE === 'disable') return false;
  if (process.env.NODE_ENV === 'production') return true;
  return /supabase\.(co|com)|pooler\.supabase\.com|sslmode=require/i.test(
    connectionString
  );
}