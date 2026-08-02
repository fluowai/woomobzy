import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { matchLeadProperties } from '../leadPropertyMatcher.js';
import { buildAgentSystemPrompt } from './agentPrompt.js';

const allTools = [
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
];

export class AgentOrchestrator {
  constructor(apiKey) {
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  async _ensureModel(agentToolsConfig) {
    // Mapeamento entre as tools selecionadas no Frontend e as declarations
    const activeFunctionDeclarations = [];
    if (
      agentToolsConfig?.includes('matchmaking') ||
      agentToolsConfig?.includes('buscar_imoveis')
    ) {
      activeFunctionDeclarations.push(
        allTools.find((t) => t.name === 'buscar_imoveis')
      );
    }
    if (
      agentToolsConfig?.includes('agenda') ||
      agentToolsConfig?.includes('agendar_visita')
    ) {
      activeFunctionDeclarations.push(
        allTools.find((t) => t.name === 'agendar_visita')
      );
    }
    if (agentToolsConfig?.includes('simulador-financiamento')) {
      activeFunctionDeclarations.push(
        allTools.find((t) => t.name === 'simular_financiamento')
      );
    }
    if (
      agentToolsConfig?.includes('mover-etapa-funil') ||
      agentToolsConfig?.includes('crm')
    ) {
      activeFunctionDeclarations.push(
        allTools.find((t) => t.name === 'atualizar_etapa_crm')
      );
    }
    if (agentToolsConfig?.includes('neural-sales')) {
      activeFunctionDeclarations.push(
        allTools.find((t) => t.name === 'qualificar_lead')
      );
    }
    if (agentToolsConfig?.includes('voice-ai')) {
      activeFunctionDeclarations.push(
        allTools.find((t) => t.name === 'enviar_audio_whatsapp')
      );
    }

    // Se o agente nao tiver tools de backend mapeadas, retornamos nulo para pular a orquestracao
    if (activeFunctionDeclarations.length === 0) {
      return null;
    }

    const toolPayload = { functionDeclarations: activeFunctionDeclarations };

    if (this.genAI) {
      return this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        tools: [toolPayload],
      });
    }

    const supabase = getSupabaseServer();
    const { data: saasSettings } = await supabase
      .from('saas_settings')
      .select('global_gemini_key')
      .single()
      .catch(() => ({ data: null }));

    const finalKey = saasSettings?.global_gemini_key;
    if (!finalKey) throw new Error('API Key nao configurada');

