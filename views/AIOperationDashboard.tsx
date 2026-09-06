import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, AlertTriangle, BarChart3, Bot, Brain, CheckCircle2, Database,
  FileText, GitBranch, Hand, Link2, Loader2, MessageCircle, MessageSquare,
  Pause, Pencil, Play, Radio, RefreshCw, Settings, Star, TestTube2, Timer,
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { useAIPath } from '@/src/hooks/usePanelBase';
import {
  AIAgent,
  AIOperation,
  getOperation,
  getOperationHistory,
  getOperationKnowledge,
  getOperationLogs,
  getOperationMetrics,
  OperationMetrics,
  updateOperation
} from '../services/aiWorkforce';

const tabs = [
  ['overview', 'Visão geral', BarChart3],
  ['agents', 'Agentes', Bot],
  ['tests', 'Testes', TestTube2],
  ['channels', 'Canais', Radio],
  ['history', 'Histórico', GitBranch],
  ['logs', 'Logs', FileText],
  ['knowledge', 'Conhecimento', Database]
] as const;

type Tab = typeof tabs[number][0];

function formatDate(value: unknown) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(String(value)));
}

function activeVersion(agent: AIAgent) {
  return agent.versions?.find((version) => version.id === agent.active_version_id) || agent.versions?.[0] || null;
}

