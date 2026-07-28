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

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltam credenciais do Supabase no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function assignPlans() {
  // Pega os planos pro e enterprise
  const { data: plans, error: errPlans } = await supabase
    .from('plans')
    .select('id, slug, price_monthly')
    .in('slug', ['pro', 'enterprise']);

  if (errPlans || !plans || plans.length < 2) {
    console.error('Erro ao buscar planos ou planos nao encontrados', errPlans);
    process.exit(1);
  }

  const proPlan = plans.find((p) => p.slug === 'pro');
  const enterprisePlan = plans.find((p) => p.slug === 'enterprise');

  console.log(
    `Planos encontrados: Pro (${proPlan.price_monthly}), Enterprise (${enterprisePlan.price_monthly})`
  );

  // Pega todas as organizations (limitadas as que acabamos de criar ou todas)
  const { data: orgs, error: errOrgs } = await supabase
    .from('organizations')
    .select('id');

  if (errOrgs) {
    console.error('Erro ao buscar imobiliarias', errOrgs);
    process.exit(1);
  }

  console.log(`Total de imobiliarias encontradas: ${orgs.length}`);

  // Embaralha para distribuir aleatoriamente
  orgs.sort(() => Math.random() - 0.5);

  const total = orgs.length;
  const count60 = Math.round(total * 0.6); // 60%

  const proOrgs = orgs.slice(0, count60);
  const enterpriseOrgs = orgs.slice(count60);

  console.log(`Atribuindo Plano Pro para ${proOrgs.length} imobiliarias (60%)`);
  console.log(
    `Atribuindo Plano Enterprise para ${enterpriseOrgs.length} imobiliarias (40%)`
  );

  // Update Pro
  for (let i = 0; i < proOrgs.length; i += 50) {
    const batch = proOrgs.slice(i, i + 50).map((o) => o.id);
    const { error } = await supabase
      .from('organizations')
      .update({ plan_id: proPlan.id })
      .in('id', batch);
    if (error) console.error('Erro batch Pro', error);
  }

  // Update Enterprise
  for (let i = 0; i < enterpriseOrgs.length; i += 50) {
    const batch = enterpriseOrgs.slice(i, i + 50).map((o) => o.id);
    const { error } = await supabase
      .from('organizations')
      .update({ plan_id: enterprisePlan.id })
      .in('id', batch);
    if (error) console.error('Erro batch Enterprise', error);
  }

  console.log('Planos atribuidos com sucesso!');
}

assignPlans().catch(console.error);
