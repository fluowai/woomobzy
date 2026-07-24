import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { matchLeadProperties } from '../leadPropertyMatcher.js';

const allTools = [
  {
    name: 'buscar_imoveis',
    description: 'Busca imoveis no banco de dados com base nas preferencias do cliente.',
    parameters: {
      type: 'object',
      properties: {
        tipo: {
          type: 'string',
          description: 'Tipo de imovel (ex: casa, apartamento, fazenda, terreno)',
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
          description: 'Data e hora da visita em formato ISO 8601 (ex: 2026-07-25T14:30:00Z)',
        },
        notas: {
          type: 'string',
          description: 'Notas adicionais sobre a visita',
        },
      },
      required: ['data_hora'],
    },
  }
];

export class AgentOrchestrator {
  constructor(apiKey) {
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  async _ensureModel(agentToolsConfig) {
    // Mapeamento entre as tools selecionadas no Frontend e as declarations
    const activeFunctionDeclarations = [];
    if (agentToolsConfig?.includes('matchmaking') || agentToolsConfig?.includes('buscar_imoveis')) {
      activeFunctionDeclarations.push(allTools.find(t => t.name === 'buscar_imoveis'));
    }
    if (agentToolsConfig?.includes('agenda') || agentToolsConfig?.includes('agendar_visita')) {
      activeFunctionDeclarations.push(allTools.find(t => t.name === 'agendar_visita'));
    }
    
    // Se o agente nao tiver tools de backend mapeadas, retornamos nulo para pular a orquestracao
    if (activeFunctionDeclarations.length === 0) {
      return null;
    }

    const toolPayload = { functionDeclarations: activeFunctionDeclarations };

    if (this.genAI) {
      return this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        tools: [toolPayload]
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
      tools: [toolPayload] 
    });
  }

  async executeToolCall(functionCall, organizationId, leadId) {
    const supabase = getSupabaseServer();
    const { name, args } = functionCall;

    try {
      if (name === 'buscar_imoveis') {
        let query = supabase.from('properties').select('id, title, price, city, bedrooms').eq('organization_id', organizationId).eq('status', 'ativo');
        
        if (args.tipo) query = query.ilike('property_type', `%${args.tipo}%`);
        if (args.cidade) query = query.ilike('city', `%${args.cidade}%`);
        if (args.orcamento_maximo) query = query.lte('price', args.orcamento_maximo);
        if (args.quartos) query = query.gte('bedrooms', args.quartos);

        const { data } = await query.limit(5);
        return {
          resultado: data && data.length > 0 ? data : 'Nenhum imovel encontrado com essas caracteristicas.',
        };
      }

      if (name === 'agendar_visita') {
        if (!leadId) return { erro: 'Lead nao identificado. Nao e possivel agendar visita sem um lead salvo.' };
        
        await supabase.from('lead_followups').insert({
          organization_id: organizationId,
          lead_id: leadId,
          title: `Visita Agendada: ${args.property_id || 'Imovel a definir'}`,
          notes: args.notas || '',
          due_at: args.data_hora,
          kind: 'visit',
          status: 'pending'
        });

        return { sucesso: true, mensagem: 'Visita agendada com sucesso no sistema IMOBZY.' };
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
    leadId
  }) {
    const model = await this._ensureModel(agent?.tools || []);
    if (!model) {
      // Se nao ha tools ativas configuradas, retorna nulo para usar fluxo padrao
      return null;
    }
    
    // Inicia um chat para manter o estado da execucao das tools (ReAct loop)
    const chat = model.startChat({
      history: history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }]
      })),
      systemInstruction: {
        parts: [{ text: `
Voce e um agente autonomo imobiliario. 
Nome: ${agent?.name || 'Agente'}
Personalidade: ${agent?.personality || 'Profissional e prestativo'}
Instrucoes: ${agent?.instructions || 'Ajude o cliente a encontrar imoveis e agendar visitas.'}

Voce possui acesso a ferramentas (Tools) no sistema IMOBZY.
- Use "buscar_imoveis" para verificar disponibilidade antes de oferecer algo.
- Use "agendar_visita" apenas quando o cliente confirmar o dia e o horario.
- Sempre responda de forma natural e amigavel ao cliente no WhatsApp, resumindo o resultado da ferramenta.
        `}]
      }
    });

    let result = await chat.sendMessage([{ text: content }]);
    let functionCalls = result.response.functionCalls();

    // Loop de execucao de ferramentas (suporta ate 3 interacoes sequenciais)
    let iter = 0;
    while (functionCalls && functionCalls.length > 0 && iter < 3) {
      const call = functionCalls[0];
      const toolResult = await this.executeToolCall(call, organizationId, leadId);
      
      result = await chat.sendMessage([{
        functionResponse: {
          name: call.name,
          response: toolResult
        }
      }]);
      
      functionCalls = result.response.functionCalls();
      iter++;
    }

    return result.response.text();
  }
}
