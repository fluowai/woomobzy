import { createHash, randomUUID } from 'crypto';

export const TOOL_DEFINITIONS = [
  {
    name: 'buscar_imoveis',
    description:
      'Busca imoveis no banco de dados com base nas preferencias do cliente.',
    parameters: {
      type: 'object',
      properties: {
        tipo: {
          type: 'string',
          description:
            'Tipo de imovel (ex: casa, apartamento, fazenda, terreno)',
        },
        cidade: {
          type: 'string',
          description: 'Cidade desejada',
        },
        orcamento_maximo: {
          type: 'number',
          description: 'Valor maximo que o cliente deseja pagar',
        },
        quartos: {
          type: 'number',
          description: 'Numero minimo de quartos',
        },
      },
    },
  },
  {
    name: 'agendar_visita',
    description: 'Agenda uma visita a um imovel para o cliente.',
    parameters: {
      type: 'object',
      properties: {
        property_id: {
          type: 'string',
          description: 'ID do imovel a ser visitado (se conhecido)',
        },
        agenda_id: {
          type: 'string',
          description:
            'ID da agenda de visitas em que o compromisso deve entrar (se conhecido)',
        },
        data_hora: {
          type: 'string',
          description:
            'Data e hora da visita em formato ISO 8601 (ex: 2026-07-25T14:30:00Z)',
        },
        notas: {
          type: 'string',
          description: 'Notas adicionais sobre a visita',
        },
      },
      required: ['data_hora'],
    },
  },
  {
    name: 'simular_financiamento',
    description:
      'Simula um financiamento imobiliario usando a Tabela Price ou juros simples, devolvendo o valor aproximado da parcela.',
    parameters: {
      type: 'object',
      properties: {
        valor_imovel: {
          type: 'number',
          description: 'Valor total do imovel a ser financiado',
        },
        valor_entrada: {
          type: 'number',
          description: 'Valor de entrada pago pelo cliente',
        },
        prazo_meses: {
          type: 'number',
          description: 'Prazo do financiamento em meses (ex: 360, 420)',
        },
      },
      required: ['valor_imovel', 'valor_entrada', 'prazo_meses'],
    },
  },
  {
    name: 'atualizar_etapa_crm',
    description:
      'Atualiza o status/etapa do lead no Kanban (CRM) baseado na acao do cliente (ex: pediu simulacao, agendou visita).',
    parameters: {
      type: 'object',
      properties: {
        nova_etapa: {
          type: 'string',
          description:
            'A nova etapa no Kanban. Use apenas: "Novo", "Em andamento", "Contato", "Agendado", "Proposta", "Fechado" ou "Perdido".',
        },
      },
      required: ['nova_etapa'],
    },
  },
  {
    name: 'qualificar_lead',
    description:
      'Avalia o perfil do cliente e atualiza o CRM com a temperatura (frio, morno, quente) e um motivo baseado na interacao.',
    parameters: {
      type: 'object',
      properties: {
        temperatura: {
          type: 'string',
          description:
            'A temperatura do lead. Opcoes permitidas: "frio", "morno" ou "quente".',
        },
        motivo: {
          type: 'string',
          description:
            'Breve justificativa do por que o lead recebeu essa temperatura (ex: "Demonstrou muito interesse em fechar na hora").',
        },
      },
      required: ['temperatura', 'motivo'],
    },
  },
  {
    name: 'consultar_agenda_disponibilidade',
    description:
      'Consulta horarios disponiveis para visita em um dia especifico, evitando conflitos com agendamentos existentes.',
    parameters: {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          description: 'Data desejada para consulta (YYYY-MM-DD ou ISO 8601).',
        },
        corretor_id: {
          type: 'string',
          description: 'ID do corretor responsavel (opcional).',
        },
      },
      required: ['data'],
    },
  },
  {
    name: 'consultar_documentos',
    description:
      'Consulta documentos do imovel ou de um documento especifico, retornando somente metadados seguros, status e analises estruturadas.',
    parameters: {
      type: 'object',
      properties: {
        property_id: {
          type: 'string',
          description: 'ID do imovel para listar documentos vinculados.',
        },
        document_id: {
          type: 'string',
          description: 'ID de um documento especifico para consulta detalhada.',
        },
      },
    },
  },
  {
    name: 'enviar_audio_whatsapp',
    description:
      'Gera um audio a partir de texto (Text-to-Speech) e envia para o cliente pelo WhatsApp. Use isto quando o cliente pedir para enviar um audio ou quando a resposta for longa e acolhedora.',
    parameters: {
      type: 'object',
      properties: {
        texto_falado: {
          type: 'string',
          description:
            'O texto exato que deve ser transformado em audio e enviado ao cliente.',
        },
      },
      required: ['texto_falado'],
    },
  },
  {
    name: 'notificar_corretor',
    description:
      'Notifica um corretor humano sobre um lead qualificado. Cria uma atividade no CRM, um follow-up e aciona o corretor indicado (ou o mais disponivel da organizacao).',
    parameters: {
      type: 'object',
      properties: {
        motivo: {
          type: 'string',
          description:
            'Motivo da notificacao (ex: "Lead com alta intencao, quer visita hoje").',
        },
        corretor_id: {
          type: 'string',
          description:
            'ID do corretor/perfil a ser notificado (se conhecido). Se omitido, usa o corretor atribuido ao lead ou o mais disponivel.',
        },
        prioridade: {
          type: 'string',
          description: 'Prioridade da notificacao: "alta", "media" ou "baixa".',
        },
      },
      required: ['motivo'],
    },
  },
  {
    name: 'criar_follow_up',
    description:
      'Cria um follow-up (tarefa de retorno) para um lead no Kanban. Ideal para marcar que um corretor deve dar continuidade.',
    parameters: {
      type: 'object',
      properties: {
        titulo: {
          type: 'string',
          description:
            'Titulo curto do follow-up (ex: "Retornar com proposta").',
        },
        due_at: {
          type: 'string',
          description:
            'Data/hora de vencimento em ISO 8601 (ex: 2026-08-12T10:00:00Z).',
        },
        notas: {
          type: 'string',
          description: 'Notas adicionais sobre o follow-up.',
        },
        kind: {
          type: 'string',
          description:
            'Tipo de follow-up: "follow_up" (padrao), "visit" ou "call".',
        },
      },
      required: ['titulo', 'due_at'],
    },
  },
  {
    name: 'criar_tarefa',
    description:
      'Cria uma tarefa generica para o time dentro do CRM. Pode ser atribuida a um corretor especifico.',
    parameters: {
      type: 'object',
      properties: {
        titulo: {
          type: 'string',
          description:
            'Titulo da tarefa (ex: "Verificar disponibilidade do imovel").',
        },
        descricao: {
          type: 'string',
          description: 'Descricao detalhada da tarefa.',
        },
        corretor_id: {
          type: 'string',
          description: 'ID do corretor responsavel (se conhecido).',
        },
        due_at: {
          type: 'string',
          description:
            'Data/hora de vencimento em ISO 8601 (ex: 2026-08-12T10:00:00Z).',
        },
      },
      required: ['titulo'],
    },
  },
];

