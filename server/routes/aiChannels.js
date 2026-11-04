/**
 * AI Channel Rules API Routes
 * 
 * Manages channel routing rules for agent activation/blocking
 */

import express from 'express';
import { getSupabaseServer } from '../lib/supabase-server.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

const getOrgId = async (req) => {
  return req.orgId || req.headers['x-organization-id'] || req.query.organization_id;
};

const getUserId = async (req) => {
  return req.authUserId || req.headers['x-user-id'] || req.query.user_id;
};

/**
 * GET /api/ai/channels/rules
 * List channel rules for organization (with optional agent filter)
 */
router.get('/rules', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const { agent_id, channel_type, is_active } = req.query;

    if (!organizationId) {
      return res.status(400).json({ error: 'organization_id required' });
    }

    const supabase = getSupabaseServer();
    
    let query = supabase
      .from('ai_channel_rules')
      .select(`
        *,
        ai_agents!inner(name, role, type)
      `)
      .eq('organization_id', organizationId);

    if (agent_id) query = query.eq('agent_id', agent_id);
    if (channel_type) query = query.eq('channel_type', channel_type);
    if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');

    query = query.order('priority', { ascending: false }).order('created_at', { ascending: false });

    const { data: rules, error } = await query;

    if (error) throw error;

    // Get connected instances for each channel type
    const { data: whatsappInstances } = await supabase
      .from('whatsapp_instances')
      .select('id, name, status, phone')
      .eq('tenant_id', organizationId);

    const { data: instagramAccounts } = await supabase
      .from('instagram_accounts')
      .select('id, username, status')
      .eq('organization_id', organizationId);

    res.json({ 
      rules: rules || [],
      availableInstances: {
        whatsapp: whatsappInstances || [],
        instagram: instagramAccounts || []
      }
    });
  } catch (error) {
    logger.error('[aiChannels] List rules error', { error: error.message });
    res.status(500).json({ error: 'Failed to list channel rules' });
  }
});

/**
 * POST /api/ai/channels/rules
 * Create channel rule
 */
router.post('/rules', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const userId = await getUserId(req);
    const { 
      agent_id, channel_type, instance_id,
      activation_rules, blocking_rules, schedule, priority
    } = req.body;

    if (!organizationId || !agent_id || !channel_type) {
      return res.status(400).json({ error: 'organizationId, agent_id, channel_type required' });
    }

    const supabase = getSupabaseServer();
    
    // Verify agent belongs to org
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('id')
      .eq('id', agent_id)
      .eq('organization_id', organizationId)
      .single();

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { data: rule, error } = await supabase
      .from('ai_channel_rules')
      .insert({
        organization_id: organizationId,
        agent_id,
        channel_type,
        instance_id,
        activation_rules: activation_rules || {},
        blocking_rules: blocking_rules || {},
        schedule: schedule || {},
        priority: priority || 0,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    // Audit
    await supabase.from('ai_audit_logs').insert({
      organization_id: organizationId,
      actor_id: userId,
      actor_type: 'USER',
      entity_type: 'ai_channel_rule',
      entity_id: rule.id,
      action: 'create',
      after_state: rule
    });

    res.status(201).json({ rule });
  } catch (error) {
    logger.error('[aiChannels] Create rule error', { error: error.message });
    res.status(500).json({ error: 'Failed to create channel rule' });
  }
});

/**
 * PATCH /api/ai/channels/rules/:id
 * Update channel rule
 */
router.patch('/rules/:id', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const userId = await getUserId(req);
    const { id } = req.params;
    const updates = req.body;

    const supabase = getSupabaseServer();
    
    const { data: current } = await supabase
      .from('ai_channel_rules')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (!current) {
      return res.status(404).json({ error: 'Channel rule not found' });
    }

    const allowedFields = [
      'channel_type', 'instance_id', 'activation_rules', 
      'blocking_rules', 'schedule', 'priority', 'is_active'
    ];
    
    const updateData = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }
    updateData.updated_at = new Date().toISOString();

    const { data: rule, error } = await supabase
      .from('ai_channel_rules')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    // Audit
    await supabase.from('ai_audit_logs').insert({
      organization_id: organizationId,
      actor_id: userId,
      actor_type: 'USER',
      entity_type: 'ai_channel_rule',
      entity_id: id,
      action: 'update',
      before_state: current,
      after_state: rule
    });

    res.json({ rule });
  } catch (error) {
    logger.error('[aiChannels] Update rule error', { error: error.message });
    res.status(500).json({ error: 'Failed to update channel rule' });
  }
});

/**
 * DELETE /api/ai/channels/rules/:id
 * Delete channel rule
 */
router.delete('/rules/:id', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const userId = await getUserId(req);
    const { id } = req.params;

    const supabase = getSupabaseServer();
    
    const { data: current } = await supabase
      .from('ai_channel_rules')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (!current) {
      return res.status(404).json({ error: 'Channel rule not found' });
    }

    await supabase
      .from('ai_channel_rules')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    // Audit
    await supabase.from('ai_audit_logs').insert({
      organization_id: organizationId,
      actor_id: userId,
      actor_type: 'USER',
      entity_type: 'ai_channel_rule',
      entity_id: id,
      action: 'delete',
      before_state: current
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('[aiChannels] Delete rule error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete channel rule' });
  }
});

