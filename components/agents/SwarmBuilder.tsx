import React from 'react';
import { Bot, Zap, Plus, Workflow, ChevronRight } from 'lucide-react';
import type { AIAgent } from '../../services/aiAgents';

interface SwarmBuilderProps {
  agents: AIAgent[];
  onSelectAgent: (id: string) => void;
  onCreateNew: () => void;
  onCreateSpecialist: () => void;
}

export const SwarmBuilder: React.FC<SwarmBuilderProps> = ({
  agents,
  onSelectAgent,
  onCreateNew,
  onCreateSpecialist,
}) => {
  const orchestrators = agents.filter((a) => a.agent_type === 'orchestrator');
  const specialists = agents.filter((a) => a.agent_type === 'specialist');

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-black p-6 sm:p-8 text-white shadow-xl gap-4">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
              <Workflow size={22} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Swarms Autônomos
            </h2>
          </div>
          <p className="text-sm sm:text-base text-slate-400 font-medium">
            Conecte vários agentes especialistas a um Orquestrador. O Orquestrador
            fica na linha de frente atendendo o cliente e delega tarefas complexas
            para a equipe nos bastidores.
          </p>
        </div>
        <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onCreateSpecialist}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-slate-800 px-6 py-3 font-bold text-white transition hover:bg-slate-700"
          >
            <Plus size={18} /> Novo Especialista
          </button>
          <button
            onClick={onCreateNew}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white transition hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/25"
          >
            <Plus size={18} /> Novo Orquestrador
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {orchestrators.map((orch) => {
          const subs = specialists.filter((s) =>
            orch.sub_agents?.includes(s.id)
          );

          return (
            <div
              key={orch.id}
              className="rounded-2xl border border-slate-200/60 bg-white/50 p-6 shadow-sm backdrop-blur-xl transition hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-stretch">
                {/* Orquestrador Card */}
                <div
                  className="flex w-full cursor-pointer flex-col justify-between rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white p-5 transition hover:border-indigo-300 lg:w-1/3"
                  onClick={() => onSelectAgent(orch.id)}
                >
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded-md bg-indigo-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-700">
                        Orquestrador
                      </span>
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {orch.name}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {orch.role}
                    </p>
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-xs font-bold text-indigo-600">
                    <Zap size={14} /> {orch.autonomy_level === 3 ? 'Autônomo' : 'Semiautônomo'}
                  </div>
                </div>

                {/* Arrow / Connection */}
                <div className="flex flex-col items-center justify-center text-slate-300 lg:w-16">
                  <div className="h-8 w-px bg-slate-300 lg:h-px lg:w-full" />
                  <ChevronRight className="hidden lg:block" size={20} />
                </div>

                {/* Sub-agents Grid */}
                <div className="flex-1 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-5 w-full">
                  <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                    Especialistas Conectados
                  </h4>
                  {subs.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {subs.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow"
                          onClick={() => onSelectAgent(sub.id)}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <Bot size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold text-slate-900">
                              {sub.name}
                            </div>
                            <div className="truncate text-xs font-medium text-slate-500">
                              {sub.role}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-white/50 text-slate-400">
                      <p className="text-sm font-medium">Nenhum especialista conectado.</p>
                      <div className="flex gap-4">
                        <button
                          onClick={() => onSelectAgent(orch.id)}
                          className="text-xs font-bold text-indigo-600 hover:underline"
                        >
                          Conectar especialistas
                        </button>
                        <button
                          onClick={onCreateSpecialist}
                          className="text-xs font-bold text-slate-600 hover:underline"
                        >
                          Criar novo especialista
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {orchestrators.length === 0 && (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white">
            <Workflow size={48} className="mb-4 text-slate-300" />
            <p className="text-lg font-bold text-slate-900">Nenhum Swarm criado</p>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Crie o seu primeiro Orquestrador para começar a montar uma equipe.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
