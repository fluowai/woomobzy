import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.');

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const password = process.env.IMOBZY_E2E_DEFAULT_PASSWORD || 'WoonexoE2E#2026!';
const stamp = '20261104';
const records = [
  { key: 'urban', email: `e2e.urban.admin.${stamp}@woonexo.test`, name: 'E2E Admin Urbano', role: 'admin', org: { slug: `e2e-urbana-${stamp}`, name: 'E2E Urbana', niche: 'traditional', is_reseller: false } },
  { key: 'urbanBroker', email: `e2e.urban.broker.${stamp}@woonexo.test`, name: 'E2E Corretor Urbano', role: 'broker', org: { slug: `e2e-urbana-${stamp}`, name: 'E2E Urbana', niche: 'traditional', is_reseller: false } },
  { key: 'rural', email: `e2e.rural.admin.${stamp}@woonexo.test`, name: 'E2E Admin Rural', role: 'admin', org: { slug: `e2e-rural-${stamp}`, name: 'E2E Rural', niche: 'rural', is_reseller: false } },
  { key: 'super', email: `e2e.superadmin.${stamp}@woonexo.test`, name: 'E2E Super Admin', role: 'superadmin', org: { slug: `e2e-revenda-${stamp}`, name: 'E2E Revenda', niche: 'traditional', is_reseller: true } },
  { key: 'mega', email: `e2e.megaadmin.${stamp}@woonexo.test`, name: 'E2E Mega Admin', role: 'superadmin', org: null },
];

async function ensureOrganization(input) {
  if (!input) return null;
  const { data: existing, error: findError } = await supabase.from('organizations').select('*').eq('slug', input.slug).maybeSingle();
  if (findError) throw findError;
  if (existing) return existing;
  const { data, error } = await supabase.from('organizations').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

async function ensureUser(record) {
  const listed = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) throw listed.error;
  let user = listed.data.users.find((item) => item.email?.toLowerCase() === record.email.toLowerCase());
  if (!user) {
    const created = await supabase.auth.admin.createUser({ email: record.email, password, email_confirm: true, user_metadata: { full_name: record.name, e2e: true } });
    if (created.error) throw created.error;
    user = created.data.user;
  } else {
    const updated = await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true, user_metadata: { ...(user.user_metadata || {}), full_name: record.name, e2e: true } });
    if (updated.error) throw updated.error;
    user = updated.data.user;
  }
  const organization = await ensureOrganization(record.org);
  const { error: profileError } = await supabase.from('profiles').upsert({ id: user.id, email: record.email, name: record.name, role: record.role, organization_id: organization?.id || null }, { onConflict: 'id' });
  if (profileError) throw profileError;
  return { key: record.key, email: record.email, password, userId: user.id, organizationId: organization?.id || null, organizationSlug: organization?.slug || null };
}

const output = [];
for (const record of records) output.push(await ensureUser(record));
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), passwordPolicy: 'All accounts use the generated E2E password.', accounts: output }, null, 2));
