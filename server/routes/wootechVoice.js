import express from 'express';
import { getSupabaseServer } from '../lib/supabase-server.js';
import { requireTenant } from '../middleware/tenant.js';

const router = express.Router();

/**
 * Creates a new Voice Agent for a tenant.
 */
router.post('/agents', requireTenant, async (req, res) => {
  const { tenant_id } = req;
  const { name, description, type, system_prompt, language } = req.body;
  const supabase = getSupabaseServer();

  try {
    const { data, error } = await supabase
      .from('voice_agents')
      .insert({
        organization_id: tenant_id,
        name,
        description,
        type,
        system_prompt,
        language
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, agent: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Lists all Voice Agents for a tenant.
 */
router.get('/agents', requireTenant, async (req, res) => {
  const { tenant_id } = req;
  const supabase = getSupabaseServer();

  try {
    const { data, error } = await supabase
      .from('voice_agents')
      .select('*')
      .eq('organization_id', tenant_id)
      .eq('is_active', true);

    if (error) throw error;
    res.json({ success: true, agents: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
