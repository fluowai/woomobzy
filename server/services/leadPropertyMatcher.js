import Groq from 'groq-sdk';

const MAX_CANDIDATES_FOR_AI = 12;
const MAX_MATCHES = 5;
const MATCH_VERSION = 'imobzy-match-v2';
const MISSING_MATCH_COLUMNS_HINT = 'match_summary';

const URBAN_KEYWORDS = [
  'apartamento',
  'casa',
  'cobertura',
  'condominio',
  'bairro',
  'sala comercial',
  'financiamento',
  'metragem urbana',
  'sobrado',
  'terreno urbano',
  'galpao urbano',
];

const RURAL_KEYWORDS = [
  'sitio',
  'fazenda',
  'chacara',
  'hectares',
  'hectare',
  'alqueires',
  'alqueire',
  'pasto',
  'lavoura',
  'pecuaria',
  'area rural',
  'acesso rural',
  'terra produtiva',
  'gleba',
  'agricola',
  'agropecuaria',
];

const URBAN_TYPES = [
  'apartamento',
  'casa',
  'sobrado',
  'terreno urbano',
  'sala comercial',
  'galpao urbano',
  'cobertura',
  'loft',
  'studio',
];

const RURAL_TYPES = [
  'sitio',
  'fazenda',
  'chacara',
  'gleba',
  'area rural',
  'terra produtiva',
  'propriedade agricola',
  'propriedade pecuaria',
  'haras',
  'granja',
  'lote rural',
];

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
    .toLowerCase()
    .trim();
}

function textIncludesAny(text, keywords) {
  const normalized = ` ${normalizeText(text)} `;
  return keywords.some((keyword) => normalized.includes(` ${normalizeText(keyword)} `) || normalized.includes(normalizeText(keyword)));
}

function parseCurrencyToken(rawNumber, rawUnit = '') {
  if (!rawNumber) return null;
  const value = Number(String(rawNumber).replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(value)) return null;
  const unit = normalizeText(rawUnit);
  return value * (moneyMultipliers[unit] || 1);
}