const AIOperationDashboard: React.FC = () => {
  const aiPath = useAIPath();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [pausing, setPausing] = useState(false);
  const [operation, setOperation] = useState<AIOperation | null>(null);
  const [metrics, setMetrics] = useState<OperationMetrics | null>(null);
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [knowledge, setKnowledge] = useState<Array<Record<string, unknown>>>([]);

  const loadData = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [op, met, logRows, historyRows, knowledgeRows] = await Promise.all([
        getOperation(id),
        getOperationMetrics(id, '30d'),
        getOperationLogs(id, { limit: 100 }),
        getOperationHistory(id, 100),
        getOperationKnowledge(id)
      ]);
      setOperation(op);
      setMetrics(met);
      setLogs(logRows);
      setHistory(historyRows);
      setKnowledge(knowledgeRows);
    } catch (error: any) {
      toast.error(`Erro ao carregar operação: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const toggleStatus = async () => {
    if (!id || !operation) return;
    setPausing(true);
    try {
      const nextStatus = operation.status === 'PUBLISHED' ? 'PAUSED' : 'PUBLISHED';
      const updated = await updateOperation(id, { status: nextStatus });
      setOperation((previous) => previous ? { ...previous, ...updated } : updated);
      toast.success(nextStatus === 'PAUSED' ? 'Operação pausada' : 'Operação ativada');
    } catch (error: any) {
      toast.error(`Erro ao alterar status: ${error.message}`);
    } finally {
      setPausing(false);
    }
  };

  const agents = operation?.agents || [];
  const channelRules = operation?.channelRules || [];
  const latestTestReports = useMemo(() => {
    return agents.map((agent) => {
      const version = activeVersion(agent);
      return {
        agent,
        version,
        testResults: (version?.test_results as any) || null,
        score: Number(version?.score || 0)
      };
    });
  }, [agents]);

  if (loading) {
    return (
      <div className="min-h-[600px] bg-[#F5F7FB] -m-3 sm:-m-4 md:-m-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <Bot className="h-12 w-12 text-emerald-600 animate-pulse" />
          <div className="font-bold text-lg">Carregando operação...</div>
        </div>
      </div>
    );
  }

  if (!operation || !metrics) {
    return (
      <div className="min-h-[600px] bg-[#F5F7FB] -m-3 sm:-m-4 md:-m-6 flex items-center justify-center">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 text-amber-500" />
          <div className="font-bold text-slate-950">Operação não encontrada</div>
          <Link to={aiPath('')} className="mt-3 inline-flex text-sm font-bold text-emerald-700">Voltar</Link>
        </div>
      </div>
    );
  }

  const isActive = operation.status === 'PUBLISHED';
  const avgSuccess = metrics.agents.length > 0
    ? Math.round(metrics.agents.reduce((sum, agent) => sum + Number(agent.successRate || 0), 0) / metrics.agents.length)
    : 0;

  return (
    <div className="min-h-full bg-[#F5F7FB] -m-3 sm:-m-4 md:-m-6 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
        <div className="h-16 px-4 lg:px-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={aiPath('')} className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="text-sm font-bold">{operation.name}</div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">{operation.segment}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {operation.status}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-2 hover:bg-slate-50">
              <RefreshCw size={14} /> Atualizar
            </button>
            <button onClick={toggleStatus} disabled={pausing} className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50">
              {pausing ? <Loader2 size={14} className="animate-spin" /> : isActive ? <Pause size={14} /> : <Play size={14} />}
              {isActive ? 'Pausar IA' : 'Ativar IA'}
            </button>
            <Link to={aiPath(`operations/${id}/architecture`)} className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-2 hover:bg-slate-50">
              <GitBranch size={14} /> Arquitetura
            </Link>
          </div>
        </div>
        <div className="px-4 lg:px-7 flex items-center gap-1 overflow-x-auto">
          {tabs.map(([tab, label, icon]) => {
            const Icon = icon;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-3 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${activeTab === tab ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
                <Icon size={14} /> {label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="p-4 lg:p-7 space-y-5">
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Conversas', value: metrics.totals.conversations, icon: MessageSquare, color: 'bg-emerald-50 text-emerald-600' },
                { label: 'Handoffs', value: metrics.totals.handoffs, icon: Hand, color: 'bg-purple-50 text-purple-600' },
                { label: 'Taxa de resolução', value: `${avgSuccess}%`, icon: CheckCircle2, color: 'bg-blue-50 text-blue-600' },
                { label: 'Tempo resposta', value: `${Math.round(Number(metrics.totals.avgLatency || 0) / 1000)}s`, icon: Timer, color: 'bg-cyan-50 text-cyan-600' },
                { label: 'Tokens', value: metrics.totals.totalTokens, icon: Brain, color: 'bg-amber-50 text-amber-600' },
                { label: 'Custo USD', value: `$${Number(metrics.totals.totalCost || 0).toFixed(4)}`, icon: Star, color: 'bg-violet-50 text-violet-600' },
                { label: 'Agentes', value: metrics.totals.agents, icon: Bot, color: 'bg-slate-100 text-slate-700' },
                { label: 'Publicados', value: metrics.totals.published, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' }
              ].map((card) => (
                <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className={`h-9 w-9 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
                    <card.icon size={18} />
                  </div>
                  <div className="text-2xl font-bold text-slate-950">{card.value}</div>
                  <div className="text-[11px] text-slate-500">{card.label}</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-bold text-slate-950 text-sm mb-4">Saúde por agente</h3>
              {metrics.agents.length === 0 && <div className="text-sm text-slate-400">Nenhum agente real criado para esta operação.</div>}
              <div className="space-y-3">
                {metrics.agents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
                    <div>
                      <div className="text-sm font-bold text-slate-800">{agent.name}</div>
                      <div className="text-[11px] text-slate-500">{agent.role} · {agent.health}</div>
                    </div>
                    <div className="text-right text-xs text-slate-600">
                      <div>{agent.conversations} conversas</div>
                      <div>{agent.successRate}% sucesso · {agent.toolCalls} ferramentas</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'agents' && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-950 text-sm">Equipe de IA ({agents.length} agentes)</h3>
                <p className="text-xs text-slate-500 mt-0.5">Agentes persistidos da operação</p>
              </div>
              <Link to={aiPath(`operations/${id}/architecture`)} className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-2 hover:bg-slate-50">
                <Settings size={14} /> Ver arquitetura
              </Link>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-y border-slate-100">
                <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Agente</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Versão ativa</th>
                  <th className="px-5 py-3">Score</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {latestTestReports.map(({ agent, version, score }) => (
                  <tr key={agent.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 text-sm font-bold text-slate-950">{agent.name}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{agent.type}</td>
                    <td className="px-5 py-3 text-xs font-bold">{agent.status}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{String(version?.version || '-')}</td>
                    <td className="px-5 py-3 text-xs font-bold">{score}/100</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={aiPath(`operations/${id}/agents/${agent.id}`)} className="h-8 px-3 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5">
                          <Pencil size={12} /> Editar
                        </Link>
                        <Link to={aiPath(`operations/${id}/agents/${agent.id}?tab=channels`)} className="h-8 px-3 rounded-lg border border-emerald-200 bg-emerald-50 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 flex items-center gap-1.5">
                          <Link2 size={12} /> Canal
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {latestTestReports.map(({ agent, version, testResults, score }) => (
              <div key={agent.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-950 text-sm">{agent.name}</h3>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded ${testResults?.verdict === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {testResults?.verdict || 'SEM TESTE'}
                  </span>
                </div>
                <div className="text-3xl font-bold text-slate-950">{score}/100</div>
                <div className="text-xs text-slate-500 mt-1">Versão {String(version?.version || '-')} · teste persistido</div>
                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div>Suite: {Number(testResults?.suite?.summary?.passed || 0)}/{Number(testResults?.suite?.summary?.total || 0)} aprovados</div>
                  <div>Red team: {Number(testResults?.redTeam?.summary?.vulnerabilities || 0)} vulnerabilidades</div>
                  {(testResults?.score?.reasons || []).map((reason: string) => (
                    <div key={reason} className="rounded-lg bg-red-50 text-red-700 p-2">{reason}</div>
                  ))}
                </div>
              </div>
            ))}
            {latestTestReports.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                Nenhum resultado de teste real encontrado.
              </div>
            )}
          </div>
        )}

        {activeTab === 'channels' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {channelRules.map((rule) => (
              <div key={String(rule.id)} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <MessageCircle className="text-emerald-600" size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-950 text-sm">{String(rule.channel_type || '-')}</h3>
                    <div className="text-[11px] text-slate-500">Instância: {String(rule.instance_id || 'qualquer')}</div>
                  </div>
                </div>
              </div>
            ))}
            {channelRules.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                Nenhum canal real vinculado a esta operação.
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <DataTable
            rows={history}
            empty="Nenhum histórico real encontrado."
            columns={[
              ['Data', (row) => formatDate(row.created_at)],
              ['Ação', (row) => String(row.action || '-')],
              ['Ator', (row) => String(row.actor_type || '-')],
              ['Entidade', (row) => String(row.entity_type || '-')]
            ]}
          />
        )}

        {activeTab === 'logs' && (
          <DataTable
            rows={logs}
            empty="Nenhum log real encontrado."
            columns={[
              ['Data', (row) => formatDate(row.created_at)],
              ['Evento', (row) => String(row.event_type || '-')],
              ['Status', (row) => String(row.status || '-')],
              ['Conversa', (row) => String(row.conversation_id || '-')],
              ['Latência', (row) => `${Number(row.latency_ms || 0)}ms`]
            ]}
          />
        )}

        {activeTab === 'knowledge' && (
          <DataTable
            rows={knowledge}
            empty="Nenhuma fonte real de conhecimento vinculada."
            columns={[
              ['Nome', (row) => String(row.name || row.source_url || row.id)],
              ['Tipo', (row) => String(row.source_type || '-')],
              ['Status', (row) => String(row.status || (row.is_active ? 'ATIVA' : 'INATIVA'))],
              ['Atualizado', (row) => formatDate(row.updated_at || row.created_at)]
            ]}
          />
        )}
      </div>
    </div>
  );
};

function DataTable({
  rows,
  columns,
  empty
}: {
  rows: Array<Record<string, unknown>>;
  columns: Array<[string, (row: Record<string, unknown>) => React.ReactNode]>;
  empty: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {columns.map(([label]) => <th key={label} className="px-5 py-3">{label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((row, index) => (
            <tr key={String(row.id || index)} className="hover:bg-slate-50/60">
              {columns.map(([label, render]) => (
                <td key={label} className="px-5 py-3 text-xs text-slate-600">{render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="py-12 text-center text-sm text-slate-400">{empty}</div>}
    </div>
  );
}

export default AIOperationDashboard;
