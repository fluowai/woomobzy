import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, FileText, Plus, Search, Upload, Trash2, Link2,
  Sparkles, Loader2, Database, Globe, Check, AlertTriangle, FolderOpen
} from 'lucide-react';
import { toast } from 'sonner';

const sources = [
  { id: 1, name: 'Tabela de preços 2026.xlsx', type: 'Tabela de preços', status: 'SINCRONIZADO', pages: 24, updated: 'há 2h', color: 'bg-emerald-50 text-emerald-600', size: '1,2 MB' },
  { id: 2, name: 'Política de locação.pdf', type: 'Documento', status: 'SINCRONIZADO', pages: 18, updated: 'há 1 dia', color: 'bg-blue-50 text-blue-600', size: '860 KB' },
  { id: 3, name: 'Manual do corretor.docx', type: 'Documento', status: 'EM PROCESSAMENTO', pages: 32, updated: 'agora', color: 'bg-amber-50 text-amber-600', size: '2,4 MB' },
  { id: 4, name: 'empreendimentos.wootech.com.br', type: 'Site', status: 'SINCRONIZADO', pages: 56, updated: 'há 3 dias', color: 'bg-purple-50 text-purple-600', size: '—' },
  { id: 5, name: 'FAQ vendas.pdf', type: 'Documento', status: 'ERRO', pages: 0, updated: 'há 5 dias', color: 'bg-red-50 text-red-600', size: '140 KB' }
];

const categories = ['Todos', 'Tabela de preços', 'Documento', 'Site', 'FAQ'];

const AIKnowledge: React.FC = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const [loading, setLoading] = useState(false);

  const filtered = sources.filter(s =>
    (category === 'Todos' || s.type === category) &&
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  const addSource = () => {
    toast.info('Upload de fontes de conhecimento (em breve)');
  };

  const sync = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    toast.success('Conhecimento sincronizado!');
  };

  const stats = [
    { label: 'Fontes', value: sources.length, icon: FolderOpen, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Fragmentos', value: '2.847', icon: FileText, color: 'bg-blue-50 text-blue-600' },
    { label: 'Tokens', value: '1,8M', icon: Database, color: 'bg-purple-50 text-purple-600' },
    { label: 'Consultas', value: '1.240', icon: Search, color: 'bg-amber-50 text-amber-600' }
  ];

  return (
    <div className="min-h-full bg-[#F5F7FB] -m-3 sm:-m-4 md:-m-6 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
        <div className="h-16 px-4 lg:px-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/ai" className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="text-sm font-bold">Conhecimento da IA</div>
              <div className="text-[11px] text-slate-500">Fontes de dados que alimentam seus agentes</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={sync} disabled={loading} className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Sincronizar
            </button>
            <button onClick={addSource} className="h-9 px-4 rounded-lg bg-slate-950 text-white text-xs font-bold flex items-center gap-2 hover:bg-slate-800">
              <Plus size={14} /> Adicionar fonte
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 lg:p-7 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className={`h-9 w-9 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
                <s.icon size={18} />
              </div>
              <div className="text-2xl font-bold text-slate-950">{s.value}</div>
              <div className="text-[11px] text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 min-w-60 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={e => setQuery(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="Buscar fontes..." />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto">
              {categories.map(c => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`px-3 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${category === c ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-y border-slate-100">
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Fonte</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Fragmentos</th>
                <th className="px-5 py-3">Atualizado</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg ${s.color} flex items-center justify-center shrink-0`}>
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-950 truncate">{s.name}</div>
                        <div className="text-[11px] text-slate-400">{s.size}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">{s.type}</td>
                  <td className="px-5 py-3 text-sm font-bold text-slate-700">{s.pages}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{s.updated}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${s.status === 'SINCRONIZADO' ? 'bg-emerald-50 text-emerald-700' : s.status === 'ERRO' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                      {s.status === 'ERRO' && <AlertTriangle size={10} className="inline mr-1" />}
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50"><Link2 size={13} /></button>
                      <button className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-400">Nenhuma fonte encontrada</div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <BookOpen className="text-emerald-600" size={18} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-slate-950">Como funciona</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Os agentes consultam seu conhecimento para responder com precisão sobre preços, disponibilidade e políticas.
              Fontes são sincronizadas automaticamente e indexadas em fragmentos pesquisáveis. Nunca inventamos dados:
              se a informação não estiver aqui, o agente não inventa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIKnowledge;