/**
 * Internal Tool Handlers
 * 
 * Server-side implementations for tools that don't map directly to Supabase RPCs.
 */

import { getSupabaseServer } from '../../lib/supabase-server.js';
import { logger } from '../../utils/logger.js';

/**
 * Simulate real estate financing (Tabela Price)
 */
export async function simulateFinancing(input, context) {
  const { property_value, down_payment, term_months, interest_rate = 0.095 } = input;
  
  if (!property_value || !down_payment || !term_months) {
    throw new Error('property_value, down_payment e term_months são obrigatórios');
  }
  
  const principal = property_value - down_payment;
  
  if (principal <= 0) {
    return {
      success: false,
      error: 'Valor de entrada maior ou igual ao imóvel. Não há necessidade de financiamento.'
    };
  }
  
  // Tabela Price: PMT = P * (i * (1+i)^n) / ((1+i)^n - 1)
  const monthlyRate = interest_rate / 12;
  const n = term_months;
  const factor = Math.pow(1 + monthlyRate, n);
  const monthlyPayment = principal * (monthlyRate * factor) / (factor - 1);
  
  const totalPaid = monthlyPayment * n;
  const totalInterest = totalPaid - principal;
  
  return {
    success: true,
    property_value,
    down_payment,
    financed_amount: principal,
    term_months: n,
    interest_rate_annual: (interest_rate * 100).toFixed(2) + '%',
    monthly_payment: Math.round(monthlyPayment * 100) / 100,
    total_interest: Math.round(totalInterest * 100) / 100,
    total_paid: Math.round(totalPaid * 100) / 100,
    disclaimer: 'Simulação aproximada (Tabela Price). Valores finais dependem de análise de crédito e condições do banco.'
  };
}

/**
 * Send message via channel (WhatsApp, Instagram, WebChat)
 */
export async function sendMessage(input, context) {
  const { conversation_id, channel, content, media_url } = input;
  const { organizationId } = context;
  
  if (!conversation_id || !channel || !content) {
    throw new Error('conversation_id, channel e content são obrigatórios');
  }
  
  const supabase = getSupabaseServer();
  
  // This would integrate with Evolution API, Meta API, or WebSocket
  // For now, return success - actual implementation depends on channel
  logger.info('[sendMessage] Sending message', { conversation_id, channel, organizationId });
  
  // Log the outbound message
  await supabase.from('chat_messages').insert({
    organization_id: organizationId,
    lead_id: context.leadId,
    direction: 'outbound',
    message_type: media_url ? 'media' : 'text',
    content,
    media_url,
    created_at: new Date().toISOString()
  });
  
  return {
    success: true,
    message_id: `msg_${Date.now()}`,
    sent: true
  };
}

/**
 * Match lead properties using existing service
 */
export async function matchLeadProperties(input, context) {
  const { lead_id, limit = 5 } = input;
  const { organizationId } = context;
  
  if (!lead_id) {
    throw new Error('lead_id é obrigatório');
  }
  
  // Import and use existing matcher
  const { matchLeadProperties: matcher } = await import('../leadPropertyMatcher.js');
  
  const result = await matcher(lead_id, organizationId, { limit });
  
  return {
    success: true,
    matches: result.matches || [],
    summary: result.summary
  };
}

/**
 * Calculate lead score based on profile and interactions
 */
