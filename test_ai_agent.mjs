import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// MOCK the logger before importing anything that might use it
global.logger = { info: console.log, error: console.error, warn: console.warn, debug: console.log };

// Set ENV vars so supabase-server.js works if it uses env vars directly
process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;

import { getAgentRuntime } from './server/services/ai/agentRuntime.js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ORG_ID = '91b29fed-d6db-48d4-a721-271172c04b39'; // Enzo Imoveis
const AGENT_ID = '0b3576a9-47ab-4951-b351-d17875601007'; // Orquestrador
const PHONE = '5548991138937';
const CONVO_ID = 'test-convo-paulo-' + Date.now();

async function runTest() {
  console.log('--- INICIANDO TESTE DO AGENTE ---');
  
  // 1. Criar lead mock ou usar existente
  const { data: lead, error: leadError } = await supabase.from('leads').upsert({
    id: '78c40570-6e53-49a1-b46c-cce945316515',
    organization_id: ORG_ID,
    name: 'Paulo (Teste IA)',
    phone: '48991138937',
    status: 'Novo',
    source: 'whatsapp'
  }).select('*').single();
    
    if (leadError) {
      console.error('Erro ao criar lead:', leadError);
      return;
    }
  
  console.log('Lead ID:', lead.id, '| Nome:', lead.name, '| Status:', lead.status);
  
  const runtime = getAgentRuntime();

  // Helper para simular envio
  async function chat(message) {
    console.log('\n====================================');
    console.log('🧑 Paulo:', message);
    
    const result = await runtime.processMessage({
      organizationId: ORG_ID,
      conversationId: CONVO_ID,
      channel: 'whatsapp',
      instanceId: 'test-instance',
      leadId: lead.id,
      agentId: AGENT_ID,
      messageContent: message
    });
    
    console.log('🤖 Agente:', result.response);
    if (result.toolCalls && result.toolCalls.length > 0) {
      console.log('🔧 Tools Chamadas:', JSON.stringify(result.toolCalls.map(t => t.name)));
    }
  }

  // 2. Simular dialogo
  await chat('Olá, me chamo Paulo, meu telefone é 5548988003260 e quero alugar o Apartamento Campinas Sao Jose');
  await chat('Qual o valor do aluguel deste apartamento e condomínio?');
  await chat('Pode agendar uma visita para mim amanhã às 14h?');
  
  // 3. Checar status do lead após o dialogo (deve ter sido movido no kanban / status)
  const { data: updatedLead } = await supabase.from('leads').select('*').eq('id', lead.id).single();
  console.log('\n--- RESULTADO FINAL DO LEAD ---');
  console.log(`Status atualizado: ${updatedLead?.status}`);
  console.log(`Fase do Kanban (kanban_status): ${updatedLead?.kanban_status || 'N/A'}`);
  console.log(`Observações: ${updatedLead?.notes || 'N/A'}`);

  // Checar agendamentos
  const { data: appointments } = await supabase.from('lead_appointments').select('*').eq('lead_id', lead.id);
  console.log(`Agendamentos gerados:`, appointments?.map(a => ({ title: a.title, date: a.appointment_date, notes: a.notes })));
}

runTest().catch(console.error);
