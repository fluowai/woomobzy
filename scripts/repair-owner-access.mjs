import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const apply = process.argv.includes('--apply');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const report = {
  generatedAt: new Date().toISOString(),
  apply,
  fixed: [],
  skipped: [],
  errors: [],
};

const { data: organizations, error: orgError } = await supabase
  .from('organizations')
  .select('id, name, owner_name, owner_email, status, niche')
  .not('owner_email', 'is', null)
  .order('created_at', { ascending: true });

if (orgError) throw orgError;

for (const org of organizations || []) {
  const email = String(org.owner_email || '')
    .toLowerCase()
    .trim();
  if (!email) continue;

  try {
    const existingUser = await findAuthUserByEmail(email);
    const temporaryPassword = generatePassword();
    let user = existingUser;
    let action = 'linked_existing_user';

    if (!apply) {
      report.skipped.push({
        organization_id: org.id,
        organization: org.name,
        email,
        would_create_auth_user: !existingUser,
        would_link_profile: true,
      });
      continue;
    }

    if (!user) {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          name: org.owner_name || org.name,
          agencyName: org.name,
        },
      });
      if (error) throw error;
      user = data.user;
      action = 'created_auth_user';
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          ...(user.user_metadata || {}),
          name: org.owner_name || user.user_metadata?.name || org.name,
          agencyName: org.name,
        },
      }
    );
    if (updateError) throw updateError;

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        organization_id: org.id,
        name: org.owner_name || user.user_metadata?.name || org.name,
        email,
        role: 'admin',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (profileError) throw profileError;

    report.fixed.push({
      organization_id: org.id,
      organization: org.name,
      email,
      action,
      temporary_password: temporaryPassword,
      note: 'Trocar a senha depois do primeiro acesso.',
    });
  } catch (error) {
    report.errors.push({
      organization_id: org.id,
      organization: org.name,
      email,
      error: error.message,
    });
  }
}

const reportPath = path.join(
  process.cwd(),
  `owner-access-repair-${Date.now()}.json`
);
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log(`Apply: ${apply}`);
console.log(`Fixed: ${report.fixed.length}`);
console.log(`Skipped: ${report.skipped.length}`);
console.log(`Errors: ${report.errors.length}`);
console.log(`Report: ${reportPath}`);

async function findAuthUserByEmail(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;

    const user = data?.users?.find(
      (item) => item.email?.toLowerCase() === email
    );
    if (user) return user;
    if (!data?.users || data.users.length < 1000) break;
  }

  return null;
}

function generatePassword() {
  return `Imobzy@${crypto.randomBytes(9).toString('base64url')}7`;
}
