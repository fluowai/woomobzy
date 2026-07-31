import React from 'react'
import { Bot, Circle, Plus } from 'lucide-react'
import type { AIAgent } from '../../services/aiAgents'

interface AgentSidebarProps {
  agents: AIAgent[]
  selectedId: string
  onSelect: (id: string) => void
  onNew: () => void
  search: string
  onSearchChange: (value: string) => void
}

export const AgentSidebar: React.FC<AgentSidebarProps> = ({
  agents,
  selectedId,
  onSelect,
  onNew,
  search,
  onSearchChange,
}) => {
  const activeCount = agents.filter((a) => a.is_active).length
  const pausedCount = agents.length - activeCount

  return (
    <aside className="w-full shrink-0 space-y-3 lg:w-72">
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Agentes IA
          </div>
          <div className="mt-1 flex items-center gap-3">
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
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-8 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              placeholder="Buscar agente..."
            />
          </div>
        </div>

        <div className="space-y-1 px-3 pb-3">
          <button
            onClick={onNew}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-bold transition ${
              selectedId === 'new'
                ? 'bg-emerald-50 text-emerald-800'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
            }`}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-slate-300 text-slate-400">
              <Plus size={14} />
            </div>
            Novo agente
          </button>

          {agents.length > 0 && (
            <div className="pt-2">
              <div className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Salvos
              </div>
              {agents
                .filter(
                  (a) =>
                    !search ||
                    a.name.toLowerCase().includes(search.toLowerCase()) ||
                    a.role.toLowerCase().includes(search.toLowerCase())
                )
                .map((agent) => (
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
                      className={`flex h-7 w-7 items-center justify-center rounded-md ${
                        agent.is_active
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <Bot size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold">
                        {agent.name}
                      </div>
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
          )}
        </div>
      </div>
    </aside>
  )
}
