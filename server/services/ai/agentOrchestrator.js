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
          description:
            'Prioridade da notificacao: "alta", "media" ou "baixa".',
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
          description: 'Titulo curto do follow-up (ex: "Retornar com proposta").',
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
          description: 'Titulo da tarefa (ex: "Verificar disponibilidade do imovel").',
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
    if (
      agentToolsConfig?.includes('agenda') ||
      agentToolsConfig?.includes('agendar_visita')
    ) {
      activeFunctionDeclarations.push(
        allTools.find((t) => t.name === 'consultar_agenda_disponibilidade')
      );
    }
    if (
      agentToolsConfig?.includes('notificar-corretor')
    ) {
      activeFunctionDeclarations.push(
        allTools.find((t) => t.name === 'notificar_corretor')
      );
    }
    if (agentToolsConfig?.includes('follow-up')) {
      activeFunctionDeclarations.push(
        allTools.find((t) => t.name === 'criar_follow_up')
      );
    }
    if (agentToolsConfig?.includes('criar-tarefa')) {
      activeFunctionDeclarations.push(
        allTools.find((t) => t.name === 'criar_tarefa')
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
          .select(
            'id, title, price, city, state, property_type, purpose, description, total_area_ha, images, status'
          )
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
              ? data.map((p) => ({
                  id: p.id,
                  titulo: p.title,
                  preco: p.price,
                  cidade: p.city,
                  estado: p.state,
                  tipo: p.property_type,
                  finalidade: p.purpose,
                  descricao: p.description,
                  area_total_ha: p.total_area_ha,
                  imagem: p.images?.[0] || null,
                }))
              : 'Nenhum imovel encontrado com essas caracteristicas.',
        };
      }

      if (name === 'agendar_visita') {
        if (!leadId)
          return {
            erro: 'Lead nao identificado. Nao e possivel agendar visita sem um lead salvo.',
          };

        const scheduledAt = args.data_hora
          ? new Date(args.data_hora).toISOString()
          : null;
        if (!scheduledAt)
          return {
            erro: 'Data e hora da visita sao obrigatorias. Formato: 2026-07-25T14:30:00Z',
          };

        const propertyId = args.property_id || null;
        const propertyTitle = propertyId
          ? await this._resolvePropertyTitle(
              supabase,
              organizationId,
              propertyId
            )
          : null;
        const visitTitle = propertyTitle
          ? `Visita Agendada: ${propertyTitle}`
          : `Visita Agendada: ${args.property_id || 'Imovel a definir'}`;
        const appointmentNotes = [
          args.notas || '',
          propertyTitle ? `Imovel: ${propertyTitle}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        await Promise.all([
          supabase.from('lead_followups').insert({
            organization_id: organizationId,
            lead_id: leadId,
            title: visitTitle,
            notes: appointmentNotes,
            due_at: scheduledAt,
            kind: 'visit',
            status: 'pending',
          }),
          supabase.from('lead_appointments').insert({
            organization_id: organizationId,
            lead_id: leadId,
            agenda_id: args.agenda_id || null,
            property_id: propertyId,
            user_id: null,
            title: visitTitle,
            appointment_date: scheduledAt,
            type: 'meeting',
            status: 'pending',
            notes: appointmentNotes,
          }),
        ]);

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

      if (name === 'consultar_agenda_disponibilidade') {
        const dateStr = args.data
          ? new Date(args.data).toISOString().split('T')[0]
          : null;
        if (!dateStr)
          return {
            erro: 'Informe a data no formato YYYY-MM-DD ou ISO 8601.',
          };

        const conflicts = await this._checkAgendaConflicts(
          supabase,
          organizationId,
          dateStr,
          leadId || null
        );

        if (conflicts.length === 0) {
          return {
            sucesso: true,
            data: dateStr,
            disponivel: true,
            mensagem: `Nenhum conflito encontrado para ${dateStr}. O horario esta disponivel.`,
          };
        }

        const horariosOcupados = conflicts
          .map(
            (c) =>
              `- ${new Date(c.appointment_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}: ${c.title}`
          )
          .join('\n');

        return {
          sucesso: true,
          data: dateStr,
          disponivel: false,
          conflitos: conflicts.length,
          horarios_ocupados: horariosOcupados,
          mensagem: `Em ${dateStr} ja existem ${conflicts.length} agendamento(s):\n${horariosOcupados}\nSugira outro horario para o cliente.`,
        };
      }

      if (name === 'notificar_corretor') {
        if (!leadId)
          return {
            erro: 'Lead nao identificado. Nao e possivel notificar corretor sem um lead salvo.',
          };

        const brokerId = args.corretor_id || null;
        let broker = null;

        if (brokerId) {
          const { data: brokerData } = await supabase
            .from('profiles')
            .select('id, name, email')
            .eq('id', brokerId)
            .eq('organization_id', organizationId)
            .maybeSingle();
          broker = brokerData;
        }

        if (!broker) {
          const leadRes = await supabase
            .from('leads')
            .select('assigned_to')
            .eq('id', leadId)
            .eq('organization_id', organizationId)
            .maybeSingle();
          broker = leadRes.data?.assigned_to;
        }

        if (!broker) {
          const profileRes = await supabase
            .from('profiles')
            .select('id, name')
            .eq('organization_id', organizationId)
            .in('role', ['broker', 'corretor', 'admin'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          broker = profileRes.data;
        }

        if (!broker) {
          return {
            erro: 'Nenhum corretor encontrado nesta organizacao para notificar.',
          };
        }

        const prioridade = args.prioridade || 'media';
        const motivo = args.motivo || 'Lead requer atencao.';

        await Promise.allSettled([
          supabase.from('lead_activities').insert({
            organization_id: organizationId,
            lead_id: leadId,
            type: 'notificar_corretor',
            description: `[${prioridade.toUpperCase()}] ${motivo}`,
            metadata: {
              broker_id: broker.id,
              assigned_broker: broker.name,
              priority: prioridade,
              source: 'ai_agent',
            },
          }),
          supabase.from('lead_followups').insert({
            organization_id: organizationId,
            lead_id: leadId,
            title: `Notificação: ${motivo}`,
            notes: `Agente IA solicitou contato do corretor. Prioridade: ${prioridade}.`,
            due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            kind: 'follow_up',
            status: 'pending',
            metadata: {
              broker_id: broker.id,
              source: 'ai_agent',
              priority: prioridade,
            },
          }),
        ]);

        return {
          sucesso: true,
          corretor: broker.name || broker.id,
          prioridade,
          mensagem: `Corretor ${broker.name || broker.id} notificado com sucesso.`,
        };
      }

      if (name === 'criar_follow_up') {
        if (!leadId)
          return {
            erro: 'Lead nao identificado. Nao e possivel criar follow-up sem um lead salvo.',
          };

        const dueAt = args.due_at
          ? new Date(args.due_at).toISOString()
          : null;
        if (!dueAt)
          return {
            erro: 'data_hora de vencimento e obrigatoria. Formato: 2026-08-12T10:00:00Z',
          };

        const { error } = await supabase.from('lead_followups').insert({
          organization_id: organizationId,
          lead_id: leadId,
          title: args.titulo,
          notes: args.notas || '',
          due_at: dueAt,
          kind: args.kind || 'follow_up',
          status: 'pending',
          metadata: { source: 'ai_agent_tool' },
        });

        if (error)
          return { erro: 'Erro ao criar follow-up: ' + error.message };

        return {
          sucesso: true,
          mensagem: `Follow-up "${args.titulo}" criado para ${new Date(dueAt).toLocaleDateString('pt-BR')}.`,
        };
      }

      if (name === 'criar_tarefa') {
        if (!leadId)
          return {
            erro: 'Lead nao identificado. Nao e possivel criar tarefa sem um lead salvo.',
          };

        const dueAt = args.due_at
          ? new Date(args.due_at).toISOString()
          : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const assignee = args.corretor_id || null;
        if (assignee) {
          const { data: assigneeData } = await supabase
            .from('profiles')
            .select('id, name')
            .eq('id', assignee)
            .eq('organization_id', organizationId)
            .maybeSingle();
          if (!assigneeData)
            return {
              erro: 'Corretor atribuido nao encontrado nesta organizacao.',
            };
        }

        const { error } = await supabase.from('lead_activities').insert({
          organization_id: organizationId,
          lead_id: leadId,
          type: 'tarefa',
          description: args.descricao || args.titulo,
          created_by: assignee,
          metadata: {
            title: args.titulo,
            assigned_to: assignee,
            due_at: dueAt,
            source: 'ai_agent_tool',
          },
        });

        if (error)
          return { erro: 'Erro ao criar tarefa: ' + error.message };

        let msg = `Tarefa "${args.titulo}" criada`;
        if (assignee) {
          const { data: brokerData } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', assignee)
            .single();
          msg += ` e atribuida a ${brokerData?.name || 'corretor'}`;
        }
        msg += `. Vence em ${new Date(dueAt).toLocaleDateString('pt-BR')}.`;

        return {
          sucesso: true,
          mensagem: msg,
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
    const supabase = getSupabaseServer();
    const operational = agent?.handoff_rules?.__operational360 || {};
    const sharePrompt =
      agent?.share_prompt_with_subagents ??
      operational.share_prompt_with_subagents ??
      false;
    const subAgents =
      agent?.sub_agents?.length
        ? agent.sub_agents
        : operational.sub_agents || [];

    // Swarm dinamico: se o orquestrador compartilha o prompt com sub-agentes,
    // detecta a atividade da mensagem e delega para o especialista que mais
    // se encaixa, mantendo a mesma conversa (mesmo historico/session).
    if (sharePrompt && subAgents.length) {
      try {
        const specialists = await this._loadSubAgents(
          supabase,
          organizationId,
          subAgents
        );
        const specialist = this._detectSpecialist(content, specialists);
        if (specialist) {
          const delegated = await this._delegateToSpecialist({
            content,
            organizationId,
            agent,
            specialist,
            history,
            leadId,
          });
          if (delegated) return delegated;
        }
      } catch (err) {
        console.warn(
          '[AgentOrchestrator] Falha ao delegar para sub-agente:',
          err.message
        );
      }
    }

    const model = await this._ensureModel(agent?.tools || []);
    if (!model) {
      // Se nao ha tools ativas configuradas, retorna nulo para usar fluxo padrao
      return null;
    }

    const systemInstruction = buildAgentSystemPrompt(agent, {
      history,
      channel: 'WhatsApp',
    });

    return this._runReActLoop({
      model,
      systemInstruction,
      history,
      content,
      organizationId,
      leadId,
    });
  }

  async _loadSubAgents(supabase, organizationId, subAgentIds) {
    if (!Array.isArray(subAgentIds) || subAgentIds.length === 0) return [];
    const { data, error } = await supabase
      .from('ai_agents')
      .select('*')
      .in('id', subAgentIds)
      .eq('organization_id', organizationId)
      .eq('is_active', true);
    if (error) return [];
    return data || [];
  }

  _detectSpecialist(content, specialists) {
    if (!Array.isArray(specialists) || specialists.length === 0) return null;

    const normalize = (value) =>
      String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    const text = normalize(content);
    const tokens = text.split(/[^a-z0-9]+/).filter((t) => t.length >= 3);

    let best = null;
    let bestScore = 0;
    for (const spec of specialists) {
      const keywords = normalize(
        [
          spec.role,
          spec.name,
          ...(spec.capabilities || []),
          ...(spec.tools || []),
        ]
          .filter(Boolean)
          .join(' ')
      );
      const phrases = keywords.split(/[^a-z0-9]+/).filter((t) => t.length >= 3);

      let score = 0;
      for (const phrase of phrases) {
        if (text.includes(phrase)) score += 2;
      }
      for (const token of tokens) {
        if (keywords.includes(token)) score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        best = spec;
      }
    }

    return best && bestScore >= 2 ? best : null;
  }

  async _delegateToSpecialist({
    content,
    organizationId,
    agent,
    specialist,
    history,
    leadId,
  }) {
    const model = await this._ensureModel(specialist?.tools || []);
    if (!model) return null;

    const sharedPrompt = String(agent?.instructions || '').trim();
    const specialistPrompt = buildAgentSystemPrompt(specialist, {
      history,
      channel: 'WhatsApp',
    });

    const systemInstruction = [
      sharedPrompt
        ? `PROMPT COMPARTILHADO DO ORQUESTRADOR (${agent?.name || 'agente principal'}):\n${sharedPrompt}`
        : '',
      specialistPrompt,
      `VOCE FOI ACIONADO PELO AGENTE PRINCIPAL (${agent?.name || 'orquestrador'}) COMO ESPECIALISTA PARA AJUDAR NESTA MESMA CONVERSA. Responda como se fosse o ${specialist?.name || 'especialista'}, mantendo o contexto e o historico da conversa que o cliente ja teve.`,
    ]
      .filter(Boolean)
      .join('\n\n');

    return this._runReActLoop({
      model,
      systemInstruction,
      history,
      content,
      organizationId,
      leadId,
    });
  }

  async _runReActLoop({
    model,
    systemInstruction,
    history,
    content,
    organizationId,
    leadId,
  }) {
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
              systemInstruction +
              `
 
DIRETRIZES DE FERRAMENTAS (apenas quando aplicavel ao contexto):
- Use "buscar_imoveis" para verificar disponibilidade antes de oferecer um imovel.
- Use "agendar_visita" apenas quando o cliente confirmar o dia e o horario.
- Use "consultar_agenda_disponibilidade" antes de propor horarios para visita.
- Use "simular_financiamento" quando o cliente pedir valores, parcelas ou financiamento.
- Use "atualizar_etapa_crm" e "qualificar_lead" para manter o CRM atualizado.
- Use "notificar_corretor" quando o lead demonstrar alta intencao, pedir visita, negociar valores ou precisar de atencao humana.
- Use "criar_follow_up" para marcar retorno comercial com data/ hora definida.
- Use "criar_tarefa" para delegar atividades ao corretor ou time (ex: verificar documentos, fazer ligação).
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

  async _resolvePropertyTitle(supabase, organizationId, propertyId) {
    const { data } = await supabase
      .from('properties')
      .select('title')
      .eq('id', propertyId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    return data?.title || null;
  }

  async _checkAgendaConflicts(
    supabase,
    organizationId,
    dateStr,
    excludeLeadId = null
  ) {
    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    let query = supabase
      .from('lead_appointments')
      .select('id, title, appointment_date, status')
      .eq('organization_id', organizationId)
      .gte('appointment_date', startOfDay.toISOString())
      .lte('appointment_date', endOfDay.toISOString())
      .neq('status', 'canceled');

    if (excludeLeadId) query = query.neq('lead_id', excludeLeadId);

    const { data } = await query;
    return data || [];
  }
}
