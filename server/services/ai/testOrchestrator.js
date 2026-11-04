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
 * @param {Object} agent - dados do agente (id, name, type, description, tools, prompt)
 * @param {Object} options
 * @param {string} [options.organizationId]
 * @returns {Promise<Object>} relatório completo de testes
 */
export async function runFullTestPipeline(agent, options = {}) {
  const startedAt = Date.now();
  const mode = 'llm';
  const orgKeys = options.orgKeys || await getOrgKeys(options.organizationId);

  logger.info('[testOrchestrator] Gerando casos de teste para', agent.name);
  const testCases = options.testCases || await generateTestCases(agent, { useAI: 'if-available' });

  logger.info('[testOrchestrator] Executando suite de testes');
  const suite = await runTestSuite(agent, testCases, { orgKeys });

  const redTeam = options.runRedTeam === false
    ? { findings: [], summary: { total: 0, blocked: 0, vulnerabilities: 0, warnings: 0, blockedRate: 0 } }
    : await runRedTeam(agent, { orgKeys });

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

export async function runAgentVersionTestPipeline(agentVersionId, options = {}) {
  const supabase = getSupabaseServer();
  const { data: version, error: versionError } = await supabase
    .from('ai_agent_versions')
    .select(`
      *,
      ai_agents!inner(id, name, type, role, description, organization_id, operation_id)
    `)
    .eq('id', agentVersionId)
    .eq('ai_agents.organization_id', options.organizationId)
    .single();

  if (versionError || !version) {
    throw versionError || new Error('Versao do agente nao encontrada');
  }

  const agent = {
    ...version.ai_agents,
    prompt: version.prompt,
    model: version.model,
    model_config: version.model_config || {},
    tools: Array.isArray(version.tools) ? version.tools : [],
    permissions: version.permissions || [],
    guardrails: version.guardrails || {},
    handoffs: version.handoff_config?.handoffs || version.handoff_config || [],
    memory_config: version.memory_config || {},
    versionId: version.id
  };

  const persistedCases = await loadOrCreateTestCases(supabase, agent, options.testCaseIds);
  const report = await runFullTestPipeline(agent, {
    ...options,
    testCases: persistedCases.map((testCase) => ({
      id: testCase.id,
      category: normalizeRuntimeCategory(testCase.category),
      input: testCase.steps?.[0]?.input || testCase.description || testCase.name,
      expected: testCase.success_criteria?.expected || testCase.description || '',
      severity: testCase.success_criteria?.severity || 'normal',
      generatedBy: testCase.is_ai_generated ? 'ai' : 'template'
    }))
  });

  const primaryRun = await persistReport(supabase, {
    organizationId: options.organizationId,
    agent,
    versionId: version.id,
    report,
    testCases: persistedCases
  });

  return { ...report, persistedRunId: primaryRun?.id || null };
}

async function getOrgKeys(organizationId) {
  if (!organizationId) return null;

  const { data, error } = await getSupabaseServer()
    .from('site_settings')
    .select('integrations')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    logger.warn('[testOrchestrator] Could not load tenant LLM integrations', { error: error.message });
    return null;
  }

  return data?.integrations || null;
}

async function loadOrCreateTestCases(supabase, agent, testCaseIds = []) {
  if (Array.isArray(testCaseIds) && testCaseIds.length > 0) {
    const { data, error } = await supabase
      .from('ai_test_cases')
      .select('*')
      .eq('organization_id', agent.organization_id)
      .eq('agent_id', agent.id)
      .in('id', testCaseIds);

    if (error) throw error;
    return data || [];
  }

  const generated = await generateTestCases(agent, { useAI: 'if-available' });
  const rows = generated.map((testCase, index) => ({
    organization_id: agent.organization_id,
    operation_id: agent.operation_id,
    agent_id: agent.id,
    category: toDbCategory(testCase.category, testCase.input),
    name: `Teste ${index + 1}: ${testCase.category}`,
    description: testCase.input,
    steps: [{ input: testCase.input }],
    success_criteria: {
      expected: testCase.expected,
      severity: testCase.severity || 'normal',
      runtimeCategory: testCase.category,
      generatedBy: testCase.generatedBy || 'template'
    },
    is_ai_generated: testCase.generatedBy === 'ai'
  }));

  const { data, error } = await supabase
    .from('ai_test_cases')
    .insert(rows)
    .select();

  if (error) throw error;
  return data || [];
}

