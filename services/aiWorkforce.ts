import { callApi } from '../src/lib/api';

// AI Provider types
export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'openrouter';
export type AIModel = 'gpt-4o-mini' | 'gpt-4o' | 'claude-3-5-sonnet-20241022' | 'gemini-1.5-pro' | 'gemini-1.5-flash' | 'llama-3.1-8b-instant';

// ============================================================
// Types
// ============================================================

export interface AIOperation {
  id: string;
  organization_id: string;
  name: string;
  segment: string;
  status: string;
  business_model: Record<string, unknown>;
  objectives: string[];
  architecture: Record<string, unknown> | null;
  health_score: number | null;
  last_tested_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  agents_count?: number;
  active_agents_count?: number;
  agents?: AIAgent[];
  workflows?: Record<string, unknown>[];
  channelRules?: Record<string, unknown>[];
}

export interface AIAgent {
  id: string;
  organization_id: string;
  operation_id: string | null;
  name: string;
  type: string;
  role: string;
  description: string | null;
  status: string;
  health_status: string;
  active_version_id: string | null;
  channel_config: Record<string, unknown>;
  metrics: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  versions?: Array<Record<string, unknown>>;
  tools?: Array<Record<string, unknown>>;
  knowledge?: Array<Record<string, unknown>>;
  handoffs?: Array<Record<string, unknown>>;
  channelRules?: Array<Record<string, unknown>>;
  recentTests?: Array<Record<string, unknown>>;
  redTeamIssues?: Array<Record<string, unknown>>;
}

export interface AIChannelRulePayload {
  agent_id: string;
  channel_type: 'whatsapp' | 'instagram' | 'webchat' | string;
  instance_id?: string | null;
  activation_rules?: Record<string, unknown>;
  blocking_rules?: Record<string, unknown>;
  schedule?: Record<string, unknown>;
  priority?: number;
}

export interface OperationMetrics {
  period: string;
  agents: Array<{
    id: string;
    name: string;
    type: string;
    role: string;
    status: string;
    health: string;
    conversations: number;
    successRate: number;
    handoffs: number;
    toolCalls: number;
    avgLatency: number;
    totalTokens: number;
    totalCost: number;
  }>;
  totals: {
    agents: number;
    published: number;
    conversations: number;
    handoffs: number;
    totalTokens: number;
    totalCost: number;
    avgLatency: number;
  };
}

export interface ArchitectResult {
  architecture: {
    name: string;
    description: string;
    agents: Array<Record<string, unknown>>;
    workflows: Array<Record<string, unknown>>;
    globalGuardrails: Record<string, unknown>;
  };
  agents: AIAgent[];
  testPlan: Array<Record<string, unknown>>;
}

export interface ChannelInstances {
  whatsapp: Array<{ id: string; name: string; status: string; phone?: string; jid?: string }>;
  instagram: Array<{ id: string; username: string; status: string }>;
  webchat: Array<{ id: string; name: string; slug: string; is_live: boolean }>;
}

// ============================================================
// Operations
// ============================================================

export const listOperations = async (): Promise<AIOperation[]> => {
  const data = await callApi('/api/ai/operations');
  return data.operations || [];
};

export const getOperation = async (id: string): Promise<AIOperation> => {
  const data = await callApi(`/api/ai/operations/${id}`);
  return data.operation;
};

export const createOperation = async (payload: {
  name: string;
  segment: string;
  businessModel: Record<string, unknown>;
  objectives: string[];
}): Promise<AIOperation> => {
  const data = await callApi('/api/ai/operations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.operation;
};

export const updateOperation = async (
  id: string,
  updates: Partial<Pick<AIOperation, 'name' | 'business_model' | 'objectives' | 'status'>>
): Promise<AIOperation> => {
  const data = await callApi(`/api/ai/operations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return data.operation;
};

export const runArchitect = async (id: string, options?: { provider?: AIProvider; model?: AIModel }): Promise<ArchitectResult> => {
  return callApi(`/api/ai/operations/${id}/architect`, { method: 'POST', body: JSON.stringify(options) });
};

export const publishOperation = async (
  id: string,
  minScore = 90
): Promise<{ success: boolean; message: string; agentsPublished: number }> => {
  return callApi(`/api/ai/operations/${id}/publish`, {
    method: 'POST',
    body: JSON.stringify({ minScore }),
  });
};

export const getOperationMetrics = async (
  id: string,
  period = '30d'
): Promise<OperationMetrics> => {
  const data = await callApi(`/api/ai/operations/${id}/metrics?period=${period}`);
  return data.metrics;
};

// ============================================================
// Agents
// ============================================================

export const getAgent = async (id: string): Promise<AIAgent> => {
  const data = await callApi(`/api/ai/agents/${id}`);
  return data.agent;
};

export const updateAgent = async (
  id: string,
  updates: Partial<AIAgent>
): Promise<AIAgent> => {
  const data = await callApi(`/api/ai/agents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return data.agent;
};

export const updateAgentPrompt = async (id: string, promptText: string): Promise<void> => {
  await callApi(`/api/ai/agents/${id}/prompt`, {
    method: 'PATCH',
    body: JSON.stringify({ promptText }),
  });
};

export const updateAgentModel = async (id: string, model: string): Promise<void> => {
  await callApi(`/api/ai/agents/${id}/model`, {
    method: 'PATCH',
    body: JSON.stringify({ model }),
  });
};

export const runFullTest = async (
  agent: Partial<AIAgent>
): Promise<{ success: boolean; report: Record<string, unknown> }> => {
  return callApi('/api/ai/agents/test/full', {
    method: 'POST',
    body: JSON.stringify({ agent }),
  });
};

export const sendAgentMessage = async (
  conversationId: string,
  payload: {
    message: string;
    channel: string;
    instanceId?: string;
    agentId: string;
  }
): Promise<{
  response: string;
  state: Record<string, unknown>;
  toolCalls: string[];
  guardWarnings: string[];
  guardViolations: string[];
  usage: Record<string, unknown>;
  latencyMs: number;
}> => {
  return callApi(`/api/ai/agents/conversations/${conversationId}/message`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// ============================================================
// Channels
// ============================================================

export const getChannelInstances = async (): Promise<ChannelInstances> => {
  const data = await callApi('/api/ai/channels/instances');
  return data.instances;
};

export const listChannelRules = async (): Promise<{
  rules: Array<Record<string, unknown>>;
  availableInstances: { whatsapp: unknown[]; instagram: unknown[] };
}> => {
  return callApi('/api/ai/channels/rules');
};

export const createChannelRule = async (
  payload: AIChannelRulePayload
): Promise<Record<string, unknown>> => {
  const data = await callApi('/api/ai/channels/rules', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.rule;
};
