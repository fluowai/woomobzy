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
  metrics?: unknown[];
  simulation?: Record<string, unknown>;
  limits?: Record<string, unknown>;
  personality?: string;
  instructions?: string;
  handoff_rules?: Record<string, unknown>;
  capabilities: string[];
  tools: string[];
  response_style: string;
  working_hours?: Record<string, unknown>;
  created_at: string;
}

export type AIAgentPayload = Partial<Omit<AIAgent, 'id' | 'organization_id' | 'created_at'>>;

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
};
