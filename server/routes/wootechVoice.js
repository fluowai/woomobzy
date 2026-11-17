import express from 'express';
import { getSupabaseServer } from '../lib/supabase-server.js';
import { verifyAuth } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';

const router = express.Router();

/**
 * Creates a new Voice Agent for a tenant.
 */
router.post('/agents', verifyAuth, requireTenant, async (req, res) => {
  const organizationId = req.orgId;
  const { name, description, type, system_prompt, language } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Nome do agente de voz e obrigatorio.' });
  }
  const supabase = getSupabaseServer();

  try {
    const { data, error } = await supabase
      .from('voice_agents')
      .insert({
        organization_id: organizationId,
        name: String(name).trim(),
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
router.get('/agents', verifyAuth, requireTenant, async (req, res) => {
  const organizationId = req.orgId;
  const supabase = getSupabaseServer();

  try {
    const { data, error } = await supabase
      .from('voice_agents')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (error) throw error;
    res.json({ success: true, agents: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
