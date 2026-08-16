import { getSupabaseServer } from './server/lib/supabase-server.js';
import dotenv from 'dotenv';
dotenv.config();
async function run() {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('organizations')
    .select(
      'id, name, slug, subdomain, niche, custom_domain, subscription_status, trial_ends_at, plan_id'
    )
    .order('created_at', { ascending: false })
    .limit(1);
  console.log('DATA:', JSON.stringify(data, null, 2));
  console.log('ERROR:', error);
  const { data: plans, error: plansError } = await supabase
    .from('plans')
    .select('*')
    .limit(20);
  console.log('PLANS:', JSON.stringify(plans, null, 2));
  console.log('PLANS_ERROR:', plansError);
}
run();
