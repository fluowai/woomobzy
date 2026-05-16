import Groq from 'groq-sdk';

const MAX_CANDIDATES_FOR_AI = 12;
const MAX_MATCHES = 5;

const moneyMultipliers = {
  mil: 1_000,
  milhao: 1_000_000,
  milhoes: 1_000_000,
  mi: 1_000_000,
  m: 1_000_000,
};

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseCurrencyToken(rawNumber, rawUnit = '') {
  if (!rawNumber) return null;
  const value = Number(String(rawNumber).replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(value)) return null;

  const unit = normalizeText(rawUnit).trim();
  return value * (moneyMultipliers[unit] || 1);
}

function extractBudgetRange(lead) {
  const explicitBudget = Number(lead?.budget || 0);
  const text = normalizeText([
    lead?.notes,
    lead?.campaign,
    lead?.ad_reference,
    lead?.source,
  ].filter(Boolean).join(' '));

  const between = text.match(/entre\s+(?:r\$\s*)?([\d.,]+)\s*(milhoes|milhao|mi|m|mil)?\s+(?:e|a|ate)\s+(?:r\$\s*)?([\d.,]+)\s*(milhoes|milhao|mi|m|mil)?/i);
  if (between) {
    const min = parseCurrencyToken(between[1], between[2] || between[4]);
    const max = parseCurrencyToken(between[3], between[4] || between[2]);
    if (min && max) return { min: Math.min(min, max), max: Math.max(min, max) };
  }

  const upTo = text.match(/(?:ate|maximo|max|orcamento)\s+(?:de\s+)?(?:r\$\s*)?([\d.,]+)\s*(milhoes|milhao|mi|m|mil)?/i);
  if (upTo) {
    const max = parseCurrencyToken(upTo[1], upTo[2]);
    if (max) return { min: null, max };
  }

  return explicitBudget > 0 ? { min: null, max: explicitBudget } : { min: null, max: null };
}

function extractAreaRange(lead) {
  const preferences = lead?.preferences || {};
  const text = normalizeText(lead?.notes || '');
  const explicitMin = Number(preferences.minArea || preferences.min_area || 0);

  const match = text.match(/(?:entre\s+)?([\d.,]+)\s*(?:e|a|ate)?\s*([\d.,]+)?\s*(ha|hectares|hectare|alq|alqueires)?/i);
  if (!match) return explicitMin ? { min: explicitMin, max: null } : { min: null, max: null };

  const unit = normalizeText(match[3] || '');
  if (!['ha', 'hectares', 'hectare', 'alq', 'alqueires'].includes(unit)) {
    return explicitMin ? { min: explicitMin, max: null } : { min: null, max: null };
  }

  const first = Number(match[1].replace(/\./g, '').replace(',', '.'));
  const second = match[2] ? Number(match[2].replace(/\./g, '').replace(',', '.')) : null;
  if (!Number.isFinite(first)) return { min: explicitMin || null, max: null };

  const multiplier = unit.startsWith('alq') ? 2.42 : 1;
  const min = explicitMin || first * multiplier;
  const max = Number.isFinite(second) ? second * multiplier : null;
  return { min: max ? Math.min(min, max) : min, max: max ? Math.max(min, max) : null };
}

function extractDesiredTerms(lead) {
  const text = normalizeText([
    lead?.notes,
    lead?.source,
    lead?.campaign,
    lead?.ad_reference,
    ...(lead?.aptitude_interest || []),
  ].filter(Boolean).join(' '));

  return {
    text,
    wantsRural: /fazenda|sitio|chacara|rural|hectare| hectares| ha |pecuaria|agricultura|gado|soja|cafe|graos/.test(` ${text} `),
    terms: [
      'fazenda',
      'sitio',
      'chacara',
      'pecuaria',
      'agricultura',
      'gado',
      'leite',
      'soja',
      'cafe',
      'graos',
      'lazer',
      'haras',
      'irrigacao',
    ].filter((term) => text.includes(term)),
  };
}

function scoreProperty(lead, property) {
  const budget = extractBudgetRange(lead);
  const area = extractAreaRange(lead);
  const desired = extractDesiredTerms(lead);
  const preferences = lead?.preferences || {};
  const leadStates = preferences.states || preferences.estados || [];
  const propertyText = normalizeText([
    property.title,
    property.description,
    property.property_type,
    property.niche,
    property.city,
    property.state,
    ...(property.aptitude || []),
    JSON.stringify(property.features || {}),
  ].filter(Boolean).join(' '));

  let score = 20;
  const reasons = [];
  const price = Number(property.price || 0);

  if (budget.max) {
    if (budget.min && price >= budget.min && price <= budget.max) {
      score += 34;
      reasons.push('dentro da faixa de investimento');
    } else if (!budget.min && price <= budget.max) {
      score += 30;
      reasons.push('cabe no orcamento informado');
    } else if (price <= budget.max * 1.15) {
      score += 15;
      reasons.push('proximo do orcamento');
    } else {
      score -= 25;
    }
  }

  const typeLooksRural = /fazenda|sitio|chacara|rural|gleba|haras|agropecuaria/.test(propertyText);
  if (desired.wantsRural && typeLooksRural) {
    score += 20;
    reasons.push('perfil rural/fazenda');
  }

  const matchedTerms = desired.terms.filter((term) => propertyText.includes(term));
  if (matchedTerms.length > 0) {
    score += Math.min(20, matchedTerms.length * 5);
    reasons.push(`aderente a ${matchedTerms.slice(0, 3).join(', ')}`);
  }

  const propertyArea = Number(property.total_area_ha || property.features?.areaHectares || 0);
  if (area.min && propertyArea >= area.min && (!area.max || propertyArea <= area.max)) {
    score += 12;
    reasons.push('area compativel');
  }

  if (Array.isArray(leadStates) && leadStates.length > 0) {
    const stateMatch = leadStates.some((state) => normalizeText(state) === normalizeText(property.state));
    if (stateMatch) {
      score += 10;
    reasons.push('estado desejado');
    }
  }

  return {
    property,
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons: reasons.slice(0, 4),
  };
}

