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

    await architect.initialize('gemini', 'gemini-2.0-flash');
    await architect.initialize('groq', 'llama-3.1-8b-instant');

    expect(architect.providerOverride).toBe('groq');
    expect(architect.modelName).toBe('llama-3.1-8b-instant');
  });

  it('fails explicitly when no real provider can generate architecture', async () => {
    const architect = createArchitect([]);

    await expect(
      architect.designArchitecture(input, 'groq', 'llama-3.1-8b-instant')
    ).rejects.toThrow('Agent Architect failed with real provider');
  });
});
