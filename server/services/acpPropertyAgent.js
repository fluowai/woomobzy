import axios from 'axios';

const ACP_VERSION = 'ACP-1.0';

export async function enrichPropertyWithAcp({
  supabase,
  organizationId,
  property,
}) {
  const fallback = buildFallbackAcp(property);

  try {
    const config = await getOrgAIConfig(supabase, organizationId);
    const ai = await generateAcpWithAI(config, property);

    return {
      ...property,
      features: {
        ...(property.features || {}),
        acp: normalizeAcp(ai, property, 'ai'),
      },
    };
  } catch (error) {
    console.warn(
      '[ACP] Analise IA indisponivel, usando fallback:',
      error.message
    );
    return {
      ...property,
      features: {
        ...(property.features || {}),
        acp: fallback,
      },
    };
  }
}

async function getOrgAIConfig(supabase, organizationId) {
  const { data, error } = await supabase
    .from('site_settings')
    .select('integrations')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) throw error;
  return data?.integrations || {};
}

async function generateAcpWithAI(config, property) {
  const prompt = buildAcpPrompt(property);
  const systemInstruction = `Voce e um esquadrao de agentes ACP para mercado imobiliario.
Base do Metodo ACP:
- O ICP vem antes da campanha.
- A oferta vem antes da copy.
- A qualificacao vem antes da proposta.
- A autoridade vem antes da objecao.
- O CRM vem antes da cobranca por resultado.
- Separe Funil de Aquisicao (venda direta) de Funil de Autoridade (confianca e prova).
- ICP de aquisicao deve avaliar dor reconhecida, capacidade de compra, aderencia, momento e canal encontravel.
- Oferta ACP deve organizar ativo, beneficio central, provas, filtros e proximo passo.
- Criativo de aquisicao precisa mostrar oportunidade, diferencial objetivo, filtro de perfil e CTA.
Retorne somente JSON valido, sem markdown.`;

  const apiKey =
    config?.openai?.apiKey ||
    config?.gemini?.apiKey ||
    process.env.GEMINI_API_KEY ||
    config?.groq?.apiKey ||
    process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Nenhuma chave de IA disponivel para ACP.');

  if (config?.openai?.apiKey) {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: config.openai.model || 'gpt-4o',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt },
        ],
        temperature: 0.35,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${config.openai.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return parseJson(response.data.choices?.[0]?.message?.content);
  }

  if (config?.gemini?.apiKey || process.env.GEMINI_API_KEY) {
    const geminiKey = config?.gemini?.apiKey || process.env.GEMINI_API_KEY;
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: 'application/json',
        },
        systemInstruction: { parts: [{ text: systemInstruction }] },
      }
    );
    return parseJson(response.data.candidates?.[0]?.content?.parts?.[0]?.text);
  }

  const groqKey = config?.groq?.apiKey || process.env.GROQ_API_KEY;
  if (groqKey) {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: config?.groq?.model || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt },
        ],
        temperature: 0.35,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return parseJson(response.data.choices?.[0]?.message?.content);
  }

  throw new Error('Nenhum provedor ACP configurado.');
}

function buildAcpPrompt(property) {
  const features = property.features || {};
  const orulo = features.orulo || {};
  const summary = {
    title: property.title,
    type: property.property_type,
    purpose: property.purpose,
    price: property.price,
    location: {
      city: property.city,
      state: property.state,
      neighborhood: property.neighborhood,
      address: property.address,
    },
    description: property.description,
    features: {
      areaM2: features.areaM2 || features.areaConstruida,
      bedrooms: features.dormitorios,
      suites: features.suites,
      bathrooms: features.banheiros,
      parking: features.vagas,
      stage: orulo.stage,
      developer: orulo.developer,
      publisher: orulo.publisher,
    },
  };

  return `Analise este imovel pelo Metodo ACP e gere uma maquina comercial para revisao antes de publicar.

DADOS DO IMOVEL:
${JSON.stringify(summary, null, 2)}

Retorne JSON exatamente neste formato:
{
  "score": 0,
  "diagnosis": {
    "commercial_priority": "alta|media|baixa",
    "best_angle": "string",
    "risks": ["string"],
    "proofs_needed": ["string"]
  },
  "icp": {
    "name": "string",
    "fit_score": 0,
    "recognized_pain": "string",
    "buying_capacity": "string",
    "adherence": "string",
    "moment": "string",
    "channels": ["string"],
    "exclude": ["string"]
  },
  "persona": {
    "name": "string",
    "profile": "string",
    "goals": ["string"],
    "objections": ["string"],
    "decision_triggers": ["string"]
  },
  "offer": {
    "positioning": "string",
    "central_benefit": "string",
    "value_arguments": ["string"],
    "filters": ["string"],
    "next_step": "string"
  },
  "meta_ads": {
    "audiences": [
      {
        "name": "string",
        "location": "string",
        "age_range": "string",
        "interests": ["string"],
        "copy_filter": "string"
      }
    ],
    "campaigns": [
      {
        "name": "string",
        "funnel": "aquisicao|autoridade",
        "angle": "string",
        "primary_text": "string",
        "headline": "string",
        "description": "string",
        "cta": "string",
        "creative_direction": "string"
      }
    ]
  },
  "authority": {
    "content_ideas": ["string"],
    "proof_assets": ["string"]
  },
  "qualification": {
    "opening_message": "string",
    "questions": ["string"],
    "hot_lead_signals": ["string"],
    "cold_lead_signals": ["string"]
  },
  "crm": {
    "suggested_stage": "string",
    "tags": ["string"],
    "follow_up": "string",
    "loss_reasons_to_watch": ["string"]
  },
  "agents": [
    {"name": "Agente ICP", "mission": "string"},
    {"name": "Agente Oferta", "mission": "string"},
    {"name": "Agente Midia Meta", "mission": "string"},
    {"name": "Agente SDR", "mission": "string"}
  ]
}`;
}

