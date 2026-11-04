import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const email = process.env.PROVISIONAL_USER_EMAIL;
const password = process.env.PROVISIONAL_USER_PASSWORD;
if (!email || !password) throw new Error('PROVISIONAL_USER_EMAIL e PROVISIONAL_USER_PASSWORD são obrigatórios');

let user;
const listed = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listed.error) throw listed.error;
user = listed.data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
if (user) {
  const updated = await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true, user_metadata: { ...user.user_metadata, must_change_password: true } });
  if (updated.error) throw updated.error;
  user = updated.data.user;
} else {
  const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { must_change_password: true, provisional_access: true } });
  if (created.error) throw created.error;
  user = created.data.user;
}

const slug = 'woonexo-paulo-provisorio';
let { data: organization, error } = await supabase.from('organizations').select('id').eq('slug', slug).maybeSingle();
if (error) throw error;
if (!organization) {
  const createdOrg = await supabase.from('organizations').insert({ name: 'WooNexo — Acesso provisório', slug, status: 'active' }).select('id').single();
  if (createdOrg.error) throw createdOrg.error;
  organization = createdOrg.data;
}
const profile = await supabase.from('profiles').upsert({ id: user.id, organization_id: organization.id, name: 'Paulo Argolo', email, role: 'admin' }, { onConflict: 'id' }).select('id,organization_id,role').single();
if (profile.error) throw profile.error;
console.log(JSON.stringify({ email, userId: user.id, organizationId: organization.id, role: profile.data.role, mustChangePassword: true }));
