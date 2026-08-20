import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Bot, Brain, Rocket, RefreshCw, Zap, GitBranch, Pause, CheckCircle2,
  MessageSquare, Search, Shield
} from 'lucide-react';

const events = [
  { icon: Rocket, color: 'bg-emerald-50 text-emerald-600', title: 'Operação publicada', desc: 'Operação Comercial Urbana publicada em 3 canais', agent: 'WooTech IA', time: 'há 3 semanas' },
  { icon: RefreshCw, color: 'bg-blue-50 text-blue-600', title: 'Agente atualizado', desc: 'Especialista de Imóveis → v3 (prompt aprimorado)', agent: 'Especialista de Imóveis', time: 'há 2 semanas' },
  { icon: Zap, color: 'bg-amber-50 text-amber-600', title: 'Otimização aplicada', desc: 'Fluxo de agendamento otimizado (+18% conversão)', agent: 'WooTech IA', time: 'há 1 semana' },
  { icon: GitBranch, color: 'bg-purple-50 text-purple-600', title: 'Canal conectado', desc: 'Instagram @empresa conectado', agent: 'Admin', time: 'há 5 dias' },
  { icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600', title: 'Testes aprovados', desc: '48/48 testes aprovados · score 97/100', agent: 'WooTech IA', time: 'há 3 dias' },
  { icon: Pause, color: 'bg-red-50 text-red-500', title: 'IA pausada por humano', desc: 'Operação pausada às 14h, retomada às 15h30', agent: 'Admin', time: 'há 2 dias' },
  { icon: MessageSquare, color: 'bg-blue-50 text-blue-600', title: 'Nova conversa', desc: 'Lead Maria Souza iniciou conversa (WhatsApp)', agent: 'SDR Vendas', time: 'há 2 dias' },
  { icon: GitBranch, color: 'bg-purple-50 text-purple-600', title: 'Handoff para humano', desc: 'Solicitou falar com corretor · resumo registrado', agent: 'SDR Vendas', time: 'ontem' }
];

const types = ['Todos', 'Publicação', 'Atualização', 'Otimização', 'Canal', 'Testes', 'Handoff'];

const AIHistory: React.FC = () => {
  const [filter, setFilter] = useState('Todos');
  const [query, setQuery] = useState('');

  const filtered = events.filter(e =>
    (filter === 'Todos' || e.title.includes(filter)) &&
    (e.title + e.desc + e.agent).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-full bg-[#F5F7FB] -m-3 sm:-m-4 md:-m-6 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
        <div className="h-16 px-4 lg:px-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/ai" className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="text-sm font-bold">Histórico de atividades</div>
              <div className="text-[11px] text-slate-500">Todas as mudanças e eventos da sua equipe de IA</div>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 lg:p-7">
        <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap border-b border-slate-100">
            <div className="relative flex-1 min-w-60 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={e => setQuery(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="Buscar no histórico..." />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto">
              {types.map(t => (
                <button key={t} onClick={() => setFilter(t)}
                  className={`px-3 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${filter === t ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="p-5">
            {filtered.map((e, i) => (
              <div key={i} className="flex gap-4 pb-5 relative last:pb-0">
                {i < filtered.length - 1 && <div className="absolute left-[18px] top-11 bottom-0 w-px bg-slate-200" />}
                <div className={`h-9 w-9 rounded-lg ${e.color} flex items-center justify-center shrink-0 relative z-10`}>
                  <e.icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-950">{e.title}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">{e.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{e.desc}</p>
                  <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    {e.agent === 'WooTech IA' ? <Brain size={10} /> : e.agent === 'Admin' ? <Shield size={10} /> : <Bot size={10} />}
                    {e.agent}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIHistory;