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

const { AgentGuardrails } = await import('../services/ai/agentGuardrails.js');

describe('AgentGuardrails', () => {
  beforeEach(() => {
    getSupabaseServer.mockReset();
    getSupabaseServer.mockReturnValue({ from: vi.fn() });
  });

  it('awaits async config when checking rate limit', async () => {
    const guardrails = new AgentGuardrails();
    vi.spyOn(guardrails, '_getGuardrailsConfig').mockResolvedValue({
      strict_context_mode: true,
      rate_limit_per_minute: 1,
      max_conversation_turns: 10,
      allowed_topics: [],
      blocked_topics: [],
      off_topic_redirect_message: 'fora de contexto',
      max_off_topic_attempts: 2,
      off_hours_auto_reply: false,
      off_hours_message: 'fora',
    });

    const first = await guardrails.checkRateLimit(
      '5511999999999',
      'org-1',
      'agent-1'
    );
    const second = await guardrails.checkRateLimit(
      '5511999999999',
      'org-1',
      'agent-1'
    );

    expect(first.exceeded).toBe(false);
    expect(second.exceeded).toBe(true);
    expect(second.limit).toBe(1);
  });

  it('awaits async config when checking conversation length', async () => {
    const guardrails = new AgentGuardrails();
    vi.spyOn(guardrails, '_getGuardrailsConfig').mockResolvedValue({
      strict_context_mode: true,
      rate_limit_per_minute: 10,
      max_conversation_turns: 2,
      allowed_topics: [],
      blocked_topics: [],
      off_topic_redirect_message: 'fora de contexto',
      max_off_topic_attempts: 2,
      off_hours_auto_reply: false,
      off_hours_message: 'fora',
    });

    const tooLong = await guardrails.isConversationTooLong(
      [{}, {}, {}],
      'org-1',
      'agent-1'
    );

    expect(tooLong).toBe(true);
  });

  it('enforces blocked topics and off-hours with safe defaults', async () => {
    const guardrails = new AgentGuardrails();
    vi.spyOn(guardrails, '_getGuardrailsConfig').mockResolvedValue({
      strict_context_mode: true,
      rate_limit_per_minute: 10,
      max_conversation_turns: 10,
      allowed_topics: ['imovel'],
      blocked_topics: ['politica'],
      off_topic_redirect_message: 'fora de contexto',
      max_off_topic_attempts: 2,
      off_hours_auto_reply: true,
      off_hours_message:
        'Estamos fora do horario de atendimento. Deixe sua mensagem que retornamos em breve.',
    });

    const blocked = await guardrails.evaluateInboundPolicy({
      organizationId: 'org-1',
      agentId: 'agent-1',
      content: 'Quero falar de politica',
      workingHours: { start_hour: 8, end_hour: 18 },
      now: new Date('2026-08-15T10:00:00Z'),
    });

    const offHours = await guardrails.evaluateInboundPolicy({
      organizationId: 'org-1',
      agentId: 'agent-1',
      content: 'Preciso de ajuda com um imovel',
      workingHours: { start_hour: 8, end_hour: 18 },
      now: new Date('2026-08-15T22:00:00Z'),
    });

    expect(blocked).toMatchObject({
      allowed: false,
      reason: 'blocked_topic',
    });
    expect(offHours).toMatchObject({
      allowed: false,
      reason: 'off_hours',
    });
    expect(guardrails.buildOffHoursRedirect(offHours.config)).toContain(
      'fora do horario'
    );
  });

  it('does not flag legitimate document or investment messages as sensitive', () => {
    const guardrails = new AgentGuardrails();

    expect(
      guardrails.hasSensitiveContent(
        'Quero entender a documentacao do imovel e a matricula.'
      )
    ).toBe(false);
    expect(
      guardrails.hasSensitiveContent(
        'Busco investimento em apartamento para renda.'
      )
    ).toBe(false);
    expect(guardrails.hasSensitiveContent('Meu CPF e 123.456.789-00')).toBe(
      true
    );
  });
});
