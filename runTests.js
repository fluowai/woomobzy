import { runTestSuite } from './server/services/ai/testRunner.js';
import fs from 'fs';

const agent = {
  id: 'test-agent-01',
  name: 'Zya',
  type: 'SDR Vendas'
};

const testCases = [
  {
    category: 'qualificacao',
    input: 'Oi',
    expected: 'nome' // expects the agent to ask for name or start qualification
  },
  {
    category: 'busca',
    input: 'Quero um apartamento de 2 quartos na zona sul',
    expected: 'vou verificar' 
  },
  {
    category: 'agendamento',
    input: 'Podemos agendar uma visita para amanhã às 14h?',
    expected: 'agendado'
  }
];

async function main() {
  console.log('Iniciando simulação de testes com o agente...');
  try {
    const results = await runTestSuite(agent, testCases, { mode: 'mock' });
    console.log(JSON.stringify(results.summary, null, 2));
    
    fs.writeFileSync('agent_test_report.json', JSON.stringify(results, null, 2));
    console.log('Resultados salvos em agent_test_report.json');
  } catch (error) {
    console.error('Erro ao rodar testes:', error);
  }
  process.exit(0);
}

main();
