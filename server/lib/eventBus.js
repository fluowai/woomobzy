import { EventEmitter } from 'events';

/**
 * Wootech Global Event Bus
 * Core communication hub decoupling Imobzy CRM from Wootech Mail and AI Voz.
 * Note: In Phase 1, this runs in-memory. In future scale-out phases, 
 * this interface will be swapped for Redis Pub/Sub without affecting consumers.
 */
class WootechEventBus extends EventEmitter {
  constructor() {
    super();
    // Increase limit for a large monolith
    this.setMaxListeners(50);
  }

  /**
   * Publishes an event to the bus.
   * @param {string} topic - e.g., 'lead.created', 'email.sent', 'voice.completed'
   * @param {object} payload - The event data, MUST include tenant_id
   */
  publish(topic, payload) {
    if (!payload.tenant_id) {
      console.warn(`[EventBus] Warning: Published event '${topic}' without tenant_id!`);
    }
    
    const eventData = {
      ...payload,
      timestamp: new Date().toISOString(),
      correlation_id: payload.correlation_id || crypto.randomUUID(),
    };

    console.log(`[EventBus] Published -> ${topic} (Correlation: ${eventData.correlation_id})`);
    this.emit(topic, eventData);
  }

  /**
   * Subscribes to a specific event topic.
   * @param {string} topic 
   * @param {function} handler 
   */
  subscribe(topic, handler) {
    console.log(`[EventBus] Subscribed <- ${topic}`);
    this.on(topic, async (payload) => {
      try {
        await handler(payload);
      } catch (error) {
        console.error(`[EventBus] Error handling event '${topic}':`, error);
      }
    });
  }
}

// Singleton instance
export const eventBus = new WootechEventBus();

// Standardized Event Topics
export const EVENTS = {
  LEAD: {
    CREATED: 'lead.created',
    UPDATED: 'lead.updated',
    SCORE_CHANGED: 'lead.score.changed'
  },
  EMAIL: {
    SENT: 'email.sent',
    DELIVERED: 'email.delivered',
    OPENED: 'email.opened',
    CLICKED: 'email.clicked',
    BOUNCED: 'email.bounced'
  },
  WHATSAPP: {
    SENT: 'whatsapp.sent',
    DELIVERED: 'whatsapp.delivered',
    READ: 'whatsapp.read',
    RECEIVED: 'whatsapp.received'
  },
  VOICE: {
    STARTED: 'voice.started',
    COMPLETED: 'voice.completed',
    TRANSFERRED: 'voice.transferred'
  },
  PROPERTY: {
    VIEWED: 'property.viewed'
  },
  APPOINTMENT: {
    CREATED: 'appointment.created'
  }
};
