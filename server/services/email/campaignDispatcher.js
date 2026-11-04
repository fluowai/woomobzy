import { mailAdapter } from './wootechMailAdapter.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { eventBus, EVENTS } from '../../lib/eventBus.js';

function normalizeLeadRow(row) {
  const lead = row.leads || row;
  return {
    id: row.lead_id || lead.id,
    email: row.email || lead.email,
    name: lead.name || row.name || null
  };
}

/**
 * Wootech Mail - Campaign Dispatcher
 * Dispara campanhas somente a partir de campanha, remetente, template e público
 * persistidos no banco. Erros de schema, credencial ou provedor bloqueiam o
 * envio em vez de cair em dados fictícios.
 */
class CampaignDispatcher {
  async dispatchCampaign(tenantId, campaignId) {
    console.log(`[WootechMail] Dispatching campaign ${campaignId} for tenant ${tenantId}`);

    const supabase = getSupabaseServer();
    const { data: flags, error: flagsError } = await supabase
      .from('feature_flags')
      .select('email_marketing_enabled')
      .eq('organization_id', tenantId)
      .single();

    if (flagsError) {
      throw flagsError;
    }

    if (!flags?.email_marketing_enabled) {
      throw new Error('Email marketing está desativado para este tenant.');
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('mail_campaigns')
      .select('id, subject, status, audience_filter, sender:mail_senders(name, email), template:mail_templates(html)')
      .eq('id', campaignId)
      .eq('organization_id', tenantId)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campanha de email não encontrada: ${campaignError?.message || campaignId}`);
    }

    if (!['scheduled', 'ready', 'draft'].includes(campaign.status)) {
      throw new Error(`Campanha ${campaignId} não está pronta para envio: ${campaign.status}`);
    }

    if (!campaign.sender?.email || !campaign.template?.html || !campaign.subject) {
      throw new Error('Campanha sem remetente, assunto ou template HTML persistido.');
    }

    const audience = await this.loadAudience(supabase, tenantId, campaignId, campaign.audience_filter || {});

    if (audience.length === 0) {
      await this.markCampaign(supabase, campaignId, tenantId, {
        status: 'empty',
        last_error: 'Nenhum lead com email encontrado para o público da campanha.',
        sent_at: new Date().toISOString()
      });
      return { success: true, dispatched: 0, skipped: 0, failed: 0 };
    }

    await this.markCampaign(supabase, campaignId, tenantId, {
      status: 'sending',
      started_at: new Date().toISOString(),
      last_error: null
    });

    let dispatched = 0;
    let failed = 0;

    for (const lead of audience) {
      try {
        const result = await mailAdapter.sendTransactionalEmail(tenantId, {
          to: lead.email,
          subject: campaign.subject,
          html: campaign.template.html,
          from_name: campaign.sender.name,
          from_email: campaign.sender.email
        });

        dispatched += 1;
        eventBus.publish(EVENTS.EMAIL.SENT, {
          tenant_id: tenantId,
          campaign_id: campaign.id,
          lead_id: lead.id,
          message_id: result.id,
          type: 'marketing'
        });

        await supabase
          .from('mail_campaign_recipients')
          .upsert({
            organization_id: tenantId,
            campaign_id: campaign.id,
            lead_id: lead.id,
            email: lead.email,
            status: 'sent',
            provider_message_id: result.id,
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'campaign_id,lead_id' });
      } catch (err) {
        failed += 1;
        await supabase
          .from('mail_campaign_recipients')
          .upsert({
            organization_id: tenantId,
            campaign_id: campaign.id,
            lead_id: lead.id,
            email: lead.email,
            status: 'failed',
            last_error: err.message,
            updated_at: new Date().toISOString()
          }, { onConflict: 'campaign_id,lead_id' });
      }
    }

    await this.markCampaign(supabase, campaignId, tenantId, {
      status: failed > 0 ? 'partial' : 'completed',
      sent_count: dispatched,
      failed_count: failed,
      sent_at: new Date().toISOString(),
      last_error: failed > 0 ? `${failed} destinatário(s) falharam.` : null
    });

    return { success: failed === 0, dispatched, failed };
  }

  async loadAudience(supabase, tenantId, campaignId, filter) {
    const { data: explicitRecipients, error: recipientError } = await supabase
      .from('mail_campaign_recipients')
      .select('lead_id, email, leads(id, name, email)')
      .eq('campaign_id', campaignId)
      .eq('organization_id', tenantId);

    if (recipientError) {
      throw recipientError;
    }

    const explicit = (explicitRecipients || [])
      .map(normalizeLeadRow)
      .filter((lead) => lead.id && lead.email);

    if (explicit.length > 0) {
      return explicit;
    }

    let query = supabase
      .from('leads')
      .select('id, name, email')
      .eq('organization_id', tenantId)
      .not('email', 'is', null);

    if (Array.isArray(filter.statuses) && filter.statuses.length > 0) {
      query = query.in('status', filter.statuses);
    }

    if (Number.isFinite(Number(filter.minLeadScore))) {
      query = query.gte('lead_score', Number(filter.minLeadScore));
    }

    if (filter.source) {
      query = query.eq('source', filter.source);
    }

    const { data: leads, error: leadsError } = await query.limit(Number(filter.limit || 500));

    if (leadsError) {
      throw leadsError;
    }

    return (leads || []).map(normalizeLeadRow).filter((lead) => lead.id && lead.email);
  }

  async markCampaign(supabase, campaignId, tenantId, patch) {
    const { error } = await supabase
      .from('mail_campaigns')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', campaignId)
      .eq('organization_id', tenantId);

    if (error) {
      throw error;
    }
  }
}

export const campaignDispatcher = new CampaignDispatcher();
