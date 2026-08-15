import React from 'react';
import { Bot, Circle, Network, Plus, Settings2 } from 'lucide-react';
import type { AIAgent } from '../../services/aiAgents';

interface AgentSidebarProps {
  agents: AIAgent[];
  selectedId: string;
  onSelect: (id: string) => void;
  onNew: (type?: 'orchestrator' | 'specialist') => void;
  search: string;
  onSearchChange: (value: string) => void;
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function matchesSearch(agent: AIAgent, search: string) {
  if (!search.trim()) {
    return true;
  }

  const normalizedSearch = normalizeText(search);
  const searchBlob = [
    agent.name,
    agent.role,
    agent.status,
    agent.channel,
    agent.agent_type,
    ...(agent.channels || []),
    ...(agent.capabilities || []),
    ...(agent.tools || []),
  ]
    .filter(Boolean)
    .join(' ');

  return normalizeText(searchBlob).includes(normalizedSearch);
}

export const AgentSidebar: React.FC<AgentSidebarProps> = ({
  agents,
  selectedId,
  onSelect,
  onNew,
  search,
  onSearchChange,
}) => {
  const activeCount = agents.filter((agent) => agent.is_active).length;
  const pausedCount = agents.length - activeCount;
  const orchestrators = agents.filter(
    (agent) =>
      agent.agent_type === 'orchestrator' && matchesSearch(agent, search)
  );
  const specialists = agents.filter(
    (agent) =>
      agent.agent_type !== 'orchestrator' && matchesSearch(agent, search)
  );

  return (
    <aside className="w-full shrink-0 space-y-3 lg:w-80">
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Agentes IA
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {activeCount} ativos
            </div>
            {pausedCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <Circle size={8} fill="currentColor" />
                {pausedCount} pausados
              </div>
            )}
          </div>
        </div>

        <div className="p-3">
          <div className="relative">
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-8 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              placeholder="Buscar por nome, função, canal ou ferramenta"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => onNew('orchestrator')}
              className="flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white hover:bg-slate-800"
            >
              <Plus size={14} />
              Orquestrador
            </button>
            <button
              onClick={() => onNew('specialist')}
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Plus size={14} />
              Especialista
            </button>
          </div>
        </div>

        <div className="space-y-4 px-3 pb-3">
          {orchestrators.length === 0 && specialists.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-medium text-slate-500">
              Nenhum agente corresponde à busca atual.
            </div>
          ) : (
            <>
              <AgentGroup
                title="Orquestradores"
                icon={Network}
                agents={orchestrators}
                selectedId={selectedId}
                onSelect={onSelect}
              />
              <AgentGroup
                title="Especialistas"
                icon={Settings2}
                agents={specialists}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            </>
          )}
        </div>
      </div>
    </aside>
  );
};

const AgentGroup: React.FC<{
  title: string;
  icon: React.ElementType;
  agents: AIAgent[];
  selectedId: string;
  onSelect: (id: string) => void;
}> = ({ title, icon: Icon, agents, selectedId, onSelect }) => {
  if (agents.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        <Icon size={12} />
        {title}
      </div>
      <div className="space-y-1">
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => onSelect(agent.id)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
              selectedId === agent.id
                ? 'bg-emerald-50 text-emerald-800'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
            }`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-md ${
                agent.is_active
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              <Bot size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold">{agent.name}</div>
              <div className="truncate text-[10px] font-bold text-slate-400">
                {agent.role}
              </div>
            </div>
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                agent.is_active ? 'bg-emerald-400' : 'bg-slate-300'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
};