export const TOOL_ALIAS_MAP = {
  buscar_imoveis: ['buscar_imoveis', 'matchmaking'],
  agendar_visita: ['agendar_visita', 'agenda'],
  simular_financiamento: ['simular_financiamento', 'simulador-financiamento'],
  atualizar_etapa_crm: ['atualizar_etapa_crm', 'mover-etapa-funil', 'crm'],
  qualificar_lead: ['qualificar_lead', 'neural-sales'],
  consultar_agenda_disponibilidade: [
    'consultar_agenda_disponibilidade',
    'agenda',
  ],
  consultar_documentos: ['consultar_documentos', 'documentos', 'pdf-reader'],
  enviar_audio_whatsapp: ['enviar_audio_whatsapp', 'voice-ai'],
  notificar_corretor: ['notificar_corretor', 'notificar-corretor'],
  criar_follow_up: ['criar_follow_up', 'follow-up'],
  criar_tarefa: ['criar_tarefa', 'criar-tarefa'],
};

export const SIDE_EFFECT_TOOLS = new Set([
  'agendar_visita',
  'atualizar_etapa_crm',
  'qualificar_lead',
  'enviar_audio_whatsapp',
  'notificar_corretor',
  'criar_follow_up',
  'criar_tarefa',
]);

export const READ_ONLY_TOOLS = new Set([
  'buscar_imoveis',
  'consultar_agenda_disponibilidade',
  'consultar_documentos',
  'simular_financiamento',
]);

export const DEFAULT_MAX_SPECIALIST_FAN_OUT = 3;