function parseNumber(rawNumber) {
  const value = Number(String(rawNumber || '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

function leadText(lead) {
  return [
    lead?.name,
    lead?.notes,
    lead?.campaign,
    lead?.ad_reference,
    lead?.organic_channel,
    lead?.source,
    lead?.preferences ? JSON.stringify(lead.preferences) : '',
    ...(lead?.aptitude_interest || []),
  ].filter(Boolean).join(' ');
}

function propertyText(property) {
  return [
    property?.title,
    property?.description,
    property?.property_type,
    property?.niche,
    property?.city,
    property?.neighborhood,
    property?.state,
    ...(property?.aptitude || []),
    property?.features ? JSON.stringify(property.features) : '',
  ].filter(Boolean).join(' ');
}

function classifyLeadProfile(lead) {
  const text = leadText(lead);
  const urbanHits = URBAN_KEYWORDS.filter((keyword) => normalizeText(text).includes(normalizeText(keyword))).length;
  const ruralHits = RURAL_KEYWORDS.filter((keyword) => normalizeText(text).includes(normalizeText(keyword))).length;

  if (urbanHits > 0 && ruralHits > 0) return 'misto';
  if (ruralHits > 0) return 'rural';
  if (urbanHits > 0) return 'urbano';
  return 'indefinido';
}

function extractBudgetRange(lead) {
  const explicitBudget = Number(lead?.budget || lead?.max_budget || 0);
  const text = normalizeText(leadText(lead));

  const between = text.match(/entre\s+(?:r\$\s*)?([\d.,]+)\s*(milhoes|milhao|mi|m|mil)?\s+(?:e|a|ate)\s+(?:r\$\s*)?([\d.,]+)\s*(milhoes|milhao|mi|m|mil)?/i);
  if (between) {
    const min = parseCurrencyToken(between[1], between[2] || between[4]);
    const max = parseCurrencyToken(between[3], between[4] || between[2]);
    if (min && max) return { min: Math.min(min, max), max: Math.max(min, max) };
  }

  const upTo = text.match(/(?:ate|maximo|max|orcamento|budget)\s+(?:de\s+)?(?:r\$\s*)?([\d.,]+)\s*(milhoes|milhao|mi|m|mil)?/i);
  if (upTo) {
    const max = parseCurrencyToken(upTo[1], upTo[2]);
    if (max) return { min: null, max };
  }

  return explicitBudget > 0 ? { min: null, max: explicitBudget } : { min: null, max: null };
}

function extractUrbanPreferences(lead) {
  const preferences = lead?.preferences || {};
  const text = normalizeText(leadText(lead));
  const rooms = text.match(/(\d+)\s*(quartos|dormitorios|dorms|suites?)/);
  const parking = text.match(/(\d+)\s*(vagas?|garagens?)/);
  const area = text.match(/(?:minimo|min|acima de|com)?\s*([\d.,]+)\s*(m2|m\²|metros|metro quadrado|m quadrados)/);

  return {
    city: normalizeText(preferences.city || preferences.cidade || ''),
    neighborhood: normalizeText(preferences.neighborhood || preferences.bairro || ''),
    type: normalizeText(preferences.type || preferences.tipo || ''),
    budget: extractBudgetRange(lead),
    rooms: Number(preferences.quartos || preferences.rooms || parseNumber(rooms?.[1]) || 0),
    parking: Number(preferences.vagas || preferences.parking || parseNumber(parking?.[1]) || 0),
    minAreaM2: Number(preferences.metragemMin || preferences.minAreaM2 || parseNumber(area?.[1]) || 0),
    wantsFinancing: /financiamento|financiar|financiavel/.test(text),
    secondaryTerms: ['condominio', 'escola', 'hospital', 'comercio', 'transporte', 'seguranca', 'lazer']
      .filter((term) => text.includes(term)),
  };
}

function extractRuralPreferences(lead) {
  const preferences = lead?.preferences || {};
  const text = normalizeText(leadText(lead));
  const area = text.match(/(?:entre\s+)?([\d.,]+)\s*(?:e|a|ate)?\s*([\d.,]+)?\s*(ha|hectares|hectare|alq|alqueires)/);
  const firstArea = parseNumber(area?.[1]);
  const secondArea = parseNumber(area?.[2]);
  const multiplier = normalizeText(area?.[3]).startsWith('alq') ? 2.42 : 1;
  const areaMin = Number(preferences.hectaresMin || preferences.minArea || (firstArea ? firstArea * multiplier : 0));
  const areaMax = Number(preferences.hectaresMax || (secondArea ? secondArea * multiplier : 0));

  return {
    region: normalizeText(preferences.region || preferences.regiao || ''),
    city: normalizeText(preferences.city || preferences.cidade || ''),
    type: normalizeText(preferences.type || preferences.tipoPropriedade || preferences.tipo || ''),
    budget: extractBudgetRange(lead),
    hectaresMin: areaMax ? Math.min(areaMin, areaMax) : areaMin,
    hectaresMax: areaMax ? Math.max(areaMin, areaMax) : 0,
    purpose: [
      'pecuaria',
      'agricultura',
      'lavoura',
      'soja',
      'cafe',
      'graos',
      'gado',
      'leite',
      'lazer',
      'moradia',
      'investimento',
    ].find((term) => text.includes(term)) || normalizeText(preferences.finalidade || ''),
    needsWater: /agua|rio|nascente|represa|poco|corrego/.test(text) || Boolean(preferences.precisaAgua),
    needsEnergy: /energia|luz|eletrica/.test(text) || Boolean(preferences.precisaEnergia),
    needsDocumentation: /documentacao|escritura|car|ccir|geo|itr/.test(text) || Boolean(preferences.precisaDocumentacao),
    secondaryTerms: ['topografia', 'solo', 'curral', 'barracao', 'casa sede', 'pastagem', 'rio', 'nascente', 'aptao', 'aptidao']
      .filter((term) => text.includes(term)),
  };
}

function getFeature(property, paths, fallback = null) {
  for (const path of paths) {
    const value = path.split('.').reduce((current, key) => current?.[key], property);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function propertyKind(property) {
  const text = normalizeText(propertyText(property));
  if (textIncludesAny(text, RURAL_TYPES) || text.includes('rural') || property?.niche === 'rural') return 'rural';
  if (textIncludesAny(text, URBAN_TYPES) || property?.niche === 'urbano') return 'urbano';
  return 'indefinido';
}

function isActiveProperty(property) {
  const status = normalizeText(property?.status || '');
  if (!status) return true;
  if (/vendido|reservado|alugado|inativo|indisponivel|pendente/.test(status)) return false;
  return /ativo|disponivel|available|publicado/.test(status);
}

function scorePrice(price, range, weight, reasons) {
  if (!price || (!range.min && !range.max)) return 0;
  if (range.min && range.max && price >= range.min && price <= range.max) {
    reasons.push('Compatível com faixa de preço');
    return weight;
  }
  if (!range.min && range.max && price <= range.max) {
    reasons.push('Compatível com faixa de preço');
    return weight;
  }
  if (range.max && price <= range.max * 1.15) {
    reasons.push('Próximo da faixa de preço informada');
    return Math.round(weight * 0.5);
  }
  return 0;
}

function classifyScore(score) {
  if (score >= 80) return 'Match Quente';
  if (score >= 60) return 'Match Médio';
  if (score >= 40) return 'Match Fraco';
  return 'Sem Match';
}

function scoreUrbanProperty(lead, property) {
  const prefs = extractUrbanPreferences(lead);
  const text = normalizeText(propertyText(property));
  const features = property?.features || {};
  const reasons = [];
  let score = 0;

  const propertyCity = normalizeText(property.city || getFeature(property, ['location.city', 'features.location.city'], ''));
  const propertyNeighborhood = normalizeText(property.neighborhood || getFeature(property, ['location.neighborhood', 'features.location.neighborhood'], ''));
  const propertyType = normalizeText(property.property_type || property.type || '');
  const price = Number(property.price || 0);
  const bedrooms = Number(getFeature(property, ['bedrooms', 'features.dormitorios', 'features.rooms', 'features.urban.bedrooms'], 0));
  const parking = Number(getFeature(property, ['parking_spaces', 'features.vagas', 'features.parking', 'features.urban.parking'], 0));
  const areaM2 = Number(getFeature(property, ['building_area', 'features.areaM2', 'features.areaConstruida', 'features.urban.areaConstruida'], 0));

  if (prefs.city && propertyCity === prefs.city) {
    score += 20;
    reasons.push('Cidade solicitada');
  }
  if (prefs.neighborhood && propertyNeighborhood === prefs.neighborhood) {
    score += 20;
    reasons.push('Bairro solicitado');
  }
  score += scorePrice(price, prefs.budget, 25, reasons);
  if (prefs.type && propertyType.includes(prefs.type)) {
    score += 15;
    reasons.push('Tipo de imóvel compatível');
  } else if (!prefs.type && propertyKind(property) === 'urbano') {
    score += 8;
    reasons.push('Perfil urbano compatível');
  }
  if (prefs.rooms && bedrooms >= prefs.rooms) {
    score += 10;
    reasons.push('Quantidade de quartos atende ao perfil');
  }
  if (prefs.parking && parking >= prefs.parking) {
    score += 5;
    reasons.push('Possui vagas desejadas');
  }
  if (prefs.minAreaM2 && areaM2 >= prefs.minAreaM2) {
    score += 5;
    reasons.push('Possui metragem desejada');
  }

  const secondaryHits = prefs.secondaryTerms.filter((term) => text.includes(term));
  if (secondaryHits.length) {
    score += Math.min(5, secondaryHits.length * 2);
    reasons.push(`Diferenciais: ${secondaryHits.slice(0, 3).join(', ')}`);
  }
  if (prefs.wantsFinancing && /financiamento|financiavel/.test(text)) {
    score += 3;
    reasons.push('Aceita financiamento');
  }

  return buildMatch('urbano', property, score, reasons);
}

function scoreRuralProperty(lead, property) {
  const prefs = extractRuralPreferences(lead);
  const text = normalizeText(propertyText(property));
  const reasons = [];
  let score = 0;

  const propertyCity = normalizeText(property.city || getFeature(property, ['location.city', 'features.location.city'], ''));
  const propertyRegion = normalizeText(getFeature(property, ['region', 'regiao', 'features.location.region', 'features.location.regiao'], ''));
  const propertyType = normalizeText(property.property_type || property.type || '');
  const price = Number(property.price || 0);
  const hectares = Number(property.total_area_ha || getFeature(property, ['features.areaHectares', 'features.physical.area'], 0));
  const hasWater = Boolean(getFeature(property, ['agua', 'water_resources'], false))
    || /rio|nascente|represa|poco|corrego|agua/.test(text)
    || Object.values(property?.features?.water || {}).some(Boolean);
  const hasEnergy = Boolean(getFeature(property, ['energia', 'features.infra.energiaEletrica'], false)) || /energia eletrica|energia|luz/.test(text);
  const hasDocs = Boolean(getFeature(property, ['documentacao', 'features.legal.escritura', 'features.legal.car', 'features.legal.ccir'], false))
    || /escritura|documentacao|car|ccir|geo|itr/.test(text);
  const hasAccess = /acesso|estrada|asfalto|rodovia/.test(text);

  if ((prefs.city && propertyCity === prefs.city) || (prefs.region && propertyRegion.includes(prefs.region))) {
    score += 15;
    reasons.push('Região/Cidade compatível');
  }
  if (prefs.hectaresMin && hectares >= prefs.hectaresMin && (!prefs.hectaresMax || hectares <= prefs.hectaresMax)) {
    score += 20;
    reasons.push('Área produtiva compatível');
  }
  score += scorePrice(price, prefs.budget, 20, reasons);
  if (prefs.purpose && text.includes(prefs.purpose)) {
    score += 20;
    reasons.push(`Excelente para ${prefs.purpose}`);
  } else if (prefs.type && propertyType.includes(prefs.type)) {
    score += 15;
    reasons.push('Tipo de propriedade compatível');
  } else if (!prefs.purpose && propertyKind(property) === 'rural') {
    score += 10;
    reasons.push('Perfil rural compatível');
  }
  if (prefs.needsWater && hasWater) {
    score += 10;
    reasons.push('Possui água disponível');
  }
  if (hasAccess) {
    score += 5;
    reasons.push('Acesso adequado');
  }
  if (prefs.needsEnergy && hasEnergy) {
    score += 5;
    reasons.push('Possui energia elétrica');
  }
  if (prefs.needsDocumentation && hasDocs) {
    score += 5;
    reasons.push('Documentação indicada no cadastro');
  }

  const secondaryHits = prefs.secondaryTerms.filter((term) => text.includes(term));
  if (secondaryHits.length) {
    score += Math.min(5, secondaryHits.length * 2);
    reasons.push(`Diferenciais rurais: ${secondaryHits.slice(0, 3).join(', ')}`);
  }

  return buildMatch('rural', property, score, reasons);
}

function buildMatch(engine, property, score, reasons) {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  return {
    engine,
    property,
    score: normalizedScore,
    classification: classifyScore(normalizedScore),
    reasons: reasons.length ? reasons.slice(0, 5) : ['Compatível com dados disponíveis'],
  };
}

function toMatchPayload(match) {
  const property = match.property;
  return {
    property_id: property.id,
    title: property.title,
    price: Number(property.price || 0),
    city: property.city || property.location?.city || '',
    neighborhood: property.neighborhood || property.location?.neighborhood || '',
    state: property.state || property.location?.state || '',
    image: Array.isArray(property.images) ? property.images[0] : undefined,
    link: property.link || property.public_url || '',
    score: match.score,
    classification: match.classification,
    engine: match.engine,
    reasons: match.reasons,
  };
}

function buildWhatsappMessage(lead, matches) {
  const firstName = String(lead?.name || '').split(' ')[0] || 'tudo bem';
  if (!matches.length) {
    return `Olá ${firstName}, estou analisando novas opções para o seu perfil e te aviso assim que encontrar imóveis realmente aderentes.`;
  }

  const lines = [
    `Olá ${firstName}, encontrei alguns imóveis que combinam com o seu perfil.`,
    '',
    ...matches.slice(0, 3).flatMap((match, index) => [
      `${index + 1}. ${match.title}`,
      match.city || match.state ? `- ${[match.city, match.state].filter(Boolean).join(' / ')}` : null,
      match.price ? `- ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(match.price)}` : null,
      ...match.reasons.slice(0, 2).map((reason) => `- ${reason}`),
      '',
    ].filter(Boolean)),
    'Posso te enviar mais detalhes?',
  ];

  return lines.join('\n');
}

function buildSummary(profile, matches) {
  if (!matches.length) return `Perfil ${profile}: nenhum imovel compativel encontrado automaticamente.`;
  const best = matches[0];
  return `Perfil ${profile}: ${matches.length} match(es). Melhor opcao: ${best.title} (${best.score}% - ${best.classification}).`;
}

function isMissingMatchColumnsError(error) {
  const message = String(error?.message || error?.details || '');
  return message.includes(MISSING_MATCH_COLUMNS_HINT)
    || message.includes('matched_properties')
    || message.includes('matched_at')
    || message.includes('schema cache');
}

async function rerankWithGroq(lead, candidates, profile) {
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
          content: 'Voce e um especialista em CRM imobiliario. Reordene matches urbanos e rurais para um lead e responda somente JSON valido.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            profile,
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
              engine: candidate.engine,
              current_score: candidate.score,
              current_reasons: candidate.reasons,
            })),
            expected_format: {
              matches: [{ property_id: 'uuid', score: 0, reasons: ['motivo curto em portugues'] }],
            },
          }),
        },
      ],
    });

    const content = completion.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.matches)) return candidates;

    const byId = new Map(candidates.map((candidate) => [candidate.property.id, candidate]));
    const reranked = parsed.matches.map((item) => {
      const candidate = byId.get(item.property_id);
      if (!candidate) return null;
      const score = Math.max(0, Math.min(100, Number(item.score || candidate.score)));
      return {
        ...candidate,
        score,
        classification: classifyScore(score),
        reasons: Array.isArray(item.reasons) && item.reasons.length > 0 ? item.reasons.slice(0, 5) : candidate.reasons,
      };
    }).filter(Boolean);

    return reranked.length ? reranked : candidates;
  } catch (error) {
    console.warn('[LeadMatcher] Groq indisponivel, usando ranking local:', error.message);
    return candidates;
  }
}

