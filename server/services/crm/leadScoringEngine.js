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

    const supabase = getSupabaseServer();

    const { data: lead, error: loadError } = await supabase
      .from('leads')
      .select('id, lead_score')
      .eq('id', leadId)
      .eq('organization_id', tenantId)
      .single();

    if (loadError || !lead) {
      throw new Error(`Lead não encontrado para scoring: ${leadId}`);
    }

    const oldScore = Number(lead.lead_score || 0);
    const newScore = Math.max(0, Math.min(100, oldScore + Number(points || 0)));

    const { error: updateError } = await supabase
      .from('leads')
      .update({ lead_score: newScore })
      .eq('id', leadId)
      .eq('organization_id', tenantId);

    if (updateError) {
      throw updateError;
    }

    eventBus.publish(EVENTS.LEAD.SCORE_CHANGED, {
      tenant_id: tenantId,
      lead_id: leadId,
      old_score: oldScore,
      new_score: newScore
    });
  }
}

export const leadScoringEngine = new LeadScoringEngine();
