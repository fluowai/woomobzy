import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const ALL_FEATURE_FLAGS = {
  module_geointeligencia: true,
  module_due_diligence: true,
  module_empreendimentos: true,
  module_locacao: true,
  module_exportador: true,
  module_compliance: true,
  module_ia_studio: true,
  module_landing_pages: true,
  module_dataroom: true,
  module_portal_proprietario: true,
  module_whatsapp: true,
  max_properties: true,
  ai_agents: true,
  dataroom: true,
  locacao: true,
  woo_control: true,
  white_label: true,
  reseller_panel: true,
  rural_module: true,
  urban_module: true,
  site_builder: true,
  quiz: true,
  fintech: true,
  clube: true,
  campaigns: true,
  instagram: true,
  email_center: true,
  matchmaking_360: true,
};

const ALL_PLAN_FEATURES = [
  'CRM Completo & Funil Kanban',
  'Criador de Páginas (Landing Pages) Ilimitado',
  'Construtor de Site Completo',
  'Central de Agentes de IA & Assistente',
  'Geointeligência CAR/SIGEF & Valuation',
  'Gestão de Locação, Contratos & Assinatura Digital',
  'DataRoom & Compliance Documental',
  'Fintech, Cobranças & Financeiro',
  'WhatsApp, Instagram & Email Integrados',
  'Quiz Interativo & Matchmaking 360°',
  'Clube Imobzy & Portais do Cliente',
];

const UNLIMITED_LIMITS = {
  max_properties: 999999,
  max_users: 9999,
  max_landing_pages: 9999,
  max_ai_agents: 999,
  max_whatsapp_connections: 99,
  storage_gb: 1000,
  ai_tokens_monthly: 10000000,
};

async function main() {
  const client = await pool.connect();
  try {
    console.log('🔓 Liberando 100% das funções, módulos e planos em todas as organizações...');

    // 1. Atualizar todos os planos com recursos completos e limites irrestritos
    const plansRes = await client.query(`SELECT id, name, price_monthly FROM public.plans ORDER BY price_monthly DESC NULLS LAST`);
    for (const plan of plansRes.rows) {
      const price = Number(plan.price_monthly) > 0 ? Number(plan.price_monthly) : 997;
      await client.query(
        `UPDATE public.plans
         SET features = $1::jsonb,
             limits = $2::jsonb,
             price_monthly = $3,
             is_active = true
         WHERE id = $4`,
        [JSON.stringify(ALL_PLAN_FEATURES), JSON.stringify(UNLIMITED_LIMITS), price, plan.id]
      );
    }
    const topPlanId = plansRes.rows[0]?.id || null;
    console.log(`✅ ${plansRes.rows.length} planos atualizados com todas as features e limites ilimitados (Top Plan: ${topPlanId}).`);

    // 2. Atualizar todas as organizações com feature_flags 100% ativas e status ativo
    await client.query(
      `UPDATE public.organizations
       SET feature_flags = COALESCE(feature_flags, '{}'::jsonb) || $1::jsonb,
           status = 'active',
           subscription_status = 'active',
           plan_id = COALESCE(plan_id, $2),
           updated_at = NOW()`,
      [JSON.stringify(ALL_FEATURE_FLAGS), topPlanId]
    );

    // 3. Vincular Imobiliária Horizonte Urbano e Fazendas Brasil Agro (e demais tenants clientes) à Revenda Prime SaaS
    const resellerId = '12472ea9-2819-42d6-9f9a-2ce8a499af9e';
    const masterId = '4b10aa59-4e37-45dc-9c00-64630f9f1b7b';

    await client.query(
      `UPDATE public.organizations
       SET parent_id = $1,
           is_reseller = false
       WHERE id NOT IN ($1, $2)`,
      [resellerId, masterId]
    );

    // Garantir flags de reseller na Revenda Prime SaaS e Master na WooTech Master Imob
    await client.query(
      `UPDATE public.organizations SET is_reseller = true, parent_id = $2 WHERE id = $1`,
      [resellerId, masterId]
    );
    await client.query(
      `UPDATE public.organizations SET is_reseller = false, parent_id = NULL WHERE id = $1`,
      [masterId]
    );

    // 4. Garantir site_settings e sites criados para todas as organizações principais
    const orgsRes = await client.query(`SELECT id, name, slug, niche, is_reseller, parent_id FROM public.organizations`);
    for (const org of orgsRes.rows) {
      const { rows: existingSettings } = await client.query(
        `SELECT id FROM public.site_settings WHERE organization_id = $1 LIMIT 1`,
        [org.id]
      );
      if (existingSettings.length === 0) {
        await client.query(
          `INSERT INTO public.site_settings (organization_id, agency_name, primary_color, secondary_color, header_title, header_subtitle)
           VALUES ($1, $2, '#ff6a00', '#12151e', $2, 'Ecossistema Imobiliário Completo')`,
          [org.id, org.name]
        );
      }

      const { rows: existingSite } = await client.query(
        `SELECT id FROM public.sites WHERE organization_id = $1 LIMIT 1`,
        [org.id]
      );
      if (existingSite.length === 0) {
        await client.query(
          `INSERT INTO public.sites (organization_id, name, is_active)
           VALUES ($1, $2, true)`,
          [org.id, `Portal Oficial - ${org.name}`]
        );
      }
    }

    await client.query(`NOTIFY pgrst, 'reload schema'`);
    console.log(`✅ ${orgsRes.rows.length} organizações configuradas com 100% dos módulos liberados, site_settings, sites e hierarquia de revenda ativa!`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Erro ao liberar funções:', err);
  process.exit(1);
});

