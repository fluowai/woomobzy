import { callApi } from '../src/lib/api';

export interface AIAgent {
  id: string;
  organization_id: string;
  name: string;
  role: string;
  channel: string;
  is_active: boolean;
  status?: string;
  department?: string;
  description?: string;
  operation_mode?: string;
  autonomy_level?: number;
  channel_scope?: string;
  channels?: string[];
  instances?: string[];
  handoff?: Record<string, unknown>;
  workspaces?: string[];
  triggers?: string[];
  permissions?: Record<string, unknown>;
  pipelines?: string[];
  knowledge_sources?: string[];
  default_model_id?: string;
  fallback_model_id?: string;
  temperature?: number;
  max_tokens?: number;
  metrics?: unknown[];
  simulation?: Record<string, unknown>;
  limits?: Record<string, unknown>;
  flow_steps?: AgentFlowStep[];
  personality?: string;
  instructions?: string;
  handoff_rules?: Record<string, unknown>;
  capabilities: string[];
  tools: string[];
  response_style: string;
  working_hours?: Record<string, unknown>;
  created_at: string;
}

export interface AgentFlowStep {
  id: string;
  title: string;
  trigger: string;
  prompt: string;
  action: string;
  enabled?: boolean;
}

export type AIAgentPayload = Partial<Omit<AIAgent, 'id' | 'organization_id' | 'created_at'>>;

export interface ChatMemory {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface AgentQualification {
  id: string;
  rating: number;
  feedback?: string;
  session_id?: string;
  created_at: string;
}

export interface AgentMetrics {
  total_conversations: number;
  total_qualifications: number;
  average_rating: number;
  rating_distribution: Record<number, number>;
}

export interface AutonomyPolicy {
  level: 1 | 2 | 3;
  permissions: {
    canCreateLead: boolean;
    canMoveKanban: boolean;
    canSendMessage: boolean;
    canScheduleVisit: boolean;
    canMatchProperties: boolean;
    canHandoffToHuman: boolean;
    maxBudgetValue: number;
    requireApproval: string[];
  };
}

export interface ToolPermissions {
  lead_qualifier: boolean;
  property_matcher: boolean;
  kanban_mover: boolean;
  visit_scheduler: boolean;
  document_analyzer: boolean;
  followup_creator: boolean;
  human_escalator: boolean;
  message_sender: boolean;
  lead_creator: boolean;
  tag_manager: boolean;
}

export interface ToolDefinition {
  id: string;
  label: string;
  description: string;
}

export interface AgentStateMachineData {
  current: string | null;
  history: Array<{ stepId: string; trigger: string; timestamp: string }>;
  context: Record<string, unknown>;
}

export interface OrchestrationResult {
  agent: { id: string; name: string; role: string } | null;
  reply: string;
  actionPlan: Record<string, unknown>;
  lead: Record<string, unknown> | null;
  stateMachine: AgentStateMachineData;
}

export const aiAgentService = {
  async list() {
    const data = await callApi('/api/ai/agents');
    return (data.agents || []) as AIAgent[];
  },

  async create(agent: AIAgentPayload) {
    const data = await callApi('/api/ai/agents', {
      method: 'POST',
      body: JSON.stringify(agent),
    });
    return data.agent as AIAgent;
  },

  async update(id: string, agent: AIAgentPayload) {
    const data = await callApi(`/api/ai/agents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(agent),
    });
    return data.agent as AIAgent;
  },

  async remove(id: string) {
    return callApi(`/api/ai/agents/${id}`, { method: 'DELETE' });
  },

  async chat(id: string, message: string, sessionId: string) {
    const data = await callApi(`/api/ai/agents/${id}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, session_id: sessionId }),
    });
    return data as { reply: string; agent: { name: string; role: string } };
  },

  async getMemory(id: string, sessionId?: string, limit = 50) {
    const params = new URLSearchParams();
    if (sessionId) params.set('session_id', sessionId);
    params.set('limit', String(limit));
    const data = await callApi(`/api/ai/agents/${id}/memory?${params}`);
    return (data.messages || []) as ChatMemory[];
  },

  async clearMemory(id: string, sessionId?: string) {
    return callApi(`/api/ai/agents/${id}/memory`, {
      method: 'DELETE',
      body: JSON.stringify({ session_id: sessionId }),
    });
  },

  async qualify(id: string, params: { rating: number; feedback?: string; lead_id?: string; session_id?: string }) {
    const data = await callApi(`/api/ai/agents/${id}/qualify`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return data.qualification as AgentQualification;
  },

  async metrics(id: string) {
    const data = await callApi(`/api/ai/agents/${id}/metrics`);
    return data.metrics as AgentMetrics;
  },

  async learn(id: string, params: { input_text: string; output_text: string; was_helpful?: boolean; corrected_output?: string; tags?: string[] }) {
    const data = await callApi(`/api/ai/agents/${id}/learn`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return data.learning;
  },

  // New Orchestrator API
  async listTools() {
    const data = await callApi('/api/ai/tools');
    return (data.tools || []) as ToolDefinition[];
  },

  async orchestrate(params: { message: string; phone: string; session_id?: string; instance_id?: string }) {
    const data = await callApi('/api/ai/orchestrate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return data as OrchestrationResult;
  },

  async getStateMachine(id: string) {
    const data = await callApi(`/api/ai/agents/${id}/state-machine`);
    return data as {
      stateMachine: AgentStateMachineData;
      currentStep: { id: string; title: string; prompt: string; action: string } | null;
      nextStep: { id: string; title: string } | null;
      remainingSteps: string[];
    };
  },

  async getPermissions(id: string) {
    const data = await callApi(`/api/ai/agents/${id}/permissions`);
    return data as {
      autonomyLevel: number;
      autonomyLabel: string;
      toolPermissions: ToolPermissions;
      permissions: AutonomyPolicy;
    };
  },
};