const INTENT_KEYWORDS = {
  buscar_imoveis: [
    'buscar',
    'procuro',
    'quero',
    'imovel',
    'imoveis',
    'casa',
    'apartamento',
    'terreno',
    'fazenda',
    'sitio',
    'chacara',
  ],
  agendar_visita: ['agendar', 'visita', 'horario', 'marcar', 'agenda'],
  consultar_agenda_disponibilidade: [
    'disponibilidade',
    'agenda',
    'horario',
    'quando',
    'livre',
  ],
  consultar_documentos: [
    'documento',
    'documentos',
    'pdf',
    'matricula',
    'car',
    'ccir',
    'itr',
    'analise',
  ],
  simular_financiamento: [
    'financiamento',
    'financiar',
    'parcela',
    'entrada',
    'juros',
    'simulacao',
  ],
  atualizar_etapa_crm: ['crm', 'etapa', 'status', 'funil', 'kanban'],
  qualificar_lead: ['qualificar', 'temperatura', 'lead quente', 'lead frio'],
  enviar_audio_whatsapp: ['audio', 'voz', 'whatsapp'],
  notificar_corretor: ['corretor', 'humano', 'urgente', 'contato'],
  criar_follow_up: ['retorno', 'follow up', 'follow-up', 'lembrar'],
  criar_tarefa: ['tarefa', 'delegar', 'verificar', 'documento'],
};

export const AGENT_RUNTIME_REGISTRY = {
  whatsapp: {
    kind: 'channel',
    callable: false,
    runtime: 'upstream-channel',
  },
  'audio-stt': {
    kind: 'capability',
    callable: false,
    runtime: 'upstream-preprocessor',
  },
  agenda: {
    kind: 'tool-bundle',
    callable: true,
    tools: ['agendar_visita', 'consultar_agenda_disponibilidade'],
  },
  documentos: {
    kind: 'tool-bundle',
    callable: true,
    tools: ['consultar_documentos'],
  },
  'pdf-reader': {
    kind: 'tool-bundle',
    callable: true,
    tools: ['consultar_documentos'],
  },
  matchmaking: {
    kind: 'tool',
    callable: true,
    tools: ['buscar_imoveis'],
  },
  'follow-up': {
    kind: 'tool',
    callable: true,
    tools: ['criar_follow_up'],
  },
  'notificar-corretor': {
    kind: 'tool',
    callable: true,
    tools: ['notificar_corretor'],
  },
  'criar-tarefa': {
    kind: 'tool',
    callable: true,
    tools: ['criar_tarefa'],
  },
  'mover-etapa-funil': {
    kind: 'tool',
    callable: true,
    tools: ['atualizar_etapa_crm'],
  },
  'simulador-financiamento': {
    kind: 'tool',
    callable: true,
    tools: ['simular_financiamento'],
  },
  'neural-sales': {
    kind: 'tool',
    callable: true,
    tools: ['qualificar_lead'],
  },
  'voice-ai': {
    kind: 'tool',
    callable: true,
    tools: ['enviar_audio_whatsapp'],
  },
  crm: {
    kind: 'capability',
    callable: true,
    tools: ['atualizar_etapa_crm', 'qualificar_lead'],
  },
  kanban: {
    kind: 'capability',
    callable: true,
    tools: ['atualizar_etapa_crm', 'criar_follow_up', 'criar_tarefa'],
  },
};

export function normalizeAiText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function buildAllowedToolSet(agentToolsConfig = []) {
  const enabled = new Set();
  const configured = new Set(
    (Array.isArray(agentToolsConfig) ? agentToolsConfig : [])
      .filter(Boolean)
      .map((item) => normalizeAiText(item))
  );

  for (const [toolName, aliases] of Object.entries(TOOL_ALIAS_MAP)) {
    if (
      aliases.some((alias) => configured.has(normalizeAiText(alias))) ||
      configured.has(normalizeAiText(toolName))
    ) {
      enabled.add(toolName);
    }
  }

  return enabled;
}

export function buildFunctionDeclarations(agentToolsConfig = []) {
  const enabled = buildAllowedToolSet(agentToolsConfig);
  return TOOL_DEFINITIONS.filter((tool) => enabled.has(tool.name));
}

export function isToolAllowed(agentToolsConfig = [], toolName) {
  return buildAllowedToolSet(agentToolsConfig).has(toolName);
}

export function getRequiredAutonomyLevel(toolName) {
  return SIDE_EFFECT_TOOLS.has(toolName) ? 3 : 1;
}

export function getToolMode(toolName) {
  if (READ_ONLY_TOOLS.has(toolName)) return 'read';
  if (SIDE_EFFECT_TOOLS.has(toolName)) return 'write';
  return 'unknown';
}

export function inferIntentSignals(content) {
  const text = normalizeAiText(content);
  if (!text) return [];

  const intents = [];
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some((keyword) => text.includes(normalizeAiText(keyword)))) {
      intents.push(intent);
    }
  }
  return intents;
}