    const genAI = new GoogleGenerativeAI(finalKey);
    return genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      tools: [toolPayload],
    });
  }

  async executeToolCall(functionCall, organizationId, leadId) {
    const supabase = getSupabaseServer();
    const { name, args } = functionCall;

    try {
      if (name === 'buscar_imoveis') {
        let query = supabase
          .from('properties')
          .select('id, title, price, city, bedrooms')
          .eq('organization_id', organizationId)
          .eq('status', 'ativo');

        if (args.tipo) query = query.ilike('property_type', `%${args.tipo}%`);
        if (args.cidade) query = query.ilike('city', `%${args.cidade}%`);
        if (args.orcamento_maximo)
          query = query.lte('price', args.orcamento_maximo);
        if (args.quartos) query = query.gte('bedrooms', args.quartos);

        const { data } = await query.limit(5);
        return {
          resultado:
            data && data.length > 0
              ? data
              : 'Nenhum imovel encontrado com essas caracteristicas.',
        };
      }

      if (name === 'agendar_visita') {
        if (!leadId)
          return {
            erro: 'Lead nao identificado. Nao e possivel agendar visita sem um lead salvo.',
          };

        await supabase.from('lead_followups').insert({
          organization_id: organizationId,
          lead_id: leadId,
          title: `Visita Agendada: ${args.property_id || 'Imovel a definir'}`,
          notes: args.notas || '',
          due_at: args.data_hora,
          kind: 'visit',
          status: 'pending',
        });

        return {
          sucesso: true,
          mensagem: 'Visita agendada com sucesso no sistema IMOBZY.',
        };
      }

      if (name === 'simular_financiamento') {
        const principal = args.valor_imovel - args.valor_entrada;
        if (principal <= 0)
          return {
            erro: 'Valor de entrada maior ou igual ao imovel. Nao ha necessidade de financiamento.',
          };

        // Simples: juros de 9.5% ao ano (0.0079 a.m.) Tabela Price
        const i = 0.0079;
        const n = args.prazo_meses;
        const parcela =
          (principal * (i * Math.pow(1 + i, n))) / (Math.pow(1 + i, n) - 1);

        return {
          sucesso: true,
          valor_financiado: principal,
          parcela_aproximada: parseFloat(parcela.toFixed(2)),
          taxa_juros_anual: '9.5%',
          mensagem: 'Esta e uma simulacao aproximada (Tabela Price).',
        };
      }

      if (name === 'atualizar_etapa_crm') {
        if (!leadId)
          return {
            erro: 'Lead nao identificado. Nao e possivel mover funil sem um lead salvo.',
          };

        const validStages = [
          'Novo',
          'Em andamento',
          'Contato',
          'Agendado',
          'Proposta',
          'Fechado',
          'Perdido',
        ];
        if (!validStages.includes(args.nova_etapa)) {
          return {
            erro: `Etapa invalida. Use uma das seguintes: ${validStages.join(', ')}`,
          };
        }

        const { error } = await supabase
          .from('leads')
          .update({ status: args.nova_etapa })
          .eq('id', leadId)
          .eq('organization_id', organizationId);

        if (error) return { erro: 'Erro ao atualizar o CRM: ' + error.message };

        return {
          sucesso: true,
          mensagem: `Lead movido com sucesso para a etapa: ${args.nova_etapa}.`,
        };
      }

      if (name === 'qualificar_lead') {
        if (!leadId)
          return {
            erro: 'Lead nao identificado. Impossivel salvar qualificacao.',
          };

        const { data: leadData } = await supabase
          .from('leads')
          .select('ai_profile')
          .eq('id', leadId)
          .single();
        const currentProfile = leadData?.ai_profile || {};

        const newProfile = {
          ...currentProfile,
          temperature: args.temperatura,
          qualification_reason: args.motivo,
          last_qualified_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('leads')
          .update({ ai_profile: newProfile })
          .eq('id', leadId)
          .eq('organization_id', organizationId);

        if (error)
          return { erro: 'Erro ao atualizar perfil do lead: ' + error.message };
        return {
          sucesso: true,
          mensagem: `Lead qualificado como ${args.temperatura}. Motivo salvo.`,
        };
      }

      if (name === 'enviar_audio_whatsapp') {
        return {
          sucesso: true,
          instrucao_interna:
            'A infraestrutura processara isso em breve. Na sua resposta ao cliente, inclua a tag [VOICE_AI] seguida do texto que deve ser falado. Exemplo: [VOICE_AI]Ola, como posso ajudar?[/VOICE_AI]',
        };
      }

      return { erro: `Ferramenta ${name} desconhecida.` };
    } catch (err) {
      console.error('[AgentOrchestrator] Erro na tool', name, err);
      return { erro: err.message };
    }
  }

  async processAgentConversation({
    content,
    organizationId,
    agent,
    history,
    leadId,
  }) {
    const model = await this._ensureModel(agent?.tools || []);
    if (!model) {
      // Se nao ha tools ativas configuradas, retorna nulo para usar fluxo padrao
      return null;
    }

    // Inicia um chat para manter o estado da execucao das tools (ReAct loop)
    const chat = model.startChat({
      history: history.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }],
      })),
      systemInstruction: {
        parts: [
          {
            text:
              buildAgentSystemPrompt(agent, {
                history,
                channel: 'WhatsApp',
              }) +
              `

DIRETRIZES DE FERRAMENTAS (apenas quando aplicavel ao contexto):
- Use "buscar_imoveis" para verificar disponibilidade antes de oferecer um imovel.
- Use "agendar_visita" apenas quando o cliente confirmar o dia e o horario.
- Use "simular_financiamento" quando o cliente pedir valores, parcelas ou financiamento.
- Use "atualizar_etapa_crm" e "qualificar_lead" para manter o CRM atualizado.
- Sempre resuma o resultado da ferramenta de forma natural e amigavel ao cliente, sem citar termos tecnicos internos.`,
          },
        ],
      },
    });

    let result = await chat.sendMessage([{ text: content }]);
    let functionCalls = result.response.functionCalls();

    // Loop de execucao de ferramentas (suporta ate 3 interacoes sequenciais)
    let iter = 0;
    while (functionCalls && functionCalls.length > 0 && iter < 3) {
      const call = functionCalls[0];
      const toolResult = await this.executeToolCall(
        call,
        organizationId,
        leadId
      );

      result = await chat.sendMessage([
        {
          functionResponse: {
            name: call.name,
            response: toolResult,
          },
        },
      ]);

      functionCalls = result.response.functionCalls();
      iter++;
    }

    return result.response.text();
  }
}
