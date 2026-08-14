import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = (
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ''
).trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const supabase = createClient(url, key);

const KANBAN_CARD_SELECT = `
  id,
  organization_id,
  name,
  email,
  phone,
  source,
  status,
  classification,
  lead_score,
  ai_next_action,
  next_follow_up_at,
  next_visit_at,
  chat_jid,
  campaign,
  property_id,
  created_at,
  properties(title, price, images),
  lead_tags(tag)
`;

// Hypothesis 1: .eq('organization_id', null) as superadmin bypass would do
try {
  let { data, error, count } = await supabase
    .from('leads')
    .select(KANBAN_CARD_SELECT, { count: 'exact' })
    .eq('organization_id', null)
    .limit(51);
  console.log(
    'H1 orgId=null: len=',
    data?.length,
    'count=',
    count,
    'err=',
    error?.message || 'none'
  );
} catch (e) {
  console.log('H1 orgId=null THREW:', e.message);
}

// Hypothesis 2: exact statuses the browser sends
for (const status of [
  'Fechado',
  'Qualificação',
  'Documentação',
  'Visita',
  'Novo',
  'Simulação',
  'Pessoal',
  'Perdido',
]) {
  let { data, error, count } = await supabase
    .from('leads')
    .select(KANBAN_CARD_SELECT, { count: 'exact' })
    .eq('organization_id', '91b29fed-d6db-48d4-a721-271172c04b39')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(51);
  console.log(
    `H2 status=${status}: len=`,
    data?.length,
    'count=',
    count,
    'err=',
    error?.message || 'none'
  );
}

// Hypothesis 3: check properties table columns actually exist (title, price, images)
let { data: colData, error: colError } = await supabase.rpc(
  'get_table_columns',
  {}
);
console.log('H3 rpc get_table_columns err:', colError?.message || 'n/a');
