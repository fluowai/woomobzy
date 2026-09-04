import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

// MOCK the logger before importing anything that might use it
global.logger = { info: console.log, error: console.error, warn: console.warn, debug: console.log };

// Set ENV vars so supabase-server.js works if it uses env vars directly
process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;

import { getAgentRuntime } from './server/services/ai/agentRuntime.js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ORG_ID = '91b29fed-d6db-48d4-a721-271172c04b39'; // Enzo Imoveis
const AGENT_ID = '0b3576a9-47ab-4951-b351-d17875601007'; // Orquestrador
const PHONE = '5547992701014'; // Carlos
const CONVO_ID = 'test-convo-carlos-' + Date.now();
const INSTANCE_ID = 'df502491-7ff7-4d1e-a34b-98f087ea5191'; // Instance PauloA

async function runTest() {
  console.log('--- INICIANDO TESTE DO AGENTE ---');
  
  // 1. Criar lead mock ou usar existente
  const { data: lead, error: leadError } = await supabase.from('leads').upsert({
    id: '88c40570-6e53-49a1-b46c-cce945316516',
    organization_id: ORG_ID,
    name: 'Carlos (Teste IA)',
    phone: '47992701014',
    status: 'Novo',
    source: 'whatsapp'
  }).select('*').single();
    
    if (leadError) {
      console.error('Erro ao criar lead:', leadError);
      return;
    }
  
  console.log('Lead ID:', lead.id, '| Nome:', lead.name, '| Status:', lead.status);

  // 1.5 Criar ou atualizar whatsapp_chat
  const { data: chatRecord, error: chatError } = await supabase.from('whatsapp_chats').upsert({
    id: 'a8c40570-6e53-49a1-b46c-cce945316516',
    instance_id: INSTANCE_ID,
    chat_jid: '5547992701014@s.whatsapp.net',
    name: 'Carlos',
    last_message: 'Iniciando teste...',
    last_message_at: new Date().toISOString()
  }, { onConflict: 'id' }).select('*').single();

  if (chatError) {
    console.error('Erro ao criar whatsapp_chat:', chatError);
    return;
  }
  console.log('Chat ID:', chatRecord.id);
  
  const runtime = getAgentRuntime();

  // Helper para simular envio
  async function chat(message) {
    console.log('\n====================================');
    console.log('🧑 Carlos:', message);

    // Inserir mensagem do usuario (inbound)
    await supabase.from('whatsapp_messages').insert({
      id: crypto.randomUUID(),
      chat_id: chatRecord.id,
      instance_id: INSTANCE_ID,
      message_id: 'msg_in_' + Date.now(),
      direction: 'inbound',
      type: 'text',
      content: message,
      timestamp: new Date().toISOString(),
      delivery_status: 'read'
    });
    
    const result = await runtime.processMessage({
      organizationId: ORG_ID,
      conversationId: CONVO_ID,
      channel: 'whatsapp',
      instanceId: INSTANCE_ID,
      leadId: lead.id,
      agentId: AGENT_ID,
      messageContent: message
    });
    
    console.log('🤖 Agente:', result.response);

    // Processar imagens dos toolCalls para enviar no chat
    if (result.toolCalls && result.toolCalls.length > 0) {
      console.log('🔧 Tools Chamadas:', JSON.stringify(result.toolCalls.map(t => t.name)));
      for (const call of result.toolCalls) {
        let matches = [];
        if (call.name === 'matchLeadProperties' && call.result?.matches) {
          matches = call.result.matches;
        } else if (call.name === 'properties.search' && call.result?.results) {
          matches = call.result.results;
        }

        for (const match of matches) {
          let imageUrl = match.image || (match.images && match.images[0]);
          if (!imageUrl && match.id) {
             const {data: prop} = await supabase.from('properties').select('images').eq('id', match.id).single();
             if (prop?.images?.[0]) imageUrl = prop.images[0];
          }
          if (imageUrl) {
            console.log('📸 Enviando foto do imóvel:', match.title);
            await supabase.from('whatsapp_messages').insert({
              id: crypto.randomUUID(),
              chat_id: chatRecord.id,
              instance_id: INSTANCE_ID,
              message_id: 'msg_img_' + Date.now() + Math.random(),
              direction: 'outbound',
              type: 'image',
              content: match.title || 'Foto do Imóvel',
              media_url: imageUrl,
              timestamp: new Date().toISOString(),
              delivery_status: 'sent'
            });
          }
        }
      }
    }

    // Inserir resposta do agente (outbound)
    await supabase.from('whatsapp_messages').insert({
      id: crypto.randomUUID(),
      chat_id: chatRecord.id,
      instance_id: INSTANCE_ID,
      message_id: 'msg_out_' + Date.now(),
      direction: 'outbound',
      type: 'text',
      content: result.response,
      timestamp: new Date().toISOString(),
      delivery_status: 'sent'
    });

    // Atualizar last_message_at do chat
    await supabase.from('whatsapp_chats').update({
      last_message: result.response,
      last_message_at: new Date().toISOString()
    }).eq('id', chatRecord.id);
  }

  // 2. Simular dialogo
  await chat('Olá, me chamo Carlos, meu telefone é 47992701014 e estou procurando um imóvel para alugar no valor de até 1500 reais. Vocês têm alguma opção cadastrada?');
  
  // Pausa curta para nao sobrepor timestamps
  await new Promise(r => setTimeout(r, 2000));
  await chat('Gostei, me mostre as fotos se houver e me diga as condições de locação?');
  
  await new Promise(r => setTimeout(r, 2000));
  await chat('Pode agendar uma visita para mim amanhã às 14h?');
  
  await new Promise(r => setTimeout(r, 2000));
  await chat('Pode ser na quarta-feira às 14h00 então. Por favor, registre o agendamento no sistema usando sua ferramenta. E muito obrigado pela ajuda!');
  
  // 3. Checar status do lead após o dialogo
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
