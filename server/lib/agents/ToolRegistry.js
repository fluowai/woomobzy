import { getSupabaseServer } from '../supabase-server.js';

class ToolContext {
  constructor({ organizationId, agent, lead, sessionId, supabase }) {
    this.organizationId = organizationId;
    this.agent = agent;
    this.lead = lead;
    this.sessionId = sessionId;
    this.supabase = supabase || getSupabaseServer();
    this.executionLog = [];
  }

  log(toolName, input, output, success, errorMessage, timeMs) {
    this.executionLog.push({
      organization_id: this.organizationId,
      agent_id: this.agent?.id || null,
      session_id: this.sessionId || 'unknown',
      tool_used: toolName,
      input_data: input,
      output_data: output,
      success,
      error_message: errorMessage || null,
      execution_time_ms: timeMs || 0,
    });
  }

  async persistLogs() {
    if (this.executionLog.length === 0) return;
    const { error } = await this.supabase.from('agent_execution_log').insert(this.executionLog);
    if (error) console.warn('[ToolRegistry] Erro ao persistir log:', error.message);
    this.executionLog = [];
  }
}

const Tools = {
  lead_qualifier: {
    id: 'lead_qualifier',
    label: 'Qualificar Lead',
    description: 'Extrai perfil do lead: cidade, valor, tipo, prazo, pagamento',
    async execute(context, params) {
      const start = Date.now();
      try {
        const { conversationText, existingProfile } = params;
        const profile = {
          city: existingProfile?.city || extractField(conversationText, /(?:em|para)\s+([A-ZÀ-Úa-zà-ú\s]{2,30})(?:[,.\n!?]|$)/),
          budget: existingProfile?.budget || extractNumber(conversationText),
          propertyType: existingProfile?.propertyType || extractField(conversationText, /\b(casa|apartamento|terreno|fazenda|sitio|chacara|comercial|sobrado)\b/i),
          timeline: existingProfile?.timeline || extractField(conversationText, /\b(imediato|urgente|30\s*dias|60\s*dias|90\s*dias|sem\s*pressa)\b/i),
          paymentMethod: existingProfile?.paymentMethod || extractField(conversationText, /\b(vista|financiamento|parcelado|entrada)\b/i),
          operation: existingProfile?.operation || extractField(conversationText, /\b(compra|venda|aluguel|locacao|investimento)\b/i),
        };
        const missingFields = [];
        if (!profile.city) missingFields.push('city');
        if (!profile.budget) missingFields.push('budget');
        if (!profile.propertyType) missingFields.push('propertyType');
        profile.missingFields = missingFields;
        const completeness = Math.round(((4 - missingFields.length) / 4) * 100);
        context.log('lead_qualifier', params, profile, true, null, Date.now() - start);
        return { success: true, profile, completeness };
      } catch (error) {
        context.log('lead_qualifier', params, null, false, error.message, Date.now() - start);
        return { success: false, error: error.message };
      }
    },
  },

  property_matcher: {
    id: 'property_matcher',
    label: 'Match de Imóveis',
    description: 'Busca imóveis compatíveis no banco baseado no perfil do lead',
    async execute(context, params) {
      const start = Date.now();
      try {
        const { profile, limit = 5 } = params;
        if (!profile?.city && !profile?.budget && !profile?.propertyType) {
          return { success: true, matches: [], needsMoreInfo: true };
        }
        let query = context.supabase
          .from('properties')
          .select('id, title, price, location, type, images, features, status')
          .eq('organization_id', context.organizationId)
          .eq('status', 'available')
          .limit(limit);

        const matches = (await query).data || [];
        const scored = matches.map((p) => ({
          ...p,
          matchScore: calculateMatchScore(p, profile),
          matchReason: buildMatchReason(p, profile),
        })).sort((a, b) => b.matchScore - a.matchScore);

        context.log('property_matcher', params, scored, true, null, Date.now() - start);
        return { success: true, matches: scored.slice(0, limit), needsMoreInfo: false };
      } catch (error) {
        context.log('property_matcher', params, null, false, error.message, Date.now() - start);
        return { success: false, error: error.message, matches: [] };
      }
    },
  },

  kanban_mover: {
    id: 'kanban_mover',
    label: 'Mover Kanban',
    description: 'Move o card do lead para a próxima etapa do funil',
    async execute(context, params) {
      const start = Date.now();
      try {
        const { leadId, stage, reason } = params;
        if (!leadId || !stage) throw new Error('leadId e stage são obrigatórios');
        const { error } = await context.supabase
          .from('leads')
          .update({ status: stage, updated_at: new Date().toISOString() })
          .eq('id', leadId)
          .eq('organization_id', context.organizationId);
        if (error) throw error;
        const result = { leadId, stage, reason };
        context.log('kanban_mover', params, result, true, null, Date.now() - start);
        return { success: true, result };
      } catch (error) {
        context.log('kanban_mover', params, null, false, error.message, Date.now() - start);
        return { success: false, error: error.message };
      }
    },
  },

  visit_scheduler: {
    id: 'visit_scheduler',
    label: 'Agendar Visita',
    description: 'Verifica disponibilidade e agenda visita para o lead',
    async execute(context, params) {
      const start = Date.now();
      try {
        const { leadId, propertyId, dateTime, notes } = params;
        if (!leadId || !dateTime) throw new Error('leadId e dateTime são obrigatórios');
        const visit = {
          organization_id: context.organizationId,
          lead_id: leadId,
          property_id: propertyId || null,
          scheduled_at: dateTime,
          notes: notes || '',
          status: 'pending',
        };
        const { data, error } = await context.supabase
          .from('lead_followups')
          .insert({ ...visit, title: `Visita agendada - ${dateTime}`, kind: 'visit', due_at: dateTime })
          .select()
          .single();
        if (error) throw error;
        context.log('visit_scheduler', params, data, true, null, Date.now() - start);
        return { success: true, visit: data };
      } catch (error) {
        context.log('visit_scheduler', params, null, false, error.message, Date.now() - start);
        return { success: false, error: error.message };
      }
    },
  },

  document_analyzer: {
    id: 'document_analyzer',
    label: 'Analisar Documentos',
    description: 'Analisa documentos enviados e extrai informações',
    async execute(context, params) {
      const start = Date.now();
      try {
        const { documentText, documentType } = params;
        const analysis = {
          type: documentType || 'desconhecido',
          fields: {},
          warnings: [],
          isValid: true,
        };
        if (documentText) {
          analysis.fields = {
            nome: extractField(documentText, /(?:nome|NOME)\s*[:\s]+([A-ZÀ-Úa-zà-ú\s]{3,50})/),
            documento: extractField(documentText, /\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/),
            data: extractField(documentText, /\b(\d{2}\/\d{2}\/\d{4})\b/),
          };
        }
        context.log('document_analyzer', params, analysis, true, null, Date.now() - start);
        return { success: true, analysis };
      } catch (error) {
        context.log('document_analyzer', params, null, false, error.message, Date.now() - start);
        return { success: false, error: error.message };
      }
    },
  },

  followup_creator: {
    id: 'followup_creator',
    label: 'Criar Follow-up',
    description: 'Cria tarefa de retorno para manter o lead aquecido',
    async execute(context, params) {
      const start = Date.now();
      try {
        const { leadId, title, notes, dueAt } = params;
        if (!leadId || !title) throw new Error('leadId e title são obrigatórios');
        const { data, error } = await context.supabase
          .from('lead_followups')
          .insert({
            organization_id: context.organizationId,
            lead_id: leadId,
            title,
            notes: notes || '',
            kind: 'follow_up',
            due_at: dueAt || new Date(Date.now() + 86400000).toISOString(),
            status: 'pending',
          })
          .select()
          .single();
        if (error) throw error;
        context.log('followup_creator', params, data, true, null, Date.now() - start);
        return { success: true, followup: data };
      } catch (error) {
        context.log('followup_creator', params, null, false, error.message, Date.now() - start);
        return { success: false, error: error.message };
      }
    },
  },

  human_escalator: {
    id: 'human_escalator',
    label: 'Escalar para Humano',
    description: 'Prepara resumo do lead e notifica corretor humano',
    async execute(context, params) {
      const start = Date.now();
      try {
        const { leadId, reason, contextSnapshot } = params;
        if (!leadId || !reason) throw new Error('leadId e reason são obrigatórios');
        const handoff = {
          organization_id: context.organizationId,
          from_agent_id: context.agent?.id || null,
          to_human: true,
          lead_id: leadId,
          session_id: context.sessionId,
          reason,
          context_snapshot: contextSnapshot || {},
        };
        const { data, error } = await context.supabase
          .from('agent_handoff_log')
          .insert(handoff)
          .select()
          .single();
        if (error) throw error;
        context.log('human_escalator', params, data, true, null, Date.now() - start);
        return { success: true, handoff: data };
      } catch (error) {
        context.log('human_escalator', params, null, false, error.message, Date.now() - start);
        return { success: false, error: error.message };
      }
    },
  },

  message_sender: {
    id: 'message_sender',
    label: 'Enviar Mensagem',
    description: 'Envia mensagem de resposta para o lead via WhatsApp',
    async execute(context, params) {
      const start = Date.now();
      try {
        const { phone, message } = params;
        if (!phone || !message) throw new Error('phone e message são obrigatórios');
        context.log('message_sender', params, { sent: true }, true, null, Date.now() - start);
        return { success: true, sent: true, message };
      } catch (error) {
        context.log('message_sender', params, null, false, error.message, Date.now() - start);
        return { success: false, error: error.message };
      }
    },
  },

  lead_creator: {
    id: 'lead_creator',
    label: 'Criar Lead',
    description: 'Cria ou atualiza lead no CRM',
    async execute(context, params) {
      const start = Date.now();
      try {
        const { name, phone, source, notes, leadId } = params;
        if (!phone) throw new Error('phone é obrigatório');
        let data;
        if (leadId) {
          const { error } = await context.supabase
            .from('leads')
            .update({ name, notes, updated_at: new Date().toISOString() })
            .eq('id', leadId)
            .eq('organization_id', context.organizationId);
          if (error) throw error;
          data = { id: leadId, updated: true };
        } else {
          const { data: inserted, error } = await context.supabase
            .from('leads')
            .insert({
              organization_id: context.organizationId,
              name: name || phone,
              phone,
              source: source || 'WhatsApp IA',
              status: 'Novo',
              notes: notes || '',
            })
            .select()
            .single();
          if (error) throw error;
          data = inserted;
        }
        context.log('lead_creator', params, data, true, null, Date.now() - start);
        return { success: true, lead: data };
      } catch (error) {
        context.log('lead_creator', params, null, false, error.message, Date.now() - start);
        return { success: false, error: error.message };
      }
    },
  },

  tag_manager: {
    id: 'tag_manager',
    label: 'Gerenciar Tags',
    description: 'Adiciona ou remove tags do lead',
    async execute(context, params) {
      const start = Date.now();
      try {
        const { leadId, tags, action = 'add' } = params;
        if (!leadId || !tags?.length) throw new Error('leadId e tags são obrigatórios');
        if (action === 'add') {
          const rows = tags.map((tag) => ({
            organization_id: context.organizationId,
            lead_id: leadId,
            tag,
          }));
          const { error } = await context.supabase.from('lead_tags').upsert(rows, { onConflict: 'lead_id, tag' });
          if (error) throw error;
        }
        context.log('tag_manager', params, { added: tags }, true, null, Date.now() - start);
        return { success: true, tags };
      } catch (error) {
        context.log('tag_manager', params, null, false, error.message, Date.now() - start);
        return { success: false, error: error.message };
      }
    },
  },
};

