import 'dotenv/config';
import pg from 'pg';
const raw = (process.env.SUPABASE_DB_URL || process.env.DATABASE_URL);
const cs = raw.replace(/([?&])sslmode=[^&]*/, '$1').replace(/[?&]$/, '');
const pool = new pg.Pool({ connectionString: cs, ssl: { rejectUnauthorized: false }, max: 2 });
(async () => {
  try {
    const roles = await pool.query("SELECT DISTINCT role FROM public.profiles ORDER BY 1");
    console.log('roles profiles:', roles.rows.map(r=>r.role).join(', '));
    const sec = await pool.query("SELECT proname, prosecdef FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('get_tenant_public','get_auth_organization_id','get_my_org_id','is_superadmin') ORDER BY proname");
    console.log('helpers secdef:', JSON.stringify(sec.rows));
    const sens = await pool.query("SELECT count(*) FILTER (WHERE gateway_api_key IS NOT NULL AND gateway_api_key<>'') AS gw_keys, count(*) FILTER (WHERE webhook_secret IS NOT NULL AND webhook_secret<>'') AS wh_secrets, count(*) AS total FROM public.organizations");
    console.log('org sensitive:', JSON.stringify(sens.rows[0]));
    const tmp = await pool.query("SELECT id, slug, parent_id, status, is_reseller FROM public.organizations WHERE slug='teste-imveis'");
    console.log('teste-imveis:', JSON.stringify(tmp.rows));
  } catch(e) { console.error('ERRO:', e.message); process.exitCode=1; }
  finally { await pool.end(); }
})();