function parseJson(text = '') {
  const clean = String(text)
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
  return JSON.parse(clean);
}

function normalizeAcp(raw, property, source) {
  const fallback = buildFallbackAcp(property);
  return {
    ...fallback,
    ...raw,
    version: ACP_VERSION,
    source,
    generated_at: new Date().toISOString(),
    score: clampScore(raw?.score ?? raw?.icp?.fit_score ?? fallback.score),
    icp: {
      ...fallback.icp,
      ...(raw?.icp || {}),
      fit_score: clampScore(
        raw?.icp?.fit_score ?? raw?.score ?? fallback.icp.fit_score
      ),
    },
    meta_ads: {
      ...fallback.meta_ads,
      ...(raw?.meta_ads || {}),
      audiences: ensureArray(
        raw?.meta_ads?.audiences,
        fallback.meta_ads.audiences
      ),
      campaigns: ensureArray(
        raw?.meta_ads?.campaigns,
        fallback.meta_ads.campaigns
      ),
    },
  };
}

function buildFallbackAcp(property) {
  const location = [property.neighborhood, property.city, property.state]
    .filter(Boolean)
    .join(', ');
  const features = property.features || {};
  const area = features.areaM2 || features.areaConstruida || null;
  const rooms = features.dormitorios
    ? `${features.dormitorios} dormitorios`
    : 'perfil urbano';
  const price = Number(property.price || 0);
  const ticket =
    price >= 1500000
      ? 'alto padrao'
      : price >= 700000
        ? 'medio/alto'
        : 'entrada ou medio';
  const mainAngle = buildMainAngle(property);

  return {
    version: ACP_VERSION,
    source: 'fallback',
    generated_at: new Date().toISOString(),
    score: price > 0 && property.city ? 74 : 58,
    diagnosis: {
      commercial_priority: price > 0 ? 'media' : 'baixa',
      best_angle: mainAngle,
      risks: [
        'Validar disponibilidade, condicoes comerciais e qualidade das imagens antes de publicar.',
      ],
      proofs_needed: [
        'Fotos sem ambiguidade',
        'Planta ou metragem',
        'Status do empreendimento',
        'Condominio/IPTU quando houver',
      ],
    },
    icp: {
      name: `ACP | Comprador urbano ${ticket} | ${property.city || 'regiao alvo'}`,
      fit_score: price > 0 && property.city ? 74 : 58,
      recognized_pain:
        'Busca um imovel com localizacao, metragem e condicao de compra claras.',
      buying_capacity:
        price > 0
          ? `Deve conseguir avaliar ticket proximo de R$ ${price.toLocaleString('pt-BR')}.`
          : 'Capacidade depende de validacao de faixa de investimento.',
      adherence: `${property.property_type || 'Imovel'} em ${location || 'regiao urbana'} com ${rooms}.`,
      moment:
        'Lead em comparacao ativa, buscando visita, simulacao ou material completo.',
      channels: [
        'Meta Ads',
        'Google Busca',
        'Remarketing',
        'Base de leads urbana',
      ],
      exclude: [
        'Curiosos sem faixa de investimento definida',
        'Leads buscando aluguel se a oferta for venda',
        'Intermediarios sem comprador real',
      ],
    },
    persona: {
      name: 'Comprador urbano qualificado',
      profile:
        'Pessoa ou familia avaliando compra com criterios objetivos de localizacao, preco e liquidez.',
      goals: [
        'Comprar com seguranca',
        'Comparar opcoes equivalentes',
        'Entender custo total e proximos passos',
      ],
      objections: [
        'Preco',
        'Condominio/IPTU',
        'Localizacao',
        'Disponibilidade',
        'Financiamento',
      ],
      decision_triggers: [
        'Fotos boas',
        'dados objetivos',
        'visita rapida',
        'simulacao de pagamento',
        'escassez real',
      ],
    },
    offer: {
      positioning: `${property.property_type || 'Imovel'} em ${location || 'regiao urbana'} para comprador que busca ${mainAngle.toLowerCase()}.`,
      central_benefit: mainAngle,
      value_arguments: [
        area
          ? `${area} m2 para comparar com opcoes da regiao.`
          : 'Ficha tecnica organizada para decisao.',
        rooms,
        location || 'Localizacao a validar e destacar na copy.',
      ],
      filters: [
        'Validar faixa de investimento',
        'Confirmar objetivo de compra',
        'Separar comprador direto de curioso',
      ],
      next_step:
        'Solicitar material completo, validar faixa de investimento e agendar visita.',
    },
    meta_ads: {
      audiences: [
        {
          name: `ACP | Urbano ${ticket} | ${property.city || 'cidade alvo'}`,
          location:
            property.city && property.state
              ? `${property.city} - ${property.state}`
              : 'Cidade e raio de atendimento da imobiliaria',
          age_range: price >= 1000000 ? '30-60' : '25-55',
          interests: [
            'Mercado imobiliario',
            'Financiamento imobiliario',
            'Apartamentos',
            'Arquitetura e decoracao',
          ],
          copy_filter:
            price > 0
              ? `Oferta para quem avalia imoveis na faixa de R$ ${price.toLocaleString('pt-BR')}.`
              : 'Oferta para quem ja esta comparando compra urbana.',
        },
      ],
      campaigns: [
        {
          name: 'ACP | Aquisicao | Oferta direta',
          funnel: 'aquisicao',
          angle: mainAngle,
          primary_text: `${property.title}. ${mainAngle}. Chame no WhatsApp para receber detalhes e validar disponibilidade.`,
          headline: property.title || 'Imovel urbano para avaliacao',
          description: 'Receba ficha completa e proximos passos.',
          cta: 'Enviar mensagem',
          creative_direction:
            'Usar melhor foto do imovel, texto curto com bairro, tipo, metragem e principal diferencial.',
        },
        {
          name: 'ACP | Autoridade | Criterios de compra',
          funnel: 'autoridade',
          angle: 'Como comparar este tipo de imovel',
          primary_text:
            'Antes de escolher um imovel, compare localizacao, metragem, custo total, liquidez e disponibilidade real.',
          headline: 'Checklist para comprar melhor',
          description: 'Conteudo de apoio para leads mornos.',
          cta: 'Saiba mais',
          creative_direction:
            'Carrossel com criterios de decisao e prova de atendimento consultivo.',
        },
      ],
    },
    authority: {
      content_ideas: [
        'Checklist de compra no bairro',
        'Comparativo de custo total',
        'Como avaliar liquidez de um imovel urbano',
      ],
      proof_assets: [
        'Fotos reais',
        'Planta',
        'Mapa da regiao',
        'Historico da incorporadora quando houver',
      ],
    },
    qualification: {
      opening_message:
        'Vi seu interesse neste imovel. Voce busca compra para morar, investir ou comparar opcoes na regiao?',
      questions: [
        'Qual objetivo da compra?',
        'Qual faixa de investimento pretende analisar?',
        'Voce e comprador direto ou representa alguem?',
        'Pretende visitar nos proximos dias ou esta pesquisando?',
        'Precisa de financiamento ou compra com recurso proprio?',
      ],
      hot_lead_signals: [
        'Tem faixa de investimento',
        'Pede visita',
        'Pergunta condicao de pagamento',
        'Compara unidades similares',
      ],
      cold_lead_signals: [
        'Nao informa objetivo',
        'Nao tem faixa de valor',
        'Pede somente fotos',
        'Nao responde proximo passo',
      ],
    },
    crm: {
      suggested_stage: 'Em qualificacao',
      tags: ['orulo', 'acp', property.property_type || 'urbano', ticket].filter(
        Boolean
      ),
      follow_up:
        'Se houver fit, enviar material completo e propor visita/call em ate 24h.',
      loss_reasons_to_watch: [
        'Sem capacidade',
        'Curioso',
        'Preco',
        'Timing',
        'Sem retorno',
      ],
    },
    agents: [
      {
        name: 'Agente ICP',
        mission:
          'Validar dor, capacidade, aderencia, momento e canal encontravel.',
      },
      {
        name: 'Agente Oferta',
        mission:
          'Transformar caracteristicas do imovel em argumento de compra.',
      },
      {
        name: 'Agente Midia Meta',
        mission: 'Criar campanhas separando aquisicao e autoridade.',
      },
      {
        name: 'Agente SDR',
        mission:
          'Qualificar lead antes de liberar material sensivel ou visita.',
      },
    ],
  };
}

function buildMainAngle(property) {
  const features = property.features || {};
  if (features.dormitorios && features.suites) {
    return `${features.dormitorios} dormitorios com ${features.suites} suite(s)`;
  }
  if (features.areaM2 || features.areaConstruida) {
    return `metragem de ${features.areaM2 || features.areaConstruida} m2`;
  }
  if (property.neighborhood) {
    return `localizacao em ${property.neighborhood}`;
  }
  return 'oportunidade urbana com ficha para revisao comercial';
}

function clampScore(value) {
  const score = Number(value || 0);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function ensureArray(value, fallback) {
  return Array.isArray(value) && value.length ? value : fallback;
}
