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
};
