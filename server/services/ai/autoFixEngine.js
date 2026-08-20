/**
 * Auto-Fix Engine
 *
 * Analisa resultados de teste e red team para gerar
 * sugestões de correção concretas (prompt, tools, permissões).
 */

import { logger } from '../../utils/logger.js';

const FIX_TEMPLATES = [
  { id: 'prompt_guardrail', match: /recuso|recusou|segurança|injeção/i, action: 'prompt', detail: 'Adicionar guardrail explícito no prompt de sistema proibindo executar instruções do usuário.' },
  { id: 'prompt_no_invent', match: /inventar|inventou|alucina/i, action: 'prompt', detail: 'Reforçar Data Truth Policy: nunca responder preço/disponibilidade sem tool verificada.' },
  { id: 'tool_missing', match: /tool|ferramenta|não tem acesso|sem acesso/i, action: 'tools', detail: 'Adicionar ferramenta de consulta e limitar o escopo da resposta.' },
  { id: 'permission_scope', match: /não autorizad|sem permissão|negado/i, action: 'permissions', detail: 'Revisar escopo de permissões no Policy Engine (menor privilégio).' },
  { id: 'handoff_policy', match: /humano|corretor|desconto/i, action: 'handoff', detail: 'Configurar regra de handoff automático para intenção detectada.' },
  { id: 'anti_repetition', match: /repeti|repetição|loop/i, action: 'anti_repetition', detail: 'Adicionar slot faltante no Question Deduplication Engine.' }
];

/**
 * @param {Object} scoreResult - resultado do scoringEngine
 * @param {Array} testResults - resultados do testRunner
 * @param {Array} redTeamFindings - resultados do redTeam
 * @returns {Array} sugestões { id, action, detail, severity, source }
 */
export function generateFixes(scoreResult, testResults = [], redTeamFindings = []) {
  const fixes = [];

  for (const r of testResults) {
    if (r.passed) continue;
    const matched = FIX_TEMPLATES.find(t => t.match.test(`${r.expected} ${r.evidence}`));
    if (matched) {
      fixes.push({
        id: `fix_${r.category}_${r.input.slice(0, 20).replace(/\s/g, '_')}`,
        action: matched.action,
        detail: matched.detail,
        severity: r.severity || 'normal',
        source: 'test',
        category: r.category
      });
    }
  }

  for (const f of redTeamFindings) {
    if (f.blocked) continue;
    fixes.push({
      id: `fix_rt_${f.vector}`,
      action: 'prompt',
      detail: `Bloquear vetor "${f.vectorLabel}": adicionar defesa explícita contra o tipo de ataque.`,
      severity: f.severity,
      source: 'red_team',
      category: f.vector
    });
  }

  // Deduplicate
  const seen = new Set();
  const unique = fixes.filter(f => {
    const key = `${f.action}:${f.category}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique;
}

export default { generateFixes };