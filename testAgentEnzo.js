import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getAgentRuntime } from './server/services/ai/agentRuntime.js';
import crypto from 'crypto';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log('=== TESTE DO AGENTE PARA A CONTA "ENZO" ===\n');

  // 1. Find the organization Enzo
  console.log('1. Buscando organização "enzo"...');
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name')
    .ilike('name', '%Enzo%')
    .limit(1);

  if (!orgs || orgs.length === 0) {
    console.log('❌ Organização "Enzo" não encontrada.');
    return;
  }
  const enzo = orgs[0];
  console.log(`✅ Organização encontrada: ${enzo.name} (ID: ${enzo.id})\n`);

  // 2. Find Agent
  console.log('2. Buscando agente ativo...');
  const { data: agents } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('organization_id', enzo.id)
    .eq('type', 'ORCHESTRATOR')
    .limit(1);
    
  if (!agents || agents.length === 0) {
    console.log('❌ Nenhum agente encontrado nesta conta.');
    return;
  }
  const agent = agents[0];
  
  const { data: versions } = await supabase
    .from('ai_agent_versions')
    .select('*')
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })
    .limit(1);

  const activeVersion = versions?.[0];
  console.log(`✅ Agente selecionado: ${agent.name} (Tipo: ${agent.type})`);
  console.log(`   Ferramentas disponíveis: ${activeVersion?.tools?.join(', ')}\n`);
      
  console.log('3. Executando simulação de conversa...');
  const runtime = getAgentRuntime();
  
  const conversationId = crypto.randomUUID();
  console.log(`[STATE] Nova conversa iniciada com ID: ${conversationId}`);

  // Create lead
  let { data: lead } = await supabase.from('leads').select('id').eq('organization_id', enzo.id).eq('phone', '5548988003260').limit(1).single();
  if (!lead) {
    const { data: newLead } = await supabase.from('leads').insert({ organization_id: enzo.id, name: 'Paulo', phone: '5548988003260', source: 'Website', status: 'Novo' }).select('id').single();
    lead = newLead;
  }

  const testMessages = [
    "Olá, me chamo Paulo, meu telefone é 5548988003260 e quero alugar o Apartamento Campinas Sao Jose",
    "Qual o valor do aluguel deste apartamento e condomínio?",
    "Pode agendar uma visita para mim amanhã às 14h?"
  ];

  const conversationHistory = [];

  for (const message of testMessages) {
    console.log(`\n🗣️ Lead: "${message}"`);
    conversationHistory.push(`Lead: ${message}`);
    console.log('⏳ Processando (AgentRuntime)...');
    
    try {
      const result = await runtime.processMessage({
        organizationId: enzo.id,
        conversationId,
        channel: 'sandbox',
        instanceId: null,
        leadId: lead.id,
        agentId: agent.id,
        messageContent: message
      });
      
      console.log(`🤖 Agente: "${result.response}"`);
      conversationHistory.push(`Agente: ${result.response}`);
      if (result.toolCalls && result.toolCalls.length > 0) {
        console.log(`   🛠️ Tools usadas: ${result.toolCalls.map(t => t.name).join(', ')}`);
      }
    } catch (err) {
      console.log('❌ Erro no processamento:', err.message);
    }
  }

  // Final step: update the lead notes with the conversation history (Kanban card)
  console.log('\n📝 Salvando histórico da conversa no card do Lead (Kanban)...');
  await supabase
    .from('leads')
    .update({ notes: conversationHistory.join('\n\n') })
    .eq('id', lead.id);

  console.log('✅ Histórico salvo com sucesso no Lead Kanban!');
  
  console.log('\n=== TESTE CONCLUÍDO ===');
}

run().catch(console.error);