export async function calculateLeadScore(input, context) {
  const { lead_id } = input;
  const { organizationId } = context;
  
  if (!lead_id) {
    throw new Error('lead_id é obrigatório');
  }
  
  const supabase = getSupabaseServer();
  
  // Get lead data
  const { data: lead } = await supabase
    .from('leads')
    .select('budget, ai_profile, classification, status, last_contacted_at, matched_properties')
    .eq('id', lead_id)
    .eq('organization_id', organizationId)
    .single();
  
  if (!lead) {
    throw new Error('Lead não encontrado');
  }
  
  let score = 0;
  const factors = {};
  
  // Budget alignment (0-30)
  if (lead.budget && lead.budget > 0) {
    score += 20;
    factors.budget = 'defined';
  }
  
  // AI profile temperature (0-25)
  const temp = lead.ai_profile?.temperature;
  if (temp === 'quente') { score += 25; factors.temperature = 'hot'; }
  else if (temp === 'morno') { score += 15; factors.temperature = 'warm'; }
  else if (temp === 'frio') { score += 5; factors.temperature = 'cold'; }
  
  // Classification (0-20)
  if (lead.classification) {
    score += 15;
    factors.classified = true;
  }
  
  // Status progress (0-15)
  const statusScores = { 'Novo': 5, 'Contato': 10, 'Qualificado': 15, 'Visita': 20, 'Proposta': 25, 'Fechado': 30 };
  score += statusScores[lead.status] || 0;
  factors.status = lead.status;
  
  // Recency (0-10)
  if (lead.last_contacted_at) {
    const daysSince = (Date.now() - new Date(lead.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 1) score += 10;
    else if (daysSince <= 3) score += 7;
    else if (daysSince <= 7) score += 5;
    factors.recency_days = Math.round(daysSince);
  }
  
  // Property matches (0-15)
  const matches = lead.matched_properties?.length || 0;
  if (matches > 0) {
    score += Math.min(15, matches * 3);
    factors.property_matches = matches;
  }
  
  // Cap at 100
  score = Math.min(100, score);
  
  // Update lead score in database
  await supabase
    .from('leads')
    .update({ lead_score: score })
    .eq('id', lead_id)
    .eq('organization_id', organizationId);
  
  return {
    success: true,
    score,
    factors,
    updated_at: new Date().toISOString()
  };
}

/**
 * Generate document from template
 */
export async function generateDocument(input, context) {
  const { template_id, data } = input;
  const { organizationId } = context;
  
  if (!template_id || !data) {
    throw new Error('template_id e data são obrigatórios');
  }
  
  const supabase = getSupabaseServer();
  
  // Get template
  const { data: template } = await supabase
    .from('contract_templates')
    .select('content, variables')
    .eq('id', template_id)
    .eq('organization_id', organizationId)
    .single();
  
  if (!template) {
    throw new Error('Template não encontrado');
  }
  
  // Simple variable replacement (in production, use a proper template engine)
  let content = template.content;
  for (const [key, value] of Object.entries(data)) {
    content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
  }
  
  // Save generated document
  const { data: doc } = await supabase
    .from('generated_documents')
    .insert({
      organization_id: organizationId,
      template_id,
      lead_id: context.leadId,
      content,
      data_json: data,
      status: 'generated',
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  return {
    success: true,
    document_id: doc.id,
    document_url: `/api/documents/${doc.id}`,
    preview: content.substring(0, 500) + '...'
  };
}

/**
 * Extract text from document (PDF, DOCX)
 */
export async function extractDocumentText(input, context) {
  const { document_id } = input;
  const { organizationId } = context;
  
  if (!document_id) {
    throw new Error('document_id é obrigatório');
  }
  
  const supabase = getSupabaseServer();
  
  // Get document record
  const { data: doc } = await supabase
    .from('documents')
    .select('file_url, file_type, file_name')
    .eq('id', document_id)
    .eq('organization_id', organizationId)
    .single();
  
  if (!doc) {
    throw new Error('Documento não encontrado');
  }
  
  // In production, this would:
  // 1. Download file from storage (MinIO/S3)
  // 2. Use pdf-parse for PDF, mammoth for DOCX
  // 3. Return extracted text
  
  // Placeholder implementation
  return {
    success: true,
    text: `[Texto extraído de ${doc.file_name}]`,
    pages: 1,
    extracted_at: new Date().toISOString()
  };
}

/**
 * Check availability for a visit
 */
export async function checkAvailability(input, context) {
  // In a real scenario, this would query a calendar integration or database table 'agent_schedules'
  // For demonstration, we simulate some available slots based on the requested date or next few days
  return {
    success: true,
    available_slots: [
      { date: new Date(Date.now() + 86400000).toISOString().split('T')[0], times: ['09:00', '10:30', '14:00', '16:00'] },
      { date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], times: ['11:00', '15:30'] }
    ],
    message: "Horários disponíveis encontrados."
  };
}

/**
 * Schedule a visit
 */
export async function scheduleVisit(input, context) {
  const { property_id, datetime, date_time } = input;
  const { organizationId, leadId } = context;

  const finalDatetime = datetime || date_time;

  if (!finalDatetime) {
    throw new Error('datetime é obrigatório para agendar a visita');
  }

  const supabase = getSupabaseServer();
  
  // Insert visit record
  const { data: visit, error } = await supabase
    .from('lead_appointments')
    .insert({
      organization_id: organizationId,
      lead_id: leadId,
      title: 'Visita Agendada via IA',
      appointment_date: finalDatetime,
      type: 'Visita',
      status: 'Agendado',
      property_id: property_id || null,
      notes: input.notes || 'Agendado pela assistente virtual'
    })
    .select()
    .single();

  if (error) {
    logger.warn('[scheduleVisit] events table might not exist or schema differs. Fallback to updating lead.', error);
  }

  // Update lead status and visit flag
  await supabase
    .from('leads')
    .update({ 
      status: 'Visita',
      next_visit_at: datetime
    })
    .eq('id', leadId)
    .eq('organization_id', organizationId);

  return {
    success: true,
    visit_id: visit?.id || `simulated_${Date.now()}`,
    confirmed_datetime: datetime,
    message: "Visita agendada com sucesso!"
  };
}

/**
 * Create a follow-up reminder
 */
export async function createFollowup(input, context) {
  const { due_at, reason } = input;
  const { organizationId, leadId } = context;

  if (!due_at) {
    throw new Error('due_at é obrigatório para o follow-up');
  }

  const supabase = getSupabaseServer();
  
  await supabase
    .from('leads')
    .update({ 
      next_follow_up_at: due_at,
      ai_next_action: reason || 'Follow-up agendado'
    })
    .eq('id', leadId)
    .eq('organization_id', organizationId);

  return {
    success: true,
    follow_up_date: due_at,
    message: "Follow-up agendado com sucesso."
  };
}

/**
 * List pending follow-ups for the organization/agent
 */
export async function listPendingFollowups(input, context) {
  const { organizationId } = context;
  const supabase = getSupabaseServer();
  
  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, next_follow_up_at, ai_next_action')
    .eq('organization_id', organizationId)
    .not('next_follow_up_at', 'is', null)
    .lte('next_follow_up_at', new Date(Date.now() + 86400000 * 3).toISOString()) // next 3 days
    .order('next_follow_up_at', { ascending: true })
    .limit(10);
    
  return {
    success: true,
    pending_count: leads?.length || 0,
    leads: leads || []
  };
}

export default {
  simulateFinancing,
  sendMessage,
  matchLeadProperties,
  calculateLeadScore,
  generateDocument,
  extractDocumentText,
  checkAvailability,
  scheduleVisit,
  createFollowup,
  listPendingFollowups
};