import { eventBus, EVENTS } from '../../lib/eventBus.js';
import { telephonyProvider } from '../ai/telephonyProvider.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';

/**
 * Wootech Automation Engine
 * Evaluates triggers against visual workflow conditions and executes actions.
 * Multi-channel capable (WhatsApp, Email, Voice, Tasks).
 */
class AutomationEngine {
  constructor() {
    this.initListeners();
  }

  /**
   * Listens to the global Event Bus.
   */
  initListeners() {
    // Example: When a lead is created
    eventBus.subscribe(EVENTS.LEAD.CREATED, async (payload) => {
      this.evaluateFlows(EVENTS.LEAD.CREATED, payload);
    });

    // Example: When an email is opened
    eventBus.subscribe(EVENTS.EMAIL.OPENED, async (payload) => {
      this.evaluateFlows(EVENTS.EMAIL.OPENED, payload);
    });

    // Example: When lead score crosses a threshold
    eventBus.subscribe(EVENTS.LEAD.SCORE_CHANGED, async (payload) => {
      this.evaluateFlows(EVENTS.LEAD.SCORE_CHANGED, payload);
    });
  }

  /**
   * Evaluates active automation flows for the tenant triggered by a specific event.
   */
  async evaluateFlows(triggerType, payload) {
    const { tenant_id } = payload;
    if (!tenant_id) return;

    // Fetch active flows for this tenant and trigger
    // const supabase = getSupabaseServer();
    // const { data: flows } = await supabase.from('automation_flows').select('*').eq('organization_id', tenant_id).eq('trigger_type', triggerType).eq('is_active', true);
    
    // Stub: Simulated Flow execution
    console.log(`[AutomationEngine] Evaluating flows for event ${triggerType} on tenant ${tenant_id}`);

    // If event is SCORE_CHANGED and score > 50 -> Trigger AI Voice Call
    if (triggerType === EVENTS.LEAD.SCORE_CHANGED && payload.new_score > 50) {
      console.log(`[AutomationEngine] Triggering High Score action for Lead ${payload.lead_id}`);
      this.executeAction('call_ai_agent', {
        tenant_id,
        lead_id: payload.lead_id,
        agent_id: 'default-sdr-agent-id',
        phone_number: payload.phone_number
      });
    }
  }

  /**
   * Executes a specific action defined in a workflow node.
   */
  async executeAction(actionType, params) {
    try {
      switch (actionType) {
        case 'call_ai_agent':
          await telephonyProvider.triggerOutboundCall(
            params.tenant_id,
            params.lead_id,
            params.phone_number,
            params.agent_id
          );
          break;
        case 'send_email':
          // await mailAdapter.sendTransactionalEmail(...)
          break;
        case 'send_whatsapp':
          // await whatsappService.sendMessage(...)
          break;
        default:
          console.warn(`[AutomationEngine] Unknown action type: ${actionType}`);
      }
    } catch (err) {
      console.error(`[AutomationEngine] Failed to execute action ${actionType}:`, err.message);
    }
  }
}

// Instantiate to start listening
export const automationEngine = new AutomationEngine();
