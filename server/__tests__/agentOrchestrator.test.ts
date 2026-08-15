import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSupabaseServer = vi.fn();

vi.mock('../lib/supabase-server.js', () => ({
  getSupabaseServer,
}));

vi.mock('../utils/logger.js', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../services/ai/agentPrompt.js', () => ({
  buildAgentSystemPrompt: vi.fn(() => 'SYSTEM PROMPT'),
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return null;
    }
  },
}));

const { AgentOrchestrator, AGENT_RUNTIME_REGISTRY } =
  await import('../services/ai/agentOrchestrator.js');

describe('AgentOrchestrator', () => {
  beforeEach(() => {
    getSupabaseServer.mockReset();
    getSupabaseServer.mockReturnValue({ from: vi.fn() });
  });

  it('routes to specialists even when share_prompt_with_subagents is false', async () => {
    class TestOrchestrator extends AgentOrchestrator {
      specialistCalls: string[] = [];

      async _loadSubAgents() {
        return [
          { id: 'agenda-agent', role: 'Agenda', tools: ['agenda'] },
          {
            id: 'finance-agent',
            role: 'Financeiro',
            tools: ['simulador-financiamento'],
          },
        ];
      }

      async _detectSpecialists() {
        return [
          {
            specialist: {
              id: 'agenda-agent',
              role: 'Agenda',
              tools: ['agenda'],
            },
            fallback_used: false,
          },
          {
            specialist: {
              id: 'finance-agent',
              role: 'Financeiro',
              tools: ['simulador-financiamento'],
            },
            fallback_used: true,
          },
        ];
      }

      async _runSpecialistConversation({ specialist }: any) {
        this.specialistCalls.push(specialist.id);
        return {
          specialist_id: specialist.id,
          specialist_name: specialist.role || specialist.id,
          tool_calls: [],
          customer_facing_guidance: `guidance:${specialist.id}`,
          summary: `summary:${specialist.id}`,
          recommended_actions: [],
          unresolved_questions: [],
          confidence: 0.8,
          fallback_used: false,
        };
      }

      async _synthesizeSpecialistResults() {
        return 'Resposta sintetizada unica';
      }
    }

    const orchestrator = new TestOrchestrator(null);
    const reply = await orchestrator.processAgentConversation({
      content: 'Quero agendar visita e simular financiamento',
      organizationId: 'org-1',
      agent: {
        id: 'main-agent',
        tools: ['agenda', 'simulador-financiamento'],
        sub_agents: ['agenda-agent', 'finance-agent'],
        share_prompt_with_subagents: false,
      },
      history: [{ role: 'user', content: 'Oi' }],
      leadId: 'lead-1',
    });

    expect(reply).toBe('Resposta sintetizada unica');
    expect(orchestrator.specialistCalls).toEqual([
      'agenda-agent',
      'finance-agent',
    ]);
    expect(orchestrator.getLastExecutionMeta()).toMatchObject({
      route_mode: 'multi',
      fallback_used: true,
    });
  });

  it('falls back to heuristic routing when semantic router is unavailable', async () => {
    const orchestrator = new AgentOrchestrator(null);
    vi.spyOn(orchestrator, '_ensureModel').mockRejectedValueOnce(
      new Error('router down')
    );

    const specialists = [
      { id: 'agenda-agent', role: 'Agenda', tools: ['agenda'] },
      { id: 'docs-agent', role: 'Documentos', tools: ['documentos'] },
    ];

    const selected = await orchestrator._detectSpecialists(
      'Pode agendar uma visita para amanha?',
      specialists,
      [],
      2
    );

    expect(selected[0].specialist.id).toBe('agenda-agent');
    expect(selected[0].fallback_used).toBe(true);
  });

  it('blocks tools outside the allowlist before any database side effect', async () => {
    const from = vi.fn();
    getSupabaseServer.mockReturnValue({ from });

    const orchestrator = new AgentOrchestrator(null);
    const result = await orchestrator.executeToolCall(
      {
        name: 'agendar_visita',
        args: { data_hora: '2026-08-20T14:30:00Z' },
      },
      'org-1',
      'lead-1',
      {
        actorAgent: {
          id: 'agent-1',
          tools: ['matchmaking'],
          autonomy_level: 3,
        },
        requestId: 'req-1',
        sessionId: 'session-1',
      }
    );

    expect(result.erro).toContain('nao habilitada');
    expect(from).not.toHaveBeenCalled();
    expect(result.__trace.status).toBe('blocked');
  });

  it('keeps deterministic idempotency and no side effects when there is no lead', async () => {
    const from = vi.fn();
    getSupabaseServer.mockReturnValue({ from });

    const orchestrator = new AgentOrchestrator(null);
    const call = {
      name: 'agendar_visita',
      args: { data_hora: '2026-08-20T14:30:00Z' },
    };

    const first = await orchestrator.executeToolCall(call, 'org-1', null, {
      actorAgent: {
        id: 'agent-1',
        tools: ['agenda'],
        autonomy_level: 3,
      },
      requestId: 'req-1',
      sessionId: 'session-1',
    });
    const second = await orchestrator.executeToolCall(call, 'org-1', null, {
      actorAgent: {
        id: 'agent-1',
        tools: ['agenda'],
        autonomy_level: 3,
      },
      requestId: 'req-1',
      sessionId: 'session-1',
    });

    expect(first.erro).toContain('Lead nao identificado');
    expect(first.__trace.idempotency_key).toBe(second.__trace.idempotency_key);
    expect(from).toHaveBeenCalledWith('ai_tool_executions');
    expect(from).not.toHaveBeenCalledWith('lead_appointments');
    expect(from).not.toHaveBeenCalledWith('lead_followups');
  });

  it('disables side effects by default for simulation sessions', async () => {
    const from = vi.fn();
    getSupabaseServer.mockReturnValue({ from });

    const orchestrator = new AgentOrchestrator(null);
    const result = await orchestrator.executeToolCall(
      {
        name: 'agendar_visita',
        args: { data_hora: '2026-08-20T14:30:00Z' },
      },
      'org-1',
      'lead-1',
      {
        actorAgent: {
          id: 'agent-1',
          tools: ['agenda'],
          autonomy_level: 3,
        },
        sessionId: 'sim-agent-1',
      }
    );

    expect(result.erro).toContain('Side effects desabilitados');
    expect(from).not.toHaveBeenCalled();
  });

  it('reserves write execution atomically before a side effect', async () => {
    const insert = vi
      .fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({
        error: { code: '23505', message: 'duplicate key' },
      });
    const supabase = { from: vi.fn(() => ({ insert })) };
    const orchestrator = new AgentOrchestrator(null);
    vi.spyOn(orchestrator, '_readToolExecutionLedger').mockResolvedValue(null);
    const trace = {
      name: 'agendar_visita',
      actor_agent_id: null,
      idempotency_key: 'idem-1',
      arguments_hash: 'args-1',
    };

    const first = await orchestrator._claimToolExecutionLedger(
      supabase,
      '00000000-0000-4000-8000-000000000001',
      trace
    );
    const concurrent = await orchestrator._claimToolExecutionLedger(
      supabase,
      '00000000-0000-4000-8000-000000000001',
      trace
    );

    expect(first).toEqual({ acquired: true, replay: null });
    expect(concurrent).toEqual({ acquired: false, replay: null });
    expect(insert).toHaveBeenCalledTimes(2);
  });

  it('exposes runtime metadata that distinguishes channels from callable tools', () => {
    expect(AGENT_RUNTIME_REGISTRY.whatsapp).toMatchObject({
      kind: 'channel',
      callable: false,
    });
    expect(AGENT_RUNTIME_REGISTRY['audio-stt']).toMatchObject({
      kind: 'capability',
      callable: false,
    });
    expect(AGENT_RUNTIME_REGISTRY.documentos).toMatchObject({
      callable: true,
      tools: ['consultar_documentos'],
    });
  });
});
