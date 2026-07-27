import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: plans } = await supabase.from('plans').select('*');
  console.log(
    'Planos no DB:',
    plans.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price_monthly,
    }))
  );

  const { data: orgs } = await supabase
    .from('organizations')
    .select('plan_id, plans(name, price_monthly)');

  const counts = {};
  orgs.forEach((o) => {
    const pName = o.plans ? o.plans.name : 'null';
    counts[pName] = (counts[pName] || 0) + 1;
  });

  console.log('Contagem de Orgs por nome do Plano:', counts);
}

check().catch(console.error);