/**
 * POST /api/ai/channels/rules/evaluate
 * Evaluate channel rules for a conversation (used by webhook handlers)
 */
router.post('/rules/evaluate', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);
    const { 
      conversationId, channelType, instanceId, 
      leadId, leadStatus, humanOwnerId, timeOfDay, dayOfWeek
    } = req.body;

    if (!organizationId || !channelType) {
      return res.status(400).json({ error: 'organizationId, channelType required' });
    }

    const supabase = getSupabaseServer();
    
    // Get active rules for this channel type
    const { data: rules } = await supabase
      .from('ai_channel_rules')
      .select(`
        *,
        ai_agents!inner(id, name, status)
      `)
      .eq('organization_id', organizationId)
      .eq('channel_type', channelType)
      .eq('is_active', true)
      .eq('ai_agents.status', 'PUBLISHED')
      .order('priority', { ascending: false });

    if (!rules || rules.length === 0) {
      return res.json({ 
        canAssume: false, 
        reason: 'NO_ACTIVE_RULES',
        matchedRule: null 
      });
    }

    // Evaluate each rule in priority order
    for (const rule of rules) {
      // Check instance match
      if (rule.instance_id && rule.instance_id !== instanceId) {
        continue;
      }

      // Check blocking rules first
      const blocking = rule.blocking_rules || {};
      let blocked = false;
      let blockReason = null;

      if (blocking.humanActive && humanOwnerId) {
        blocked = true;
        blockReason = 'HUMAN_ACTIVE';
      }
      if (blocking.conversationLocked) {
        // Would check conversation state
        blocked = true;
        blockReason = 'CONVERSATION_LOCKED';
      }
      if (blocking.leadStatuses?.includes(leadStatus)) {
        blocked = true;
        blockReason = `LEAD_STATUS_${leadStatus}`;
      }
      if (blocking.outsideHours) {
        // Check schedule
        const schedule = rule.schedule || {};
        if (schedule.timezone) {
          // Check if current time is within working hours
          // Simplified check
        }
      }

      if (blocked) {
        continue; // Try next rule
      }

      // Check activation rules
      const activation = rule.activation_rules || {};
      let canActivate = true;

      if (activation.newContactOnly) {
        // Check if this is a new contact (no previous conversation)
        // Would query conversation_memory
      }
      if (activation.leadStatuses?.length && !activation.leadStatuses?.includes(leadStatus)) {
        canActivate = false;
      }
      if (activation.funnelIds?.length) {
        // Check if lead is in one of these funnels
      }
      if (activation.developmentIds?.length) {
        // Check if lead is interested in these developments
      }
      if (activation.campaignIds?.length) {
        // Check if lead came from these campaigns
      }
      if (activation.workingHoursOnly) {
        // Check schedule
      }

      if (canActivate) {
        return res.json({
          canAssume: true,
          reason: 'RULE_MATCHED',
          matchedRule: {
            id: rule.id,
            agentId: rule.agent_id,
            agentName: rule.ai_agents.name,
            channelType: rule.channel_type,
            instanceId: rule.instance_id
          }
        });
      }
    }

    // No rule matched
    res.json({ 
      canAssume: false, 
      reason: 'NO_MATCHING_RULE',
      matchedRule: null 
    });
  } catch (error) {
    logger.error('[aiChannels] Evaluate error', { error: error.message });
    res.status(500).json({ error: 'Failed to evaluate channel rules' });
  }
});

/**
 * GET /api/ai/channels/instances
 * Get available channel instances for organization
 */
router.get('/instances', async (req, res) => {
  try {
    const organizationId = await getOrgId(req);

    if (!organizationId) {
      return res.status(400).json({ error: 'organization_id required' });
    }

    const supabase = getSupabaseServer();
    
    // WhatsApp instances
    const { data: whatsapp } = await supabase
      .from('whatsapp_instances')
      .select('id, name, status, phone, jid, qr_code')
      .eq('tenant_id', organizationId);

    // Instagram accounts
    const { data: instagram } = await supabase
      .from('instagram_accounts')
      .select('id, username, status, profile_pic_url')
      .eq('organization_id', organizationId);

    // WebChat (sites)
    const { data: sites } = await supabase
      .from('sites')
      .select('id, name, slug, is_live')
      .eq('organization_id', organizationId)
      .eq('is_live', true);

    res.json({ 
      instances: {
        whatsapp: whatsapp || [],
        instagram: instagram || [],
        webchat: sites || []
      }
    });
  } catch (error) {
    logger.error('[aiChannels] Instances error', { error: error.message });
    res.status(500).json({ error: 'Failed to get channel instances' });
  }
});

export default router;