import React from 'react';
import {
  Activity,
  BadgeCheck,
  Bot,
  Clock,
  MessageSquare,
  Power,
  Settings,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import type { AIAgent, AgentMetrics } from '../../services/aiAgents';
import { AgentMetricsCard } from './AgentMetricsCard';

interface AgentDashboardProps {
  agent: AIAgent;
  allAgents: AIAgent[];
  metrics: AgentMetrics | null;
  metricsLoading: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  onTest: () => void;
}

const toolLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  kanban: 'Kanban',
  agenda: 'Agenda',
  crm: 'CRM',
  documentos: 'Documentos',
  'pdf-reader': 'Leitor de PDF',
  'audio-stt': 'Transcrição de áudio',
  matchmaking: 'Match de imóveis',
  'follow-up': 'Follow-up',
  'notificar-corretor': 'Notificar corretor',
  'criar-tarefa': 'Criar tarefa',
  'mover-etapa-funil': 'Mover etapa do funil',
  'simulador-financiamento': 'Simulador financeiro',
  'neural-sales': 'Neural Sales',
  'voice-ai': 'Voice AI',
};

const channelLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  site: 'Site',
  crm: 'CRM',
  instagram: 'Instagram',
  email: 'E-mail',
};

export const AgentDashboard: React.FC<AgentDashboardProps> = ({
  agent,
  allAgents,
  metrics,
  metricsLoading,
  onEdit,
  onToggleStatus,
  onTest,
}) => {
  const isActive = agent.is_active;
  const tools = (agent.tools || []).map((tool) => toolLabels[tool] || tool);
  const availableTools = Object.values(toolLabels).filter(
    (tool) => !tools.includes(tool)
  );
  const channels = agent.channels?.length
    ? agent.channels.map((channel) => channelLabels[channel] || channel)
    : [channelLabels[agent.channel] || agent.channel || 'WhatsApp'];
  const connectedSpecialists = allAgents.filter((candidate) =>
    agent.sub_agents?.includes(candidate.id)
  );
  const readinessItems = [
    {
      id: 'status',
      label: 'Status operacional',
      detail: isActive ? 'Ativo e disponível para uso.' : 'Pausado no momento.',
      ready: isActive,
    },
    {
      id: 'prompt',
      label: 'Prompt e contexto',
      detail: agent.instructions?.trim()
        ? 'Prompt configurado com instruções operacionais.'
        : 'Sem instruções operacionais registradas.',
      ready: Boolean(agent.instructions?.trim()),
    },
    {
      id: 'channels',
      label: 'Canais',
      detail: channels.join(', '),
      ready: channels.length > 0,
    },
    {
      id: 'tools',
      label: 'Ferramentas',
      detail: tools.length
        ? `${tools.length} ferramenta(s) habilitada(s).`
        : 'Nenhuma ferramenta habilitada.',
      ready: tools.length > 0,
    },
    {
      id: 'autonomy',
      label: 'Autonomia',
      detail: `Nível ${agent.autonomy_level || 2}`,
      ready: Boolean(agent.autonomy_level),
    },
  ];

  if (agent.agent_type === 'orchestrator') {
    readinessItems.splice(2, 0, {
      id: 'specialists',
      label: 'Especialistas conectados',
      detail: connectedSpecialists.length
        ? `${connectedSpecialists.length} especialista(s) de apoio conectado(s).`
        : 'Nenhum especialista conectado.',
      ready: connectedSpecialists.length > 0,
    });
  }

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div
          className={`pointer-events-none absolute right-0 top-0 -mr-10 -mt-10 h-64 w-64 rounded-full opacity-20 blur-3xl ${
            isActive ? 'bg-emerald-500' : 'bg-slate-500'
          }`}
        />
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-start">
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
            <div className="mb-2 flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isActive ? 'animate-pulse bg-emerald-500' : 'bg-slate-500'
                  }`}
                />
                {isActive ? 'Online' : 'Pausado'}
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                {agent.agent_type === 'orchestrator'
                  ? 'Agente principal'
                  : 'Especialista'}
              </span>
            </div>
            <h1 className="mb-1 text-2xl font-bold text-slate-900">
              {agent.name}
            </h1>
            <p className="text-sm font-medium text-slate-500">{agent.role}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-4 md:justify-start">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <Activity size={14} /> {channels.length} canal(is)
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <Zap size={14} /> {tools.length} ferramenta(s)
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <Clock size={14} /> Nível {agent.autonomy_level || 2}
              </span>
            </div>
          </div>

          <div className="z-10 flex shrink-0 flex-wrap items-center gap-3">
            <button
              onClick={onTest}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <MessageSquare size={16} />
              Testar
            </button>
            <button
              onClick={onEdit}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Settings size={16} />
              Editar
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Informações
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-bold text-slate-500">Personalidade:</span>
              <p className="mt-0.5 text-slate-700">
                {agent.personality || 'Ainda não definida'}
              </p>
            </div>
            <div>
              <span className="font-bold text-slate-500">Prompt:</span>
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
              <span className="text-slate-700">{channels.join(', ')}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500">Modo:</span>{' '}
              <span className="text-slate-700">
                {agent.operation_mode || 'Semiautônomo'}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-600" />
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Prontidão
            </div>
          </div>
          <div className="space-y-3">
            {readinessItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border p-3 ${
                  item.ready
                    ? 'border-emerald-100 bg-emerald-50/70'
                    : 'border-amber-100 bg-amber-50/70'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      item.ready
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    <BadgeCheck size={14} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {item.label}
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-600">
                      {item.detail}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Ferramentas conectadas
          </div>
          <div className="flex flex-wrap gap-2">
            {tools.map((tool) => (
              <span
                key={tool}
                className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"
              >
                {tool}
              </span>
            ))}
          </div>
          <div className="mt-5 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Ainda indisponíveis neste agente
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {availableTools.map((tool) => (
              <span
                key={tool}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Users size={16} className="text-emerald-600" />
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Especialistas conectados
            </div>
          </div>
          {agent.agent_type === 'orchestrator' ? (
            connectedSpecialists.length > 0 ? (
              <div className="space-y-3">
                {connectedSpecialists.map((specialist) => (
                  <div
                    key={specialist.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="text-sm font-bold text-slate-900">
                      {specialist.name}
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-500">
                      {specialist.role}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-medium text-slate-500">
                Nenhum especialista conectado a este orquestrador.
              </div>
            )
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-600">
              Este agente atua como especialista e pode ser conectado por um
              orquestrador.
            </div>
          )}
        </div>
      </div>

      <AgentMetricsCard metrics={metrics} loading={metricsLoading} />
    </div>
  );
};
