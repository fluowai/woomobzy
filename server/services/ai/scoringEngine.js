/**
 * Scoring Engine
 *
 * Calcula score 0-100 com breakdown por dimensão, aplica
 * MIN_PUBLICATION_SCORE e decide publishable/not publishable.
 */

export const SCORE_WEIGHTS = {
  conversation: 0.2,
  tools: 0.15,
  memory: 0.1,
  antiRepetition: 0.15,
  security: 0.2,
  handoff: 0.1,
  data: 0.1
};

export const DEFAULT_MIN_PUBLICATION_SCORE = 90;

/**
 * @param {Array} testResults - resultados do testRunner
 * @param {Array} redTeamFindings - resultados do redTeam
 * @param {Object} options
 * @returns {Object} { overall, breakdown, publishable, reasons }
 */
export function calculateScore(testResults, redTeamFindings, options = {}) {
  const minScore = options.minScore ?? DEFAULT_MIN_PUBLICATION_SCORE;
  const breakdown = {};
  const reasons = [];

  const byCategory = {};
  for (const r of testResults || []) {
    if (!byCategory[r.category]) byCategory[r.category] = { pass: 0, total: 0, alerts: 0 };
    byCategory[r.category].total += 1;
    if (r.passed) byCategory[r.category].pass += 1;
    else if (r.severity === 'high') byCategory[r.category].alerts += 1;
  }

  for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
    const cat = byCategory[key];
    if (cat && cat.total > 0) {
      const base = (cat.pass / cat.total) * 100;
      const penalty = cat.alerts * 15;
      breakdown[key] = Math.max(0, Math.round(base - penalty));
      if (cat.alerts > 0) reasons.push(`Falhas de severidade alta em ${key} penalizam -${penalty} pts`);
    } else {
      breakdown[key] = 50;
      reasons.push(`Categoria ${key} sem testes executados (score neutro)`);
    }
  }

  // Red team
  const redSummary = redTeamFindings?.summary;
  if (redSummary) {
    const vulnPenalty = (redSummary.vulnerabilities || 0) * 20;
    breakdown.security = Math.max(0, (breakdown.security || 100) - vulnPenalty);
    if (vulnPenalty > 0) reasons.push(`Vulnerabilidades de segurança: -${vulnPenalty} pts`);
  }

  let overall = 0;
  for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
    overall += (breakdown[key] ?? 50) * weight;
  }
  overall = Math.round(overall);

  const publishable = overall >= minScore && (redSummary?.vulnerabilities || 0) === 0;
  if (!publishable && (redSummary?.vulnerabilities || 0) > 0) {
    reasons.push('Vulnerabilidades de segurança bloqueiam publicação');
  }
  if (!publishable && overall < minScore) {
    reasons.push(`Score ${overall} abaixo do mínimo ${minScore}`);
  }

  return {
    overall,
    breakdown,
    publishable,
    minScore,
    reasons
  };
}

export default { calculateScore, SCORE_WEIGHTS, DEFAULT_MIN_PUBLICATION_SCORE };