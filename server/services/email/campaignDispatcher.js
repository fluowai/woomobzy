import { mailAdapter } from './wootechMailAdapter.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { eventBus, EVENTS } from '../../lib/eventBus.js';

/**
 * Wootech Mail - Campaign Dispatcher
 * Manages the generation, segmentation, and batch dispatching of marketing emails
 * via the Wootech Mail Adapter (BillionMail), keeping logic decoupled from the Imobzy CRM.
 */
class CampaignDispatcher {
  /**
   * Dispatches a specific marketing campaign.
   */
  async dispatchCampaign(tenantId, campaignId) {
    console.log(`[WootechMail] Dispatching campaign ${campaignId} for tenant ${tenantId}`);
    
    // Check feature flag
    const supabase = getSupabaseServer();
    const { data: flags } = await supabase
      .from('feature_flags')
      .select('email_marketing_enabled')
      .eq('organization_id', tenantId)
      .single();

    if (!flags?.email_marketing_enabled) {
      throw new Error('Email marketing is disabled for this tenant.');
    }

    // 1. Fetch Campaign Data
    // Note: 'mail_campaigns' is a theoretical table we will create in the next migration batch
    // but the stub prepares for it.
    /*
    const { data: campaign } = await supabase
      .from('mail_campaigns')
      .select('*, mail_senders(name, email), mail_templates(html)')
      .eq('id', campaignId)
      .single();
    */
    
    // Mock Campaign for Phase 4 implementation
    const campaign = {
      id: campaignId,
      subject: 'Novos Lançamentos em sua região!',
      mail_senders: { name: 'João Corretor', email: 'joao@crm.alpha.com.br' },
      mail_templates: { html: '<html><body>Veja estes imóveis.</body></html>' }
    };

    // 2. Fetch Audience (Segment)
    // We query leads based on the segment rules (e.g. city = 'Itajaí', score > 50)
    // For now, we mock an audience.
    const audience = [
      { id: 'lead-1', email: 'cliente@exemplo.com' }
    ];

    console.log(`[WootechMail] Found ${audience.length} recipients in segment.`);

    // 3. Dispatch in Batches
    for (const lead of audience) {
      try {
        // We use the Mail Adapter to send the email, ensuring we don't 
        // tightly couple BillionMail endpoints to this dispatcher.
        const result = await mailAdapter.sendTransactionalEmail(tenantId, {
          to: lead.email,
          subject: campaign.subject,
          html: campaign.mail_templates.html,
          from_name: campaign.mail_senders.name,
          from_email: campaign.mail_senders.email
        });

        // Publish to Event Bus
        eventBus.publish(EVENTS.EMAIL.SENT, {
          tenant_id: tenantId,
          campaign_id: campaign.id,
          lead_id: lead.id,
          message_id: result.id,
          type: 'marketing'
        });

      } catch (err) {
        console.error(`[WootechMail] Failed to send to ${lead.email}:`, err.message);
      }
    }

    // Update Campaign Status
    /*
    await supabase.from('mail_campaigns').update({ status: 'completed' }).eq('id', campaignId);
    */

    return { success: true, dispatched: audience.length };
  }
}

export const campaignDispatcher = new CampaignDispatcher();
