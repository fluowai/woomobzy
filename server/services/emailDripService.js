/**
 * Email Drip Campaign Service
 * Automated follow-up email sequences for leads.
 */

import { getSupabaseServer } from '../lib/supabase-server.js';

const DRIP_TEMPLATES = {
  NEW_LEAD: {
    name: 'Novo Lead - Boas-vindas',
    steps: [
      { delayHours: 0, subject: 'Bem-vindo(a)!', template: 'welcome' },
      {
        delayHours: 24,
        subject: 'Vimos que você tem interesse...',
        template: 'followup_day1',
      },
      { delayHours: 72, subject: 'Ainda pensando?', template: 'followup_day3' },
      {
        delayHours: 168,
        subject: 'Opções imperdíveis para você',
        template: 'followup_week1',
      },
    ],
  },
  PROPERTY_VIEWED: {
    name: 'Imóvel Visualizado',
    steps: [
      {
        delayHours: 2,
        subject: 'Obrigado por conferir nosso imóvel!',
        template: 'property_thanks',
      },
      {
        delayHours: 48,
        subject: 'Agende uma visita',
        template: 'property_schedule',
      },
      {
        delayHours: 168,
        subject: 'Outras opções semelhantes',
        template: 'property_alternatives',
      },
    ],
  },
  POST_VISIT: {
    name: 'Pós-Visita',
    steps: [
      {
        delayHours: 4,
        subject: 'Como foi sua visita?',
        template: 'post_visit_feedback',
      },
      {
        delayHours: 72,
        subject: 'Podemos ajudar com algo?',
        template: 'post_visit_followup',
      },
      {
        delayHours: 336,
        subject: 'Não perca esta oportunidade',
        template: 'post_visit_urgency',
      },
    ],
  },
  REENGAGEMENT: {
    name: 'Reengajamento',
    steps: [
      {
        delayHours: 0,
        subject: 'Sentimos sua falta!',
        template: 'reengagement_1',
      },
      {
        delayHours: 168,
        subject: 'Novidades que você vai adorar',
        template: 'reengagement_2',
      },
    ],
  },
};

/**
 * Start a drip campaign for a lead.
 */
export async function startDripCampaign(
  organizationId,
  leadId,
  templateKey,
  leadData = {}
) {
  const supabase = getSupabaseServer();
  const template = DRIP_TEMPLATES[templateKey];
  if (!template) throw new Error(`Unknown drip template: ${templateKey}`);

  const now = new Date();

  const steps = template.steps.map((step) => ({
    organization_id: organizationId,
    lead_id: leadId,
    template_key: templateKey,
    subject: step.subject,
    template: step.template,
    status: 'scheduled',
    scheduled_at: new Date(
      now.getTime() + step.delayHours * 60 * 60 * 1000
    ).toISOString(),
    metadata: { leadData },
  }));

  const { error } = await supabase.from('email_drip_campaigns').insert(steps);

  if (error) {
    // If table doesn't exist, log and continue gracefully
    if (
      error.code === '42P01' ||
      String(error.message).includes('does not exist')
    ) {
      console.warn(
        '[EmailDrip] Table email_drip_campaigns not created yet. Campaign skipped.'
      );
      return { queued: false, reason: 'table_not_created' };
    }
    throw error;
  }

  return { queued: true, steps: steps.length, template: template.name };
}

/**
 * Cancel active drip campaigns for a lead.
 */
export async function cancelDripCampaigns(organizationId, leadId) {
  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from('email_drip_campaigns')
    .update({ status: 'cancelled' })
    .eq('organization_id', organizationId)
    .eq('lead_id', leadId)
    .eq('status', 'scheduled');

  if (error && error.code !== '42P01') throw error;
  return { cancelled: true };
}

/**
 * Get active drip campaigns for a lead.
 */
export async function getLeadDripCampaigns(organizationId, leadId) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('email_drip_campaigns')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('lead_id', leadId)
    .order('scheduled_at', { ascending: true });

  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return data || [];
}

export { DRIP_TEMPLATES };
