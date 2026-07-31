import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function upsertOrg(slug, name, niche) {
  const { data, error } = await supabase
    .from('organizations')
    .upsert(
      { slug, name, niche, status: 'ACTIVE' },
      { onConflict: 'slug', ignoreDuplicates: false }
    )
    .select('id')
    .single();

  if (error) {
    console.error(`Error upserting org ${name}:`, error.message);
    return null;
  }
  return data.id;
}

async function upsertUser(email, password, name, role, orgId) {
  // 1. Create or get Auth identity
  let userId;
  const { data: existingUsers, error: listErr } =
    await supabase.auth.admin.listUsers();

  if (listErr) {
    console.error('Error listing auth users:', listErr.message);
    return null;
  }

  const existingUser = existingUsers.users.find((u) => u.email === email);
  if (existingUser) {
    userId = existingUser.id;
    // Update password just in case
    await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
  } else {
    const { data: newAuthUser, error: createErr } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    if (createErr) {
      console.error(`Error creating auth user ${email}:`, createErr.message);
      return null;
    }
    userId = newAuthUser.user.id;
  }

  // 2. Upsert Profile
  const { error: profileErr } = await supabase.from('profiles').upsert({
    id: userId,
    email: email,
    name: name,
    role: role,
    organization_id: orgId || null,
  });

  if (profileErr) {
    console.error(`Error upserting profile for ${email}:`, profileErr.message);
    return null;
  }
  return userId;
}

async function run() {
  console.log('--- Seeding Onda 0 Audit Data ---');

  // Orgs
  console.log('Creating organizations...');
  const orgUrbanaA = await upsertOrg('urbana-a', 'Urbana A', 'urbano');
  const orgUrbanaB = await upsertOrg('urbana-b', 'Urbana B', 'urbano');
  const orgRuralA = await upsertOrg('rural-a', 'Rural A', 'rural');
  const orgRuralB = await upsertOrg('rural-b', 'Rural B', 'rural');

  // SuperAdmin org (Reseller)
  const { data: orgSuperAdminData, error: orgSuperAdminErr } = await supabase
    .from('organizations')
    .upsert(
      {
        slug: 'super-admin-org',
        name: 'Super Admin Org',
        status: 'ACTIVE',
        is_reseller: true,
      },
      { onConflict: 'slug', ignoreDuplicates: false }
    )
    .select('id')
    .single();

  const orgSuperAdmin = orgSuperAdminData?.id;

  console.log(`Orgs created:
  Urbana A: ${orgUrbanaA}
  Urbana B: ${orgUrbanaB}
  Rural A: ${orgRuralA}
  Rural B: ${orgRuralB}
  Super Admin: ${orgSuperAdmin}`);

  // Users
  console.log('\nCreating users...');
  await upsertUser(
    'admin-urbana-a@imobzy.test',
    'imobzyOnda0!',
    'Admin Urbana A',
    'admin',
    orgUrbanaA
  );
  await upsertUser(
    'corretor-urbana-b@imobzy.test',
    'imobzyOnda0!',
    'Corretor Urbana B',
    'broker',
    orgUrbanaB
  );
  await upsertUser(
    'admin-rural-a@imobzy.test',
    'imobzyOnda0!',
    'Admin Rural A',
    'admin',
    orgRuralA
  );

  await upsertUser(
    'superadmin@imobzy.test',
    'imobzyOnda0!',
    'Super Admin',
    'superadmin',
    orgSuperAdmin
  );
  await upsertUser(
    'megaadmin@imobzy.test',
    'imobzyOnda0!',
    'Mega Admin',
    'superadmin',
    null
  );

  console.log('Seed completed successfully!');
}

run();