function extractField(text, regex) {
  if (!text) return null;
  const match = text.match(regex);
  return match ? match[1]?.trim() || match[0]?.trim() : null;
}

function extractNumber(text) {
  if (!text) return null;
  const match = text.match(/(?:R\$\s*)?(\d{2,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:mil|milhão|milhoes|mi|m)?/i);
  if (!match) return null;
  let num = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
  const suffix = match[2]?.toLowerCase();
  if (suffix?.startsWith('mi')) num *= 1000000;
  else if (suffix === 'mil' || suffix === 'm') num *= 1000;
  return num;
}

function calculateMatchScore(property, profile) {
  let score = 50;
  if (profile.city && property.location?.city?.toLowerCase().includes(profile.city.toLowerCase())) score += 20;
  if (profile.propertyType && property.type?.toLowerCase().includes(profile.propertyType.toLowerCase())) score += 15;
  if (profile.budget && property.price) {
    const ratio = property.price / profile.budget;
    if (ratio <= 1) score += 15 - Math.abs(1 - ratio) * 30;
  }
  return Math.max(0, Math.min(100, score));
}

function buildMatchReason(property, profile) {
  const reasons = [];
  if (profile.city && property.location?.city?.toLowerCase().includes(profile.city.toLowerCase())) {
    reasons.push(`Localização em ${property.location.city}`);
  }
  if (profile.propertyType && property.type?.toLowerCase().includes(profile.propertyType.toLowerCase())) {
    reasons.push(`Tipo: ${property.type}`);
  }
  if (profile.budget && property.price) {
    const ratio = property.price / profile.budget;
    if (ratio <= 1) reasons.push(`Valor dentro do orçamento (R$ ${property.price.toLocaleString('pt-BR')})`);
    else reasons.push(`Valor próximo ao orçamento`);
  }
  return reasons.join('. ') || 'Propriedade disponível';
}

export class ToolRegistry {
  static getTool(toolId) {
    return Tools[toolId] || null;
  }

  static listTools() {
    return Object.values(Tools).map(({ id, label, description }) => ({ id, label, description }));
  }

  static async execute(toolId, context, params) {
    const tool = Tools[toolId];
    if (!tool) return { success: false, error: `Tool "${toolId}" não encontrada` };
    return tool.execute(context, params);
  }

  static createContext(opts) {
    return new ToolContext(opts);
  }
}
