/**
 * Test Orchestrator
 *
 * Executa o pipeline completo de testes para um agente:
 * gerar casos → rodar suite → red team → score → auto-fix.
 */

import { generateTestCases } from './testGenerator.js';
import { runTestSuite } from './testRunner.js';
import { runRedTeam } from './redTeam.js';
import { calculateScore } from './scoringEngine.js';
import { generateFixes } from './autoFixEngine.js';
import { logger } from '../../utils/logger.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';

/**
 * @param {Object} agent - dados do agente (id, name, type, description, tools)
 * @param {Object} options
 * @param {string} [options.mode]
 * @returns {Promise<Object>} relatório completo de testes
 */
export async function runFullTestPipeline(agent, options = {}) {
  const supabase = getSupabaseServer();
  let mode = options.mode;
  
  // Auto-detect mode: use 'llm' if Groq key is configured in site_settings for this org
  if (!mode) {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('integrations')
        .single();
      const groqKey = data?.integrations?.groq?.apiKey;
      mode = groqKey ? 'llm' : 'mock';
      logger.info('[testOrchestrator] Auto-detected mode:', mode, '(Groq key:', groqKey ? 'configured' : 'not found', ')');
    } catch (err) {
      logger.debug('[testOrchestrator] Could not check site_settings for Groq key', err.message);
      mode = 'mock';
    }
  } else {
    const existingMode = process.env.AI_MODE || 'mock';
    mode = options.mode || existingMode;
  }
  
  const startedAt = Date.now();

  logger.info('[testOrchestrator] Gerando casos de teste para', agent.name);
  const testCases = await generateTestCases(agent, { useAI: mode === 'llm' ? 'always' : 'never' });

  logger.info('[testOrchestrator] Executando suite de testes');
  const suite = await runTestSuite(agent, testCases, { mode });

  logger.info('[testOrchestrator] Executando AI Red Team');
  const redTeam = await runRedTeam(agent, { mode });

  logger.info('[testOrchestrator] Calculando score');
  const score = calculateScore(suite.results, redTeam, { minScore: options.minScore });

  logger.info('[testOrchestrator] Gerando sugestões de correção');
  const fixes = generateFixes(score, suite.results, redTeam.findings);

  const report = {
    runId: suite.runId,
    agentId: agent.id || agent.name,
    agentName: agent.name,
    mode,
    startedAt: suite.startedAt,
    durationMs: Date.now() - startedAt,
    suite,
    redTeam,
    score,
    fixes,
    verdict: score.publishable ? 'APPROVED' : 'NEEDS_WORK'
  };

  return report;
}

export default { runFullTestPipeline };