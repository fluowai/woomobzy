import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Bot, Download, Loader2, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAIPath } from '@/src/hooks/usePanelBase';
import { getOperationLogs, listOperations } from '@/services/aiWorkforce';

const eventTypes = ['Todos', 'success', 'failed', 'blocked'];

function formatDate(value: unknown) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(String(value)));
}

const AILogs: React.FC = () => {
  const aiPath = useAIPath();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Todos');
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const operations = await listOperations();
      const batches: Array<Array<Record<string, unknown>>> = await Promise.all(
        operations.map(async (operation) => {
          const rows = await getOperationLogs(operation.id, {
            status: status === 'Todos' ? undefined : status,
            q: query || undefined,
            limit: 100
          });
          return rows.map((row) => ({ ...row, operationName: operation.name }));
        })
      );
      setLogs(batches.flat().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))));
    } catch (error: any) {
      toast.error(`Erro ao carregar logs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [status]);

  const filtered = useMemo(() => {
    if (!query) return logs;
    const q = query.toLowerCase();
    return logs.filter((log) => JSON.stringify(log).toLowerCase().includes(q));
  }, [logs, query]);

  const exportLogs = () => {
    const csv = [
      'created_at,operation,event_type,status,latency_ms,conversation_id',
      ...filtered.map((log) => [
        log.created_at,
        log.operationName,
        log.event_type,
        log.status,
        log.latency_ms,
        log.conversation_id
      ].map((value) => JSON.stringify(value ?? '')).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ai-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-full bg-[#F5F7FB] -m-3 sm:-m-4 md:-m-6 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
        <div className="h-16 px-4 lg:px-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={aiPath('')} className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="text-sm font-bold">Logs do sistema</div>
              <div className="text-[11px] text-slate-500">Eventos reais gravados pelos agentes de IA</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadLogs} disabled={loading} className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Atualizar
            </button>
            <button onClick={exportLogs} disabled={filtered.length === 0} className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50">
              <Download size={14} /> Exportar
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 lg:p-7">
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap border-b border-slate-100">
            <div className="relative flex-1 min-w-60 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && loadLogs()}
                className="w-full h-10 rounded-lg border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="Buscar logs reais..."
              />
            </div>
            <div className="flex items-center gap-1">
              {eventTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setStatus(type)}
                  className={`px-3 py-2 rounded-lg text-[11px] font-bold transition ${status === type ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Operação</th>
                <th className="px-5 py-3">Evento</th>
                <th className="px-5 py-3">Conversa</th>
                <th className="px-5 py-3">Latência</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((log) => (
                <tr key={String(log.id)} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">{formatDate(log.created_at)}</td>
                  <td className="px-5 py-3 text-sm font-bold text-slate-700">{String(log.operationName || '-')}</td>
                  <td className="px-5 py-3"><span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 whitespace-nowrap">{String(log.event_type || '-')}</span></td>
                  <td className="px-5 py-3 text-xs text-slate-500">{String(log.conversation_id || '-')}</td>
                  <td className="px-5 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">{Number(log.latency_ms || 0)}ms</td>
                  <td className="px-5 py-3 text-xs font-bold">{String(log.status || '-')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
              <AlertTriangle size={18} />
              Nenhum log real encontrado para as operações do tenant.
            </div>
          )}
          {loading && (
            <div className="py-12 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
              <Bot size={18} className="animate-pulse" />
              Carregando logs...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AILogs;