function toMatchPayload(match) {
  const property = match.property;
  return {
    property_id: property.id,
    title: property.title,
    price: Number(property.price || 0),
    city: property.city || '',
    state: property.state || '',
    image: Array.isArray(property.images) ? property.images[0] : undefined,
    score: match.score,
    reasons: match.reasons,
  };
}

function buildSummary(matches) {
  if (!matches.length) return 'Nenhum imovel compativel encontrado automaticamente.';
  const best = matches[0];
  return `IA encontrou ${matches.length} imovel(is) compativeis. Melhor opcao: ${best.title} (${best.score}% de aderencia).`;
}

async function rerankWithGroq(lead, candidates) {
  if (!process.env.GROQ_API_KEY || candidates.length === 0) return candidates;

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const model = process.env.GROQ_MATCH_MODEL || 'llama-3.1-8b-instant';
    const completion = await groq.chat.completions.create({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Voce e um especialista em CRM imobiliario rural. Reordene imoveis para um lead e responda somente JSON valido.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            lead: {
              name: lead.name,
              budget: lead.budget,
              notes: lead.notes,
              aptitude_interest: lead.aptitude_interest,
              preferences: lead.preferences,
            },
            candidates: candidates.map((candidate) => ({
              property_id: candidate.property.id,
              title: candidate.property.title,
              price: candidate.property.price,
              city: candidate.property.city,
              state: candidate.property.state,
              property_type: candidate.property.property_type,
              aptitude: candidate.property.aptitude,
              total_area_ha: candidate.property.total_area_ha,
              current_score: candidate.score,
              current_reasons: candidate.reasons,
            })),
            expected_format: {
              matches: [
                {
                  property_id: 'uuid',
                  score: 0,
                  reasons: ['motivo curto em portugues'],
                },
              ],
            },
          }),
        },
      ],
    });

    const content = completion.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.matches)) return candidates;

    const byId = new Map(candidates.map((candidate) => [candidate.property.id, candidate]));
    const reranked = parsed.matches
      .map((item) => {
        const candidate = byId.get(item.property_id);
        if (!candidate) return null;
        return {
          ...candidate,
          score: Math.max(0, Math.min(100, Number(item.score || candidate.score))),
          reasons: Array.isArray(item.reasons) && item.reasons.length > 0
            ? item.reasons.slice(0, 4)
            : candidate.reasons,
        };
      })
      .filter(Boolean);

    return reranked.length ? reranked : candidates;
  } catch (error) {
    console.warn('[LeadMatcher] Groq indisponivel, usando ranking local:', error.message);
    return candidates;
  }
}

export async function matchLeadProperties({ supabase, lead, organizationId, createdBy = null }) {
  if (!lead?.id || !organizationId) return lead;

  const { data: properties, error } = await supabase
    .from('properties')
    .select('id,title,description,price,property_type,niche,status,city,state,aptitude,total_area_ha,features,images')
    .eq('organization_id', organizationId)
    .limit(250);

  if (error) throw error;

  const available = (properties || []).filter((property) => {
    const status = normalizeText(property.status || '');
    return !status || status.includes('dispon') || status.includes('ativo') || status.includes('available');
  });

  const ranked = available
    .map((property) => scoreProperty(lead, property))
    .filter((match) => match.score >= 35)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES_FOR_AI);

  const finalRanked = await rerankWithGroq(lead, ranked);
  const matches = finalRanked
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MATCHES)
    .map(toMatchPayload);

  const matchSummary = buildSummary(matches);
  const matchedAt = new Date().toISOString();

  const { data: updatedLead, error: updateError } = await supabase
    .from('leads')
    .update({
      matched_properties: matches,
      match_summary: matchSummary,
      matched_at: matchedAt,
    })
    .eq('id', lead.id)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (updateError) throw updateError;

  const { error: activityError } = await supabase.from('lead_activities').insert({
    lead_id: lead.id,
    organization_id: organizationId,
    created_by: createdBy,
    type: 'Matchmaking IA',
    description: matchSummary,
    metadata: { matches },
  });

  if (activityError) {
    console.warn('[LeadMatcher] Nao foi possivel registrar atividade:', activityError.message);
  }

  return updatedLead;
}
