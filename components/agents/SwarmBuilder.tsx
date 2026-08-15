import React from 'react';
import {
  AlertTriangle,
  Bot,
  ChevronRight,
  Plus,
  Workflow,
  Zap,
} from 'lucide-react';
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
  const orchestrators = agents.filter(
    (agent) => agent.agent_type === 'orchestrator'
  );
  const specialists = agents.filter(
    (agent) => agent.agent_type === 'specialist'
  );

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-black p-6 text-white shadow-xl sm:flex-row sm:items-center sm:p-8">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
              <Workflow size={22} />
            </div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              Orquestração multiagente
            </h2>
          </div>
          <p className="text-sm font-medium text-slate-300 sm:text-base">
            Estruture o agente principal, conecte especialistas reais e publique
            apenas equipes com contexto, ferramentas e canais definidos.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row">
          <button
            onClick={onCreateSpecialist}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-6 py-3 font-bold text-white transition hover:bg-slate-700 sm:w-auto"
          >
            <Plus size={18} />
            Novo especialista
          </button>
          <button
            onClick={onCreateNew}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white transition hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/25 sm:w-auto"
          >
            <Plus size={18} />
            Novo orquestrador
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {orchestrators.map((orchestrator) => {
          const subAgents = specialists.filter((specialist) =>
            orchestrator.sub_agents?.includes(specialist.id)
          );
          const hasPrompt = Boolean(orchestrator.instructions?.trim());
          const hasChannels =
            Boolean(orchestrator.channels?.length) ||
            Boolean(orchestrator.channel);
          const hasTools = Boolean(orchestrator.tools?.length);
          const hasAutonomy = Boolean(orchestrator.autonomy_level);
          const isReady =
            subAgents.length > 0 &&
            hasPrompt &&
            hasChannels &&
            hasTools &&
            hasAutonomy;
          const blockers = [
            subAgents.length === 0 ? 'Conectar especialistas' : '',
            !hasPrompt ? 'Definir prompt operacional' : '',
            !hasChannels ? 'Escolher canal de atuação' : '',
            !hasTools ? 'Selecionar ferramentas' : '',
          ].filter(Boolean);

          return (
            <div
              key={orchestrator.id}
              className="rounded-2xl border border-slate-200/60 bg-white/50 p-6 shadow-sm backdrop-blur-xl transition hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
                <button
                  type="button"
                  className="flex w-full flex-col justify-between rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white p-5 text-left transition hover:border-indigo-300 lg:w-[360px]"
                  onClick={() => onSelectAgent(orchestrator.id)}
                >
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded-md bg-indigo-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-700">
                        Orquestrador
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                          isReady
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {isReady ? 'Pronto' : 'Em ajuste'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {orchestrator.name}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {orchestrator.role}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
                      {subAgents.length} especialista(s)
                    </span>
                    <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
                      {(orchestrator.tools || []).length} ferramenta(s)
                    </span>
                    <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
                      Nível {orchestrator.autonomy_level || 2}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs font-bold text-indigo-600">
                    <Zap size={14} />
                    {orchestrator.is_active
                      ? 'Operando agora'
                      : 'Aguardando ativação'}
                  </div>
                </button>

                <div className="flex flex-col items-center justify-center text-slate-300 lg:w-16">
                  <div className="h-8 w-px bg-slate-300 lg:h-px lg:w-full" />
                  <ChevronRight className="hidden lg:block" size={20} />
                </div>

                <div className="flex-1 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Especialistas conectados
                    </h4>
                    {!isReady && blockers.length > 0 && (
                      <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
                        <AlertTriangle size={12} />
                        {blockers.join(' • ')}
                      </div>
                    )}
                  </div>

                  {subAgents.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {subAgents.map((specialist) => (
                        <button
                          key={specialist.id}
                          type="button"
                          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow"
                          onClick={() => onSelectAgent(specialist.id)}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <Bot size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold text-slate-900">
                              {specialist.name}
                            </div>
                            <div className="truncate text-xs font-medium text-slate-500">
                              {specialist.role}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-white/70 text-slate-400">
                      <p className="text-sm font-medium">
                        Nenhum especialista conectado.
                      </p>
                      <div className="flex gap-4">
                        <button
                          onClick={() => onSelectAgent(orchestrator.id)}
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
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 text-center">
            <Workflow size={48} className="mb-4 text-slate-300" />
            <p className="text-lg font-bold text-slate-900">
              Nenhum orquestrador criado
            </p>
            <p className="mt-1 max-w-xl text-sm font-medium text-slate-500">
              Comece pelo agente principal e conecte especialistas apenas quando
              houver uma responsabilidade clara para delegar.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={onCreateNew}
                className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
              >
                Criar orquestrador
              </button>
              <button
                onClick={onCreateSpecialist}
                className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Criar especialista
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
