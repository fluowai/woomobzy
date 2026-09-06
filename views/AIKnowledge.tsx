import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, BookOpen, Database, FileText, FolderOpen, Loader2, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAIPath } from '@/src/hooks/usePanelBase';
import { getOperationKnowledge, listOperations } from '@/services/aiWorkforce';

const categories = ['Todos', 'DOCUMENT', 'URL', 'DATABASE', 'FAQ', 'CUSTOM'];

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

const AIKnowledge: React.FC = () => {
  const aiPath = useAIPath();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const [sources, setSources] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  const loadSources = async () => {
    setLoading(true);
    try {
      const operations = await listOperations();
      const batches: Array<Array<Record<string, unknown>>> = await Promise.all(
        operations.map(async (operation) => {
          const rows = await getOperationKnowledge(operation.id);
          return rows.map((row) => ({ ...row, operationName: operation.name }));
        })
      );
      const byId = new Map<string, Record<string, unknown>>();
      for (const source of batches.flat()) {
        byId.set(String(source.id), source);
      }
      setSources([...byId.values()].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))));
    } catch (error: any) {
      toast.error(`Erro ao carregar conhecimento: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return sources.filter((source) => {
      const categoryMatches = category === 'Todos' || source.source_type === category;
      const queryMatches = !q || JSON.stringify(source).toLowerCase().includes(q);
      return categoryMatches && queryMatches;
    });
  }, [sources, category, query]);

  const stats = [
    { label: 'Fontes', value: sources.length, icon: FolderOpen, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Ativas', value: sources.filter((source) => source.is_active).length, icon: FileText, color: 'bg-blue-50 text-blue-600' },
    { label: 'Operações', value: new Set(sources.map((source) => source.operationName).filter(Boolean)).size, icon: Database, color: 'bg-purple-50 text-purple-600' },
    { label: 'Com erro', value: sources.filter((source) => String(source.status || '').toLowerCase() === 'error').length, icon: AlertTriangle, color: 'bg-red-50 text-red-600' }
  ];

  return (
    <div className="min-h-full bg-[#F5F7FB] -m-3 sm:-m-4 md:-m-6 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
        <div className="h-16 px-4 lg:px-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={aiPath('')} className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="text-sm font-bold">Conhecimento da IA</div>
              <div className="text-[11px] text-slate-500">Fontes persistidas usadas pelos agentes</div>
            </div>
          </div>
          <button onClick={loadSources} disabled={loading} className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Atualizar
          </button>
        </div>
      </header>

      <div className="p-4 lg:p-7 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className={`h-9 w-9 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon size={18} />
              </div>
              <div className="text-2xl font-bold text-slate-950">{stat.value}</div>
              <div className="text-[11px] text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 min-w-60 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full h-10 rounded-lg border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="Buscar fontes reais..."
              />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto">
              {categories.map((type) => (
                <button
                  key={type}
                  onClick={() => setCategory(type)}
                  className={`px-3 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${category === type ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-y border-slate-100">
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Fonte</th>
                <th className="px-5 py-3">Operação</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Atualizado</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((source) => (
                <tr key={String(source.id)} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-950 truncate">{String(source.name || source.source_url || source.id)}</div>
                        <div className="text-[11px] text-slate-400 truncate">{String(source.description || source.source_url || '')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">{String(source.operationName || 'Global')}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{String(source.source_type || '-')}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{formatDate(source.updated_at || source.created_at)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${source.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {String(source.status || (source.is_active ? 'ATIVA' : 'INATIVA'))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-400">Nenhuma fonte real de conhecimento encontrada.</div>
          )}
          {loading && <div className="py-12 text-center text-sm text-slate-400">Carregando conhecimento...</div>}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <BookOpen className="text-emerald-600" size={18} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-slate-950">Fontes sem dado inventado</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Esta tela mostra apenas fontes persistidas. Quando a base do tenant está vazia, o sistema exibe estado vazio e os agentes devem responder sem inventar preço, disponibilidade ou regra comercial.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIKnowledge;
