import { pipecatRuntime } from './pipecatRuntime.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { eventBus, EVENTS } from '../../lib/eventBus.js';

/**
 * Telephony Provider Adapter (Wootech AI Voz)
 * Handlers for SIP / Twilio webhooks to bridge traditional phone calls 
 * into the Pipecat conversational engine.
 */
class TelephonyProvider {
  /**
   * Handles an incoming call webhook from a telephony provider (e.g. Twilio)
   */
  async handleIncomingCallWebhook(req, res) {
    // 1. Extract call data
    const { From, To, CallSid } = req.body;
    console.log(`[Telephony] Incoming call from ${From} to ${To} (CallSid: ${CallSid})`);

    // 2. Resolve Tenant and Agent by destination number
    const supabase = getSupabaseServer();
    const { data: agent, error } = await supabase
      .from('voice_agents')
      .select('id, organization_id, human_transfer_number')
      .eq('human_transfer_number', To) // Simplified mapping
      .eq('is_active', true)
      .limit(1)
      .single();

    if (error || !agent) {
      console.error(`[Telephony] No active agent found for number ${To}`);
      return res.status(404).send('No agent found');
    }

    // 3. Register the call in DB
    const { data: callRecord } = await supabase
      .from('voice_calls')
      .insert({
        organization_id: agent.organization_id,
        agent_id: agent.id,
        direction: 'inbound',
        phone_number: From,
        status: 'in_progress'
      })
      .select()
      .single();

    // 4. Initialize Pipecat Session
    // This connects the telephony audio stream to the Pipecat Engine
    const sessionId = await pipecatRuntime.startSession(
      agent.organization_id, 
      agent.id, 
      { provider: 'twilio', callSid: CallSid }
    );

    // 5. Respond with Provider-specific instructions (e.g. TwiML to connect stream)
    const twiml = `
      <Response>
        <Connect>
          <Stream url="wss://${process.env.WOOTECH_VOICE_STREAM_HOST || 'voice.wootech.com'}/stream/${sessionId}" />
        </Connect>
      </Response>
    `;

    res.type('text/xml');
    res.send(twiml);
  }

  /**
   * Triggers an outbound call (e.g., from an Automation Engine action).
   */
  async triggerOutboundCall(tenantId, leadId, phoneNumber, agentId) {
    console.log(`[Telephony] Triggering outbound call to ${phoneNumber} via Agent ${agentId}`);
    
    // Check feature flag first
    const supabase = getSupabaseServer();
    const { data: flags } = await supabase
      .from('feature_flags')
      .select('ai_outbound_calls_enabled')
      .eq('organization_id', tenantId)
      .single();

    if (!flags?.ai_outbound_calls_enabled) {
      throw new Error('Outbound calls are not enabled for this tenant.');
    }

    // Initialize Pipecat Session before the call even connects
    const sessionId = await pipecatRuntime.startSession(
      tenantId, 
      agentId, 
      { provider: 'twilio', direction: 'outbound' }
    );

    // Record Call
    await supabase.from('voice_calls').insert({
      organization_id: tenantId,
      agent_id: agentId,
      lead_id: leadId,
      direction: 'outbound',
      phone_number: phoneNumber,
      status: 'initiated'
    });

    // In a real implementation, we'd use Twilio API client here to initiate the call
    // and pass the TwiML stream URL to connect it to the session.
    
    return { success: true, session_id: sessionId };
  }
}

export const telephonyProvider = new TelephonyProvider();
