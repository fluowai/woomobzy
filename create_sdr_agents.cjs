require('dotenv').config();
const { Client } = require('pg');
const { randomUUID } = require('crypto');

// Ignore self-signed certificate error
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  
  // Find org id from an existing agent to associate with
  const res = await client.query('SELECT organization_id, created_by FROM ai_agents LIMIT 1');
  if (res.rows.length === 0) {
    console.log('No organization found');
    process.exit(1);
  }
  const orgId = res.rows[0].organization_id;
  const createdBy = res.rows[0].created_by;
  
  const agentsToCreate = [
    {
      name: 'Especialista em Aluguel',
      role: 'Agente focado em buscar e apresentar imóveis para locação',
      agent_type: 'specialist',
      personality: 'Prático e ágil',
      instructions: 'Auxilie o lead a encontrar a melhor opção de aluguel de acordo com as necessidades. Dê foco nas garantias locatícias.',
      capabilities: ['Match de imóveis'],
      tools: ['crm', 'matchmaking']
    },
    {
      name: 'Especialista em Agendamento',
      role: 'Agente responsável por coordenar horários de visitas',
      agent_type: 'specialist',
      personality: 'Organizado e prestativo',
      instructions: 'Verifique a disponibilidade na agenda do corretor e do cliente e marque a visita ao imóvel.',
      capabilities: ['Agenda'],
      tools: ['agenda', 'crm']
    },
    {
      name: 'Especialista em Vendas',
      role: 'Agente focado em venda de imóveis',
      agent_type: 'specialist',
      personality: 'Consultivo e persuasivo',
      instructions: 'Apresente imóveis à venda, fale sobre financiamento e valores, e passe os dados para o corretor quando houver intenção de compra.',
      capabilities: ['Match de imóveis'],
      tools: ['crm', 'matchmaking', 'simulador-financiamento']
    }
  ];

  for (const agent of agentsToCreate) {
    const handoffRules = {
      __operational360: {
        agent_type: agent.agent_type,
        status: 'Ativo',
        autonomy_level: 2,
        operation_mode: 'Semiautônomo',
        channels: ['whatsapp']
      }
    };
    
    await client.query(
      `INSERT INTO ai_agents (id, organization_id, created_by, name, role, is_active, status, personality, instructions, handoff_rules, capabilities, tools, response_style, channel)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        randomUUID(),
        orgId,
        createdBy,
        agent.name,
        agent.role,
        true,
        'Ativo',
        agent.personality,
        agent.instructions,
        handoffRules,
        agent.capabilities,
        agent.tools,
        'consultivo',
        'whatsapp'
      ]
    );
    console.log('Created agent:', agent.name);
  }
  
  await client.end();
}
run().catch(console.error);
