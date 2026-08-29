import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { Client } = pg;
const rawUrl = process.env.DATABASE_URL || '';
const cleanUrl = rawUrl.replace(/\?.*$/, '');
const client = new Client({
  connectionString: cleanUrl,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const q = async (label, sql, params = []) => {
  try {
    const r = await client.query(sql, params);
    console.log(`\n=== ${label} ===`);
    console.dir(r.rows, { depth: null });
  } catch (e) {
    console.log(`\n=== ${label} === ERROR:`, e.message);
  }
};

console.log('SUPABASE URL:', (process.env.VITE_SUPABASE_URL || '').split('.')[0] || 'n/a');

try {
  const { error, count } = await supabase.from('organizations').select('*', { count: 'exact', head: true });
  console.log('org count via supabase:', count, error?.message || '');
} catch (e) {
  console.log('org count via supabase ERROR:', e.message);
}

await q('ORGANIZATIONS: total/type/is_reseller/status', `
  SELECT count(*) AS total,
    count(*) FILTER (WHERE type IS NOT NULL) AS has_type,
    type,
    is_reseller,
    status
  FROM organizations
  GROUP BY type, is_reseller, status
  ORDER BY type NULLS LAST, status, is_reseller
`);

await q('ORGANIZATIONS: amostra', `
  SELECT id, name, slug, status, is_reseller, type, niche, owner_name, owner_email, plan_id, parent_id, created_at
  FROM organizations
  ORDER BY created_at
  LIMIT 15
`);

await q('ORGANIZATIONS: hierarquia (parent->children)', `
  SELECT p.id AS parent_id, p.name AS parent_name, p.is_reseller, p.type AS parent_type,
    count(c.id) AS children, count(c.id) FILTER (WHERE c.is_reseller) AS reseller_children
  FROM organizations p
  LEFT JOIN organizations c ON c.parent_id = p.id
  GROUP BY p.id, p.name, p.is_reseller, p.type
  HAVING count(c.id) > 0
  ORDER BY children DESC
`);

await q('PROFILES: por role + org', `
  SELECT pr.role, count(*) AS total,
    count(*) FILTER (WHERE pr.organization_id IS NOT NULL) AS com_org,
    count(*) FILTER (WHERE pr.organization_id IS NULL) AS sem_org
  FROM profiles pr
  GROUP BY pr.role
  ORDER BY total DESC
`);

await q('PROFILES: admins de plataforma (possíveis donos do WooControl)', `
  SELECT id, email, role, organization_id, name
  FROM profiles
  WHERE lower(role) IN ('platform_owner','platform_admin','superadmin','megaadmin','super_admin','mega_admin','admin')
  ORDER BY role
  LIMIT 25
`);

const wooTables = [
  'woo_products',
  'woo_licenses',
  'woo_deployments',
  'woo_releases',
  'woo_snapshots',
  'woo_academy_courses',
  'woo_academy_certifications',
  'woo_audit_logs',
  'woo_support_sessions',
];
for (const t of wooTables) {
  await q(`${t}: contagem e amostra`, `
    SELECT count(*) AS total
    FROM ${t}
  `);
}

await q('PLANS: amostra', `
  SELECT id, name, is_default
  FROM plans
  LIMIT 10
`);

await q('PAYMENT_HISTORY: total e por status', `
  SELECT count(*) AS total, status, count(*) AS por_status
  FROM payment_history
  GROUP BY status
`);

await q('RLS: políticas em organizations', `
  SELECT polname, tablename
  FROM pg_policies
  WHERE tablename = 'organizations'
  ORDER BY polname
`);

await q('RLS: tabelas woo_* e RLS habilitado', `
  SELECT relname AS table_name, relrowsecurity AS rls_on
  FROM pg_class
  WHERE relname LIKE 'woo_%'
  ORDER BY relname
`);

await client.end();