async function persistReport(supabase, { organizationId, agent, versionId, report, testCases }) {
  const now = new Date().toISOString();
  const rows = report.suite.results.map((result, index) => {
    const testCase = testCases[index];
    return {
      test_case_id: testCase.id,
      agent_version_id: versionId,
      status: result.error ? 'ERROR' : result.passed ? 'PASSED' : 'FAILED',
      score: result.passed ? 100 : 0,
      results: result,
      execution_time_ms: result.durationMs || 0,
      error_message: result.error,
      completed_at: now
    };
  });

  const { data: runs, error: runsError } = await supabase
    .from('ai_test_runs')
    .insert(rows)
    .select();

  if (runsError) throw runsError;

  const { error: versionUpdateError } = await supabase
    .from('ai_agent_versions')
    .update({
      test_results: report,
      score: report.score.overall
    })
    .eq('id', versionId);

  if (versionUpdateError) throw versionUpdateError;

  const agentStatus = report.score.publishable ? 'APPROVED' : 'ERROR';
  const { error: agentUpdateError } = await supabase
    .from('ai_agents')
    .update({
      status: agentStatus,
      health_status: report.score.publishable ? 'GOOD' : 'ATTENTION',
      metrics: {
        ...(agent.metrics || {}),
        lastTestRunId: runs?.[0]?.id || null,
        lastTestedAt: now,
        lastScore: report.score.overall
      },
      updated_at: now
    })
    .eq('id', agent.id)
    .eq('organization_id', organizationId);

  if (agentUpdateError) throw agentUpdateError;

  const { error: operationUpdateError } = await supabase
    .from('ai_operations')
    .update({
      status: report.score.publishable ? 'APPROVED' : 'TESTING',
      health_score: report.score.overall,
      last_tested_at: now,
      updated_at: now
    })
    .eq('id', agent.operation_id)
    .eq('organization_id', organizationId);

  if (operationUpdateError) throw operationUpdateError;

  if (report.redTeam.findings.length > 0) {
    const findings = report.redTeam.findings
      .filter((finding) => !finding.blocked || finding.error)
      .map((finding) => ({
        agent_version_id: versionId,
        category: toRedTeamCategory(finding.vector),
        severity: finding.severity === 'high' ? 'HIGH' : 'MEDIUM',
        title: finding.vectorLabel,
        description: finding.error || 'Ataque nao foi bloqueado pela resposta do agente.',
        reproduction_steps: [{ input: finding.attack }],
        evidence: { response: finding.evidence, expectedDefense: finding.defenseExpected },
        suggested_fix: 'Revisar prompt, guardrails e ferramentas antes de publicar.',
        status: 'OPEN'
      }));

    if (findings.length > 0) {
      const { error: redTeamError } = await supabase.from('ai_red_team_results').insert(findings);
      if (redTeamError) throw redTeamError;
    }
  }

  await supabase.from('ai_audit_logs').insert({
    organization_id: organizationId,
    actor_type: 'AI',
    entity_type: 'ai_agent_version',
    entity_id: versionId,
    action: 'test_run',
    after_state: {
      score: report.score.overall,
      verdict: report.verdict,
      runId: runs?.[0]?.id || null
    }
  });

  return runs?.[0] || null;
}

function normalizeRuntimeCategory(category) {
  const map = {
    HAPPY_PATH: 'conversation',
    REPEATED_QUESTIONS: 'anti_repetition',
    CONFUSED_USER: 'conversation',
    INTENT_CHANGE: 'handoff',
    ANGRY_USER: 'handoff',
    INCOMPLETE_DATA: 'data',
    CONTRADICTORY_DATA: 'data',
    INTERNAL_INFO_ATTEMPT: 'security',
    PROMPT_INJECTION: 'security',
    HUMAN_REQUEST: 'handoff',
    UNKNOWN_PROPERTY: 'data',
    UNKNOWN_PRICE: 'data',
    TOOL_UNAVAILABLE: 'tools',
    TIMEOUT: 'conversation',
    CRM_UNAVAILABLE: 'tools',
    EMPTY_MESSAGE: 'conversation',
    AUDIO_INPUT: 'conversation',
    IMAGE_INPUT: 'conversation',
    DOCUMENT_INPUT: 'data',
    SHORT_RESPONSE: 'conversation',
    LONG_CONVERSATION: 'memory'
  };
  return map[category] || category;
}

function toDbCategory(category, input = '') {
  const normalized = String(category || '').toLowerCase();
  if (normalized === 'security') return /prompt|instru/i.test(input) ? 'PROMPT_INJECTION' : 'INTERNAL_INFO_ATTEMPT';
  if (normalized === 'anti_repetition') return 'REPEATED_QUESTIONS';
  if (normalized === 'handoff') return 'HUMAN_REQUEST';
  if (normalized === 'tools') return 'TOOL_UNAVAILABLE';
  if (normalized === 'data') return /preço|valor/i.test(input) ? 'UNKNOWN_PRICE' : 'UNKNOWN_PROPERTY';
  if (normalized === 'memory') return 'LONG_CONVERSATION';
  return 'HAPPY_PATH';
}

function toRedTeamCategory(vector) {
  const map = {
    prompt_injection: 'PROMPT_INJECTION',
    data_exfiltration: 'DATA_EXPOSURE',
    tenant_breach: 'DATA_EXPOSURE',
    hallucination: 'HALLUCINATION',
    repetition: 'REPETITION',
    social_engineering: 'SECURITY'
  };
  return map[vector] || 'SECURITY';
}

export default { runFullTestPipeline, runAgentVersionTestPipeline };
