import React from 'react';
import {
  Bot,
  Power,
  Settings,
  MessageSquare,
  Activity,
  Zap,
  Clock,
} from 'lucide-react';
import type { AIAgent, AgentMetrics } from '../../services/aiAgents';
import { AgentMetricsCard } from './AgentMetricsCard';

interface AgentDashboardProps {
  agent: AIAgent;
  metrics: AgentMetrics | null;
  metricsLoading: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  onTest: () => void;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({
  agent,
  metrics,
  metricsLoading,
  onEdit,
  onToggleStatus,
  onTest,
}) => {
  const isActive = agent.is_active;
  const toolCount = agent.tools?.length || 0;
  const channelCount = agent.channels?.length || 1;

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div
          className={`pointer-events-none absolute right-0 top-0 -mr-10 -mt-10 h-64 w-64 rounded-full opacity-20 blur-3xl ${
            isActive ? 'bg-emerald-500' : 'bg-slate-500'
          }`}
        />
        <div className="relative z-10 flex flex-col items-center gap-6 md:flex-row md:items-start">
          <div className="relative shrink-0">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-100 bg-slate-50 shadow-inner">
              <Bot
                size={40}
                className={isActive ? 'text-emerald-500' : 'text-slate-400'}
              />
            </div>
            <div
              className={`absolute bottom-0 right-0 h-5 w-5 rounded-full border-4 border-white ${
                isActive ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            />
          </div>
          <div className="z-10 flex-1 text-center md:text-left">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <span
                className={`h-1.5 w-1.5 rounded-full ${isActive ? 'animate-pulse bg-emerald-500' : 'bg-slate-500'}`}
              />
              {isActive ? 'Online' : 'Pausado'}
            </div>
            <h1 className="mb-1 text-2xl font-bold text-slate-900">
              {agent.name}
            </h1>
            <p className="text-sm font-medium text-slate-500">{agent.role}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-4 md:justify-start">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <Activity size={14} /> {channelCount} canal(is)
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <Zap size={14} /> {toolCount} ferramenta(s)
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <Clock size={14} /> Nível {agent.autonomy_level || 2}
              </span>
            </div>
          </div>
          <div className="z-10 flex shrink-0 items-center gap-3">
            <button
              onClick={onTest}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <MessageSquare size={16} /> Testar
            </button>
            <button
              onClick={onEdit}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Settings size={16} /> Editar
            </button>
            <button
              onClick={onToggleStatus}
              className={`flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold shadow-sm transition ${
                isActive
                  ? 'border border-red-200 bg-white text-red-600 hover:bg-red-50'
                  : 'border border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <Power size={16} />
              {isActive ? 'Pausar' : 'Ativar'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Informações
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-bold text-slate-500">Personalidade:</span>
              <p className="mt-0.5 text-slate-700">
                {agent.personality || 'Padrão'}
              </p>
            </div>
            <div>
              <span className="font-bold text-slate-500">Instruções:</span>
              <p className="mt-0.5 text-slate-700">
                {agent.instructions || 'Nenhuma instrução personalizada'}
              </p>
            </div>
            <div>
              <span className="font-bold text-slate-500">Estilo:</span>{' '}
              <span className="text-slate-700 capitalize">
                {agent.response_style || 'Consultivo'}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500">Canais:</span>{' '}
              <span className="text-slate-700">
                {agent.channels?.join(', ') || agent.channel || 'whatsapp'}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500">Modo:</span>{' '}
              <span className="text-slate-700">
                {agent.operation_mode || 'Semiautônomo'}
              </span>
            </div>
          </div>
        </div>

        <AgentMetricsCard metrics={metrics} loading={metricsLoading} />
      </div>
    </div>
  );
};
