import { eventBus, EVENTS } from '../../lib/eventBus.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';

/**
 * Omnichannel Interaction Logger
 * Consumes ALL communication events from the global Event Bus
 * and registers them in the unified `customer_interactions` timeline table.
 */
class InteractionLogger {
  constructor() {
    this.initListeners();
  }

  initListeners() {
    const handleEvent = async (channel, eventType, direction, payload) => {
      try {
        const { tenant_id, lead_id, correlation_id, ...metadata } = payload;
        
        // Save to DB
        const supabase = getSupabaseServer();
        const { error } = await supabase
          .from('customer_interactions')
          .insert({
            organization_id: tenant_id,
            lead_id: lead_id,
            channel,
            event_type: eventType,
            direction,
            correlation_id,
            metadata
          });

        if (error) {
          console.error(`[InteractionLogger] DB Insert failed for ${eventType}:`, error.message);
        }
      } catch (err) {
        console.error(`[InteractionLogger] Failed to log interaction:`, err);
      }
    };

    // Voice Events
    eventBus.subscribe(EVENTS.VOICE.STARTED, p => handleEvent('voice', EVENTS.VOICE.STARTED, 'outbound', p));
    eventBus.subscribe(EVENTS.VOICE.COMPLETED, p => handleEvent('voice', EVENTS.VOICE.COMPLETED, 'inbound', p));
    
    // Email Events
    eventBus.subscribe(EVENTS.EMAIL.SENT, p => handleEvent('email', EVENTS.EMAIL.SENT, 'outbound', p));
    eventBus.subscribe(EVENTS.EMAIL.OPENED, p => handleEvent('email', EVENTS.EMAIL.OPENED, 'inbound', p));
    eventBus.subscribe(EVENTS.EMAIL.CLICKED, p => handleEvent('email', EVENTS.EMAIL.CLICKED, 'inbound', p));

    // WhatsApp Events
    eventBus.subscribe(EVENTS.WHATSAPP.RECEIVED, p => handleEvent('whatsapp', EVENTS.WHATSAPP.RECEIVED, 'inbound', p));
    eventBus.subscribe(EVENTS.WHATSAPP.SENT, p => handleEvent('whatsapp', EVENTS.WHATSAPP.SENT, 'outbound', p));
  }
}

export const interactionLogger = new InteractionLogger();
