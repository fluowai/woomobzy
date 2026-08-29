import axios from 'axios';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { eventBus, EVENTS } from '../../lib/eventBus.js';

/**
 * Wootech Mail Adapter
 * Translates Imobzy Domain logic to the internal BillionMail Infrastructure API.
 * Keeps BillionMail isolated and decoupled from the main monolith.
 */
class WootechMailAdapter {
  constructor() {
    // In production, this points to the internal BillionMail cluster API
    this.apiUrl = process.env.WOOTECH_MAIL_API_URL || 'http://billionmail.internal:8000';
  }

  /**
   * Internal helper to fetch API key
   */
  async _getBillionMailKey(tenantId) {
    const supabase = getSupabaseServer();
    const { data: creds, error } = await supabase
      .from('provider_credentials')
      .select('api_key_encrypted')
      .eq('organization_id', tenantId)
      .eq('service', 'billionmail')
      .eq('is_active', true)
      .single();

    if (error || !creds) {
      throw new Error('BillionMail credentials not configured for tenant.');
    }
    return creds.api_key_encrypted; // Assume decrypted in real prod
  }

  /**
   * Registers a domain with the Mail Engine for DNS validation.
   */
  async registerDomain(tenantId, domainName) {
    const apiKey = await this._getBillionMailKey(tenantId);
    console.log(`[WootechMail] Registering domain ${domainName} for tenant ${tenantId}`);
    
    // Abstracting BillionMail endpoints
    const response = await axios.post(`${this.apiUrl}/domains`, { name: domainName }, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    return response.data; // e.g., { dns_records: [...] }
  }

  /**
   * Sends a transactional email. 
   * Distinct from marketing to protect reputation.
   */
  async sendTransactionalEmail(tenantId, payload) {
    const apiKey = await this._getBillionMailKey(tenantId);
    
    const { to, subject, html, from_email, from_name } = payload;

    const emailData = {
      from: { email: from_email, name: from_name },
      to: [{ email: to }],
      subject: subject,
      html: html,
      category: 'transactional'
    };

    try {
      const response = await axios.post(`${this.apiUrl}/messages/send`, emailData, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });

      // Emit event for the timeline (Omnichannel)
      eventBus.publish(EVENTS.EMAIL.SENT, { 
        tenant_id: tenantId, 
        message_id: response.data.id,
        to,
        type: 'transactional' 
      });

      return response.data;
    } catch (err) {
      console.error('[WootechMail] Failed to send email:', err.response?.data || err.message);
      throw err;
    }
  }

  /**
   * Webhook handler that receives events from BillionMail 
   * (opened, clicked, bounced) and emits them to the Wootech Event Bus.
   */
  handleIncomingWebhook(payload) {
    // Determine tenant and event type from payload
    const tenantId = payload.custom_args?.tenant_id;
    if (!tenantId) return;

    switch (payload.event) {
      case 'delivered':
        eventBus.publish(EVENTS.EMAIL.DELIVERED, { tenant_id: tenantId, ...payload });
        break;
      case 'opened':
        eventBus.publish(EVENTS.EMAIL.OPENED, { tenant_id: tenantId, ...payload });
        // Possibly increase lead score here via event listener
        break;
      case 'clicked':
        eventBus.publish(EVENTS.EMAIL.CLICKED, { tenant_id: tenantId, ...payload });
        break;
      case 'bounced':
        eventBus.publish(EVENTS.EMAIL.BOUNCED, { tenant_id: tenantId, ...payload });
        break;
    }
  }
}

export const mailAdapter = new WootechMailAdapter();
