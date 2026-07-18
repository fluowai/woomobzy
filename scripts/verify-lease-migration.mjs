#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const tables = [
  'leases',
  'contract_templates',
  'contract_versions',
  'generated_contracts',
  'signatures',
  'inspections',
  'invoices',
  'rent_adjustments',
  'lease_terminations',
  'lease_history',
];
const views = ['lease_overview', 'lease_financial_summary'];

for (const t of tables) {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'SELECT COUNT(*) as cnt FROM ' + t,
  });
  if (error) console.log('FAIL', t, error.message.slice(0, 80));
  else console.log('OK  ', t, 'table exists');
}
for (const v of views) {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'SELECT * FROM ' + v + ' LIMIT 0',
  });
  if (error) console.log('FAIL view', v, error.message.slice(0, 80));
  else console.log('OK  view', v, 'view exists');
}
console.log('\nVerification complete');
