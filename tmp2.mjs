import { createClient } from '@supabase/supabase-js';
const url = (process.env.VITE_SUPABASE_URL || '').trim();
const sb = createClient(url, (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim());
const all = await sb.from('profiles').select('id,email,role,organization_id');
const rows = all.data || [];
const dup = {};
for (const r of rows) {
  const e = (r.email || '').toLowerCase();
  (dup[e] = dup[e] || []).push(r);
}
console.log('DUPLICATE EMAILS:');
for (const [e, list] of Object.entries(dup)) {
  if (list.length > 1)
    console.log(e, list.map((r) => ({ id: r.id, role: r.role, org: r.organization_id })));
}
console.log('ALL rows:', rows.length);
for (const r of rows) console.log(`${r.email} | role=${r.role} | org=${r.organization_id}`);
process.exit(0);