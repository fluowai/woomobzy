import { describe, expect, it, vi } from 'vitest';
import { AgentArchitect } from '../services/ai/agentArchitect.js';

const createArchitect = (availableProviders = ['gemini', 'groq']) => {
  const architect = new AgentArchitect();
  architect.llmOrchestrator = {
    initialize: vi.fn(),
    getAvailableProviders: () => availableProviders,
    providers: new Map(availableProviders.map(provider => [provider, { name: provider }]))
  } as never;
  return architect;
};

const input = {
  tenant: { id: 'tenant-1', name: 'Imobzy Teste' },
  segment: 'URBAN_REAL_ESTATE',
  businessModel: { operations: ['Venda', 'Locação'] },
  objectives: ['Qualificação', 'Busca de imóveis', 'Agendamento'],
  channelsAvailable: [{ type: 'whatsapp', instanceId: 'wa-1', name: 'Comercial' }],
  crmConfiguration: { enabled: true },
  funnels: [],
  availableTools: [
    { name: 'crm.leads.create', category: 'crm', description: 'Criar lead' },
    { name: 'crm.leads.update', category: 'crm', description: 'Atualizar lead' },
    { name: 'properties.search', category: 'properties', description: 'Buscar imóveis' },
    { name: 'calendar.availability', category: 'calendar', description: 'Consultar agenda' },
    { name: 'calendar.create', category: 'calendar', description: 'Agendar visita' }
  ],
  knowledgeSources: [],
  businessRules: []
};

describe('AgentArchitect', () => {
  it('updates provider and model overrides between singleton calls', async () => {
    const architect = createArchitect();

    await architect.initialize('gemini', 'gemini-1.5-pro');
    await architect.initialize('groq', 'llama-3.1-8b-instant');

    expect(architect.providerOverride).toBe('groq');
    expect(architect.modelName).toBe('llama-3.1-8b-instant');
  });

  it('fallback architecture creates agents with the selected Groq model', async () => {
    const architect = createArchitect([]);

    const architecture = await architect.designArchitecture(input, 'groq', 'llama-3.1-8b-instant');

    expect(architecture.operation.agents).toHaveLength(3);
    expect(architecture.operation.agents.some(agent => agent.type === 'ORCHESTRATOR')).toBe(true);
    expect(architecture.operation.agents.every(agent => agent.model === 'llama-3.1-8b-instant')).toBe(true);
    expect(architecture.testPlan.length).toBeGreaterThan(0);
  });
});