function collectSpecialistKeywords(specialist = {}) {
  return normalizeAiText(
    [
      specialist.name,
      specialist.role,
      specialist.instructions,
      ...(Array.isArray(specialist.capabilities)
        ? specialist.capabilities
        : []),
      ...(Array.isArray(specialist.tools) ? specialist.tools : []),
    ]
      .filter(Boolean)
      .join(' ')
  );
}

export function scoreSpecialists(content, specialists = []) {
  const text = normalizeAiText(content);
  const tokens = text.split(/[^a-z0-9]+/).filter((token) => token.length >= 3);
  const intents = inferIntentSignals(content);

  return (Array.isArray(specialists) ? specialists : [])
    .map((specialist) => {
      const keywords = collectSpecialistKeywords(specialist);
      let score = 0;
      const matchedSignals = [];

      for (const intent of intents) {
        const aliases = TOOL_ALIAS_MAP[intent] || [intent];
        if (
          aliases.some((alias) => keywords.includes(normalizeAiText(alias)))
        ) {
          score += 6;
          matchedSignals.push(intent);
        }
      }

      for (const token of tokens) {
        if (keywords.includes(token)) {
          score += 1;
        }
      }

      if (specialist?.agent_type === 'orchestrator') {
        score -= 2;
      }

      return {
        specialist,
        score,
        matchedSignals: [...new Set(matchedSignals)],
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);
}

export function pickSpecialists(content, specialists = [], maxFanOut = 3) {
  const ranked = scoreSpecialists(content, specialists);
  if (!ranked.length) return [];

  const limit = Math.max(1, Math.min(Number(maxFanOut) || 1, 5));
  const selected = [];
  const usedSignals = new Set();

  for (const candidate of ranked) {
    const hasNewSignal = candidate.matchedSignals.some(
      (signal) => !usedSignals.has(signal)
    );
    if (
      !selected.length ||
      hasNewSignal ||
      candidate.score >= ranked[0].score - 1
    ) {
      selected.push(candidate);
      candidate.matchedSignals.forEach((signal) => usedSignals.add(signal));
    }
    if (selected.length >= limit) break;
  }

  return selected;
}

export function extractStructuredJson(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return null;

  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const jsonCandidate = fenced?.[1] || text.match(/\{[\s\S]*\}/)?.[0] || null;
  if (!jsonCandidate) return null;

  try {
    return JSON.parse(jsonCandidate);
  } catch {
    return null;
  }
}

export function normalizeInternalResult(rawText, specialist, trace = {}) {
  const parsed = extractStructuredJson(rawText);
  const customerFacingGuidance = parsed?.customer_facing_guidance || rawText;
  const summary = parsed?.summary || customerFacingGuidance;

  return {
    specialist_id: specialist?.id || null,
    specialist_name: specialist?.name || specialist?.role || 'especialista',
    summary: String(summary || '').trim(),
    customer_facing_guidance: String(customerFacingGuidance || '').trim(),
    recommended_actions: Array.isArray(parsed?.recommended_actions)
      ? parsed.recommended_actions
      : [],
    unresolved_questions: Array.isArray(parsed?.unresolved_questions)
      ? parsed.unresolved_questions
      : [],
    confidence: Number(parsed?.confidence || 0) || 0,
    fallback_used: Boolean(trace?.fallbackUsed),
    tool_calls: Array.isArray(trace?.toolCalls) ? trace.toolCalls : [],
  };
}

export function buildIdempotencyKey(payload) {
  return createHash('sha256')
    .update(JSON.stringify(payload || {}))
    .digest('hex')
    .slice(0, 24);
}

export function createExecutionId() {
  return randomUUID();
}

export function sanitizeExecutionMeta(meta = {}) {
  const specialists = Array.isArray(meta.specialists)
    ? meta.specialists.map((specialist) => ({
        id: specialist.id || null,
        role: specialist.role || null,
        tool_count: Number(specialist.tool_count || 0),
        fallback_used: Boolean(specialist.fallback_used),
      }))
    : [];

  const toolCalls = Array.isArray(meta.toolCalls)
    ? meta.toolCalls.map((toolCall) => ({
        name: toolCall.name,
        status: toolCall.status,
        actor_agent_id: toolCall.actor_agent_id || null,
        autonomy_level: toolCall.autonomy_level ?? null,
        side_effect: Boolean(toolCall.side_effect),
        idempotency_key: toolCall.idempotency_key || null,
      }))
    : [];

  return {
    execution_id: meta.execution_id || null,
    request_id: meta.request_id || null,
    session_id: meta.session_id || null,
    route_mode: meta.route_mode || 'single',
    routed_specialists: specialists,
    tool_calls: toolCalls,
    fallback_used: Boolean(meta.fallback_used),
    started_at: meta.started_at || null,
    finished_at: meta.finished_at || null,
  };
}
