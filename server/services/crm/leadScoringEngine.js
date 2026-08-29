import { eventBus, EVENTS } from '../../lib/eventBus.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';

/**
 * Lead Scoring Engine
 * Listens to interactions and increments lead scores based on configured rules.
 */
class LeadScoringEngine {
  constructor() {
    this.scoreMap = {
      [EVENTS.EMAIL.DELIVERED]: 1,
      [EVENTS.EMAIL.OPENED]: 5,
      [EVENTS.EMAIL.CLICKED]: 15,
      [EVENTS.PROPERTY.VIEWED]: 15,
      [EVENTS.WHATSAPP.RECEIVED]: 20,
      [EVENTS.VOICE.COMPLETED]: 20,
      [EVENTS.APPOINTMENT.CREATED]: 50
    };
    
    this.initListeners();
  }

  initListeners() {
    // We can iterate over the scoreMap keys to attach listeners dynamically
    Object.keys(this.scoreMap).forEach(eventType => {
      eventBus.subscribe(eventType, async (payload) => {
        const { tenant_id, lead_id } = payload;
        if (!tenant_id || !lead_id) return;

        const points = this.scoreMap[eventType];
        await this.incrementScore(tenant_id, lead_id, points);
      });
    });
  }

  async incrementScore(tenantId, leadId, points) {
    console.log(`[LeadScoring] Incrementing score for lead ${leadId} by ${points} points.`);
    
    /* 
    const supabase = getSupabaseServer();
    
    // In production, we'd do an atomic increment via an RPC or query:
    const { data: updatedLead } = await supabase
      .rpc('increment_lead_score', { p_lead_id: leadId, p_points: points });

    eventBus.publish(EVENTS.LEAD.SCORE_CHANGED, {
      tenant_id: tenantId,
      lead_id: leadId,
      old_score: updatedLead.old_score,
      new_score: updatedLead.new_score
    });
    */

    // Simulate for Phase 6
    const simulatedNewScore = 55; // Imagine old was 50, points = 5
    
    eventBus.publish(EVENTS.LEAD.SCORE_CHANGED, {
      tenant_id: tenantId,
      lead_id: leadId,
      old_score: 50,
      new_score: simulatedNewScore
    });
  }
}

export const leadScoringEngine = new LeadScoringEngine();
