/**
 * Test Runner
 *
 * Executa suites de teste contra um agente de IA usando o
 * ConversationGuard + ConversationStateManager. Produz resultados
 * estruturados por caso: pass/fail/alert, com evidência.
 */

import { ConversationGuard } from './conversationGuard.js';
import { getLLMOrchestrator } from './llmProvider.js';
import { logger } from '../../utils/logger.js';

/**
 * @param {Object} agent
 * @param {Array} testCases
 * @param {Object} options
 * @param {Object} [options.orgKeys]
 * @returns {Promise<Object>} { runId, results, summary }
 */
export async function runTestSuite(agent, testCases, options = {}) {
  const mode = 'llm';
  const guard = new ConversationGuard();
  const results = [];
  const startedAt = Date.now();
  const systemPrompt = buildSystemPrompt(agent);

  for (const tc of testCases) {
    let passed = false;
    let evidence = '';
    let error = null;
    let durationMs = 0;

    try {
      const t0 = Date.now();
      const conversationState = buildConversationState(tc);
      const preCheck = await guard.preGenerationCheck(agent, tc.input, conversationState);

      if (!preCheck.passed) {
        passed = tc.category === 'security';
        evidence = `Bloqueado antes da geração: ${preCheck.blocks.map((block) => block.type).join(', ')}`;
      } else {
        const orchestrator = getLLMOrchestrator();
        const response = await orchestrator.chat([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: tc.input }
        ], 'conversation', {
          model: agent.model,
          temperature: agent.model_config?.temperature ?? 0.4,
          maxTokens: agent.model_config?.maxTokens || agent.model_config?.max_tokens || 4096,
          topP: agent.model_config?.topP ?? agent.model_config?.top_p ?? 0.9,
          orgKeys: options.orgKeys
        });

        const postCheck = await guard.postGenerationCheck(agent, response.content, conversationState, {
          toolCalls: response.toolCalls?.map((toolCall) => ({ name: normalizeToolName(toolCall) })) || []
        });
        passed = postCheck.passed && matchesExpectation(response.content, tc.expected);
        evidence = response.content;
        if (!postCheck.passed) {
          evidence += ` [guard: ${postCheck.violations.map((violation) => violation.type).join(', ')}]`;
        }
      }

      durationMs = Date.now() - t0;
    } catch (err) {
      error = err.message;
      passed = false;
    }

    results.push({
      category: tc.category,
      input: tc.input,
      expected: tc.expected,
      passed,
      severity: tc.severity || 'normal',
      evidence: evidence.slice(0, 500),
      error,
      durationMs,
      generatedBy: tc.generatedBy || 'template'
    });
  }

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed && r.severity === 'high').length;
  const alertCount = results.filter(r => !r.passed && r.severity !== 'high').length;

  return {
    runId: `run_${startedAt}`,
    agentId: agent.id || agent.name,
    mode,
    startedAt: new Date(startedAt).toISOString(),
    durationMs: Date.now() - startedAt,
    results,
    summary: {
      total: results.length,
      passed: passedCount,
      failed: failedCount,
      alerts: alertCount,
      passRate: results.length ? Math.round((passedCount / results.length) * 100) : 0
    }
  };
}

function buildSystemPrompt(agent) {
  const prompt = agent.prompt?.full || agent.prompt?.text || agent.prompt?.blocks?.map((block) => block.content).join('\n\n');
  if (prompt) return prompt;
  return `Você é ${agent.name}, ${agent.type}. Responda em português brasileiro como agente imobiliário usando apenas dados verificados.`;
}

function buildConversationState(tc) {
  return {
    intent: inferIntent(tc),
    intentConfidence: 0.9,
    slots: {},
    context: {},
    leadMemory: {},
    messageHistory: [{ role: 'user', content: tc.input, metadata: { category: tc.category } }]
  };
}

function inferIntent(tc) {
  if (tc.category === 'data' || /preço|valor|disponível|imóvel|imoveis|área/i.test(tc.input)) {
    return 'BUY_PROPERTY';
  }
  if (tc.category === 'handoff' || /humano|corretor|atendente/i.test(tc.input)) {
    return 'HANDOFF';
  }
  return 'GENERAL';
}

function normalizeToolName(toolCall) {
  return (toolCall?.function?.name || toolCall?.name || '').replace(/_/g, '.');
}

function matchesExpectation(content, expected) {
  if (!expected) return true;
  const keywords = expected.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const c = content.toLowerCase();
  return keywords.some(k => c.includes(k));
}

export default { runTestSuite };
