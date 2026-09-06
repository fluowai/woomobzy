import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bot, GitBranch, Loader2, RefreshCw, Search, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAIPath } from '@/src/hooks/usePanelBase';
import { getOperationHistory, listOperations } from '@/services/aiWorkforce';

const types = ['Todos', 'create', 'update', 'architect', 'publish', 'test_run'];

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

const AIHistory: React.FC = () => {
  const aiPath = useAIPath();
  const [filter, setFilter] = useState('Todos');
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const operations = await listOperations();
      const batches: Array<Array<Record<string, unknown>>> = await Promise.all(
        operations.map(async (operation) => {
          const rows = await getOperationHistory(operation.id, 100);
          return rows.map((row) => ({ ...row, operationName: operation.name }));
        })
      );
      setHistory(batches.flat().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))));
    } catch (error: any) {
      toast.error(`Erro ao carregar histórico: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return history.filter((entry) => {
      const actionMatches = filter === 'Todos' || entry.action === filter;
      const queryMatches = !q || JSON.stringify(entry).toLowerCase().includes(q);
      return actionMatches && queryMatches;
    });
  }, [history, filter, query]);

  return (
    <div className="min-h-full bg-[#F5F7FB] -m-3 sm:-m-4 md:-m-6 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
        <div className="h-16 px-4 lg:px-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={aiPath('')} className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="text-sm font-bold">Histórico de atividades</div>
              <div className="text-[11px] text-slate-500">Mudanças reais auditadas nas operações de IA</div>
            </div>
          </div>
          <button onClick={loadHistory} disabled={loading} className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Atualizar
          </button>
        </div>
      </header>

      <div className="p-4 lg:p-7">
        <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap border-b border-slate-100">
            <div className="relative flex-1 min-w-60 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full h-10 rounded-lg border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="Buscar no histórico real..."
              />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto">
              {types.map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-3 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${filter === type ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div className="p-5">
            {filtered.map((entry) => (
              <div key={String(entry.id)} className="flex gap-4 pb-5 relative last:pb-0">
                <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 relative z-10">
                  {entry.actor_type === 'AI' ? <Bot size={16} /> : entry.actor_type === 'USER' ? <Shield size={16} /> : <GitBranch size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-950">{String(entry.action || 'evento')}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">{formatDate(entry.created_at)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {String(entry.operationName || 'Operação')} · {String(entry.entity_type || '-')}
                  </p>
                  <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    {String(entry.actor_type || 'SYSTEM')}
                  </span>
                </div>
              </div>
            ))}
            {!loading && filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-slate-400">
                Nenhum evento real auditado para as operações do tenant.
              </div>
            )}
            {loading && <div className="py-12 text-center text-sm text-slate-400">Carregando histórico...</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIHistory;
