import 'dotenv/config';
import pg from 'pg';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'security-reports');
mkdirSync(outDir, { recursive: true });

const rawConnectionString =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL;

if (!rawConnectionString) {
  console.error('SUPABASE_DB_URL/DATABASE_URL ausente no .env');
  process.exit(1);
}

const connectionString = rawConnectionString
  .replace(/([?&])sslmode=[^&]*/, '$1')
  .replace(/[?&]$/, '');

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

const TABLES = [
  'organizations',
  'profiles',
  'plans',
  'leads',
  'clients',
  'messages',
  'invoices',
  'billing',
  'contracts',
  'documents',
  'support_tickets',
  'support_messages',
  'site_settings',
  'site_texts',
];

const report = { generated_at: new Date().toISOString(), tables: {} };

async function run() {
  try {
    const client = await pool.connect();

    // 1. RLS enabled + policies per table
    for (const t of TABLES) {
      const tableInfo = await client.query(
        `SELECT c.relrowsecurity, c.relforcerowsecurity
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = $1`,
        [t]
      );
      const policies = await client.query(
        `SELECT p.polname, p.polcmd,
                ARRAY(SELECT rolname FROM pg_roles WHERE oid = ANY(p.polroles)) AS roles,
                pg_get_expr(p.polqual, p.polrelid) AS qual,
                pg_get_expr(p.polwithcheck, p.polrelid) AS withcheck
         FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = $1`,
        [t]
      );
      const grants = await client.query(
        `SELECT grantee, privilege_type FROM information_schema.role_table_grants
         WHERE table_schema = 'public' AND table_name = $1
           AND grantee IN ('anon', 'authenticated')
         ORDER BY grantee`,
        [t]
      );
      report.tables[t] = {
        rls_enabled: tableInfo.rows[0]?.relrowsecurity ?? null,
        rls_forced: tableInfo.rows[0]?.relforcerowsecurity ?? null,
        policies: policies.rows,
        grants: grants.rows.map((g) => `${g.grantee}:${g.privilege_type}`),
      };
    }

    // 2. Organizations columns (sensitive fields check)
    const orgCols = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'organizations'
       ORDER BY ordinal_position`
    );
    report.organizations_columns = orgCols.rows.map((r) => r.column_name);

    // 3. public_tenant_discovery view definition
    const viewDef = await client.query(
      `SELECT pg_get_viewdef('public.public_tenant_discovery'::regclass, true) AS def`
    );
    report.public_tenant_discovery_view = viewDef.rows[0]?.def ?? null;

    // 4. get_tenant_public function source
    const fnDef = await client.query(
      `SELECT prosrc FROM pg_proc WHERE proname = 'get_tenant_public' AND pronamespace = 'public'::regnamespace`
    );
    report.get_tenant_public_prosrc = fnDef.rows[0]?.prosrc ?? null;

    // 5. is_superadmin / get_my_org_id sources (to check safety for anon)
    const helperFns = await client.query(
      `SELECT proname, prosrc FROM pg_proc
       WHERE pronamespace = 'public'::regnamespace
         AND proname IN ('is_superadmin', 'get_my_org_id', 'get_auth_organization_id')
       ORDER BY proname`
    );
    report.helper_functions = helperFns.rows;

    // 6. anon role attributes
    const anonRole = await client.query(
      `SELECT rolname, rolsuper, rolinherit, rolcreatedb, rolcanlogin
       FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')`
    );
    report.roles = anonRole.rows;

    const outFile = join(
      outDir,
      `rlsscan-imobzy-${new Date().toISOString().slice(0, 10)}.json`
    );
    writeFileSync(outFile, JSON.stringify(report, null, 2));
    console.log(`Diagnostico gravado em ${outFile}`);
    console.log('RLS status por tabela:');
    for (const t of TABLES) {
      const info = report.tables[t];
      console.log(
        `  ${t}: rls=${info.rls_enabled} forced=${info.rls_forced} policies=${info.policies.length} grants=[${info.grants.join(', ') || ''}]`
      );
    }
    console.log('Policies de organizations:');
    for (const p of report.tables.organizations.policies) {
      console.log(`  - ${p.polname} cmd=${p.polcmd} roles=[${p.roles.join(',')}]`);
      console.log(`      using: ${p.qual}`);
      if (p.withcheck) console.log(`      check: ${p.withcheck}`);
    }
  } catch (err) {
    console.error('ERRO no diagnostico:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();