function runEngines(lead, properties, profile) {
  const active = properties.filter(isActiveProperty);
  const urbanProperties = active.filter((property) => propertyKind(property) !== 'rural');
  const ruralProperties = active.filter((property) => propertyKind(property) !== 'urbano');

  if (profile === 'urbano') return urbanProperties.map((property) => scoreUrbanProperty(lead, property));
  if (profile === 'rural') return ruralProperties.map((property) => scoreRuralProperty(lead, property));
  if (profile === 'misto') {
    return [
      ...urbanProperties.map((property) => scoreUrbanProperty(lead, property)),
      ...ruralProperties.map((property) => scoreRuralProperty(lead, property)),
    ];
  }

  return [
    ...urbanProperties.map((property) => scoreUrbanProperty(lead, property)),
    ...ruralProperties.map((property) => scoreRuralProperty(lead, property)),
  ];
}

export async function matchLeadProperties({ supabase, lead, organizationId, createdBy = null, profileOverride = null }) {
  if (!lead?.id || !organizationId) return lead;

  const { data: properties, error } = await supabase
    .from('properties')
    .select('*')
    .eq('organization_id', organizationId)
    .limit(500);

  if (error) throw error;

  const naturalProfile = classifyLeadProfile(lead);
  const profile = ['urbano', 'rural', 'misto', 'indefinido'].includes(profileOverride)
    ? profileOverride
    : naturalProfile;
  const ranked = runEngines(lead, properties || [], profile)
    .filter((match) => match.score >= 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES_FOR_AI);

  const finalRanked = await rerankWithGroq(lead, ranked, profile);
  const matches = finalRanked
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MATCHES)
    .map(toMatchPayload);

  const whatsappMessage = buildWhatsappMessage(lead, matches);
  const matchSummary = buildSummary(profile, matches);
  const matchedAt = new Date().toISOString();
  const bestClassification = matches[0]?.classification || 'Sem Match';

  let updatedLead = lead;
  const { data: persistedLead, error: updateError } = await supabase
    .from('leads')
    .update({
      classification: `Perfil ${profile} - ${bestClassification}`,
      matched_properties: matches,
      match_summary: matchSummary,
      matched_at: matchedAt,
    })
    .eq('id', lead.id)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (updateError) {
    if (!isMissingMatchColumnsError(updateError)) throw updateError;
    console.warn('[LeadMatcher] Colunas de match ausentes no banco. Rodar migrations/20260516_lead_property_matches.sql:', updateError.message);
  } else {
    updatedLead = persistedLead;
  }

  const { error: activityError } = await supabase.from('lead_activities').insert({
    lead_id: lead.id,
    organization_id: organizationId,
    created_by: createdBy,
    type: 'Matchmaking IA',
    description: matchSummary,
    metadata: {
      version: MATCH_VERSION,
      profile,
      natural_profile: naturalProfile,
      matches,
      whatsapp_message: whatsappMessage,
      learning_signals: ['clicks', 'respostas', 'visitas', 'propostas', 'recusas', 'vendas'],
    },
  });

  if (activityError) {
    console.warn('[LeadMatcher] Nao foi possivel registrar atividade:', activityError.message);
  }

  return {
    ...updatedLead,
    classification: updatedLead.classification || `Perfil ${profile} - ${bestClassification}`,
    matched_properties: matches,
    match_summary: matchSummary,
    matched_at: matchedAt,
    match_profile: profile,
    match_whatsapp_message: whatsappMessage,
  };
}
