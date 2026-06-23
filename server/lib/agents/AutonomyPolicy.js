import { getSupabaseServer } from '../supabase-server.js';

const DEFAULT_POLICY = {
  level: 2,
  permissions: {
    canCreateLead: true,
    canMoveKanban: true,
    canSendMessage: true,
    canScheduleVisit: false,
    canMatchProperties: true,
    canHandoffToHuman: true,
    maxBudgetValue: 0,
    requireApproval: ['schedule_visit', 'close_deal'],
  },
};

const DEFAULT_TOOL_PERMISSIONS = {
  lead_qualifier: true,
  property_matcher: true,
  kanban_mover: true,
  visit_scheduler: false,
  document_analyzer: false,
  followup_creator: true,
  human_escalator: true,
  message_sender: true,
  lead_creator: true,
  tag_manager: true,
};

export class AutonomyPolicy {
  constructor(agent) {
    this.policy = agent?.autonomy_policy || DEFAULT_POLICY;
    this.toolPermissions = agent?.tool_permissions || DEFAULT_TOOL_PERMISSIONS;
    this.level = this.policy.level || 2;
  }

  canUseTool(toolId) {
    return this.toolPermissions[toolId] === true;
  }

  canExecuteAction(actionType, context = {}) {
    const { permissions } = this.policy;

    if (permissions.requireApproval?.includes(actionType)) {
      return { allowed: false, reason: `action_${actionType}_requires_approval` };
    }

    if (context.budget && permissions.maxBudgetValue > 0 && context.budget > permissions.maxBudgetValue) {
      return { allowed: false, reason: 'budget_exceeds_max_allowed' };
    }

    switch (actionType) {
      case 'send_message':
        return { allowed: permissions.canSendMessage, reason: 'cannot_send_message' };
      case 'create_lead':
        return { allowed: permissions.canCreateLead, reason: 'cannot_create_lead' };
      case 'move_kanban':
        return { allowed: permissions.canMoveKanban, reason: 'cannot_move_kanban' };
      case 'schedule_visit':
        return { allowed: permissions.canScheduleVisit, reason: 'cannot_schedule_visit' };
      case 'match_properties':
        return { allowed: permissions.canMatchProperties, reason: 'cannot_match_properties' };
      case 'handoff_human':
        return { allowed: permissions.canHandoffToHuman, reason: 'cannot_handoff_to_human' };
      default:
        return { allowed: false, reason: `unknown_action_${actionType}` };
    }
  }

  getLevel() {
    return this.level;
  }

  getLabel() {
    const labels = { 1: 'Assistido', 2: 'Semiautônomo', 3: 'Autônomo' };
    return labels[this.level] || 'Semiautônomo';
  }

  static async load(agentId, organizationId) {
    const supabase = getSupabaseServer();
    const { data } = await supabase
      .from('ai_agents')
      .select('autonomy_policy, tool_permissions')
      .eq('id', agentId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    return new AutonomyPolicy(data || {});
  }

  static fromAgent(agent) {
    return new AutonomyPolicy(agent);
  }
}
