import express from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { requireTenant } from '../../middleware/tenant.js';

const router = express.Router();

/**
 * Wootech Global Analytics
 * Provides high-level dashboards for tokens, minutes, emails, and cost.
 * Mounted on /api/wootech-services/analytics
 */

router.get('/dashboard', requireTenant, async (req, res) => {
  const { tenant_id } = req;
  const supabase = getSupabaseServer();

  try {
    // 1. Fetch AI Voice Usage (Tokens, Costs, Calls)
    const { data: voiceCalls, error: voiceError } = await supabase
      .from('voice_calls')
      .select('duration_seconds, llm_tokens_used, cost_estimated')
      .eq('organization_id', tenant_id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

    if (voiceError) throw voiceError;

    const voiceMetrics = voiceCalls.reduce((acc, call) => {
      acc.total_calls++;
      acc.total_minutes += (call.duration_seconds || 0) / 60;
      acc.total_tokens += (call.llm_tokens_used || 0);
      acc.total_cost += parseFloat(call.cost_estimated || 0);
      return acc;
    }, { total_calls: 0, total_minutes: 0, total_tokens: 0, total_cost: 0 });

    // 2. Fetch Email Usage (Marketing vs Transactional)
    // Simulated since we rely on external BillionMail stats usually, 
    // or aggregate from customer_interactions timeline.
    const { count: emailsSent, error: emailError } = await supabase
      .from('customer_interactions')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', tenant_id)
      .eq('channel', 'email')
      .eq('direction', 'outbound')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (emailError) throw emailError;

    // 3. Return Payload
    res.json({
      success: true,
      period: '30d',
      metrics: {
        voice: voiceMetrics,
        mail: {
          total_sent: emailsSent || 0
        },
        billing: {
          estimated_total_cost: voiceMetrics.total_cost // Add mail cost logic later
        }
      }
    });

  } catch (err) {
    console.error('[WootechAnalytics] Error fetching dashboard data:', err);
    res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
});

export default router;
