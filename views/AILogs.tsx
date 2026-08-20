import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Search, FileText, Bot, Brain, Download, Filter, RefreshCw,
  AlertTriangle, CheckCircle2, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const logs = [
  { id: 1, time: '19/08 21:32:04', agent: 'Orquestrador', event: 'mensagem_recebida', detail: 'Lead Maria Souza · WhatsApp', status: 'SUCCESS', latency: '180ms' },
  { id: 2, time: '19/08 21:32:05', agent: 'Orquestrador', event: 'intent.classify', detail: 'Intenção: COMPRA_IMOVEL', status: 'SUCCESS', latency: '420ms' },
  { id: 3, time: '19/08 21:32:06', agent: 'Orquestrador', event: 'conversation.transfer', detail: 'Direcionado para SDR Vendas', status: 'SUCCESS', latency: '95ms' },
  { id: 4, time: '19/08 21:32:08', agent: 'SDR Vendas', event: 'tool_executed', detail: 'properties.search (6 imóveis)', status: 'SUCCESS', latency: '310ms' },
  { id: 5, time: '19/08 21:32:10', agent: 'SDR Vendas', event: 'llm_call', detail: 'gemini-1.5-pro · 1.240 tokens', status: 'SUCCESS', latency: '1.2s' },
  { id: 6, time: '19/08 21:33:12', agent: 'SDR Vendas', event: 'mensagem_enviada', detail: 'Recomendação: Apartamento Jardim Paulista', status: 'SUCCESS', latency: '45ms' },
  { id: 7, time: '19/08 21:35:20', agent: 'SDR Vendas', event: 'slot.captured', detail: 'Quartos: 2 · Vaga: Sim', status: 'INFO', latency: '12ms' },
  { id: 8, time: '19/08 21:36:00', agent: 'Agenda e Handoff', event: 'calendar.create', detail: 'Visita Sáb 10h · Apartamento Jardim Paulista', status: 'SUCCESS', latency: '280ms' },
  { id: 9, time: '19/08 21:36:01', agent: 'Agenda e Handoff', event: 'crm.leads.update', detail: 'Lead → VISITA_AGENDADA', status: 'SUCCESS', latency: '150ms' },
  { id: 10, time: '19/08 21:38:45', agent: 'Guard', event: 'anti_repetition', detail: 'Pergunta duplicada bloqueada · slot já preenchido', status: 'BLOCKED', latency: '8ms' }
];

const eventTypes = ['Todos', 'SUCCESS', 'INFO', 'BLOCKED'];

const AILogs: React.FC = () => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Todos');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = logs.filter(l =>
    (status === 'Todos' || l.status === status) &&
    (l.agent + l.event + l.detail).toLowerCase().includes(query.toLowerCase())
  );

  const refresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 900));
    setRefreshing(false);
    toast.success('Logs atualizados');
  };

  const exportLogs = () => {
    toast.success('Exportando logs (CSV)');
  };

  const statusColor: Record<string, string> = {
    SUCCESS: 'bg-emerald-50 text-emerald-700',
    INFO: 'bg-blue-50 text-blue-700',
    BLOCKED: 'bg-red-50 text-red-600'
  };

  return (
    <div className="min-h-full bg-[#F5F7FB] -m-3 sm:-m-4 md:-m-6 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
        <div className="h-16 px-4 lg:px-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/ai" className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="text-sm font-bold">Logs do sistema</div>
              <div className="text-[11px] text-slate-500">Rastreie cada interação, execução e decisão da IA</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} disabled={refreshing} className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50">
              {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Atualizar
            </button>
            <button onClick={exportLogs} className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-2 hover:bg-slate-50">
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
              <input value={query} onChange={e => setQuery(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="Buscar logs..." />
            </div>
            <div className="flex items-center gap-2">
              <select className="h-10 rounded-lg border border-slate-200 text-xs font-bold px-3">
                <option>Todos os agentes</option>
              </select>
              <div className="flex items-center gap-1">
                {eventTypes.map(t => (
                  <button key={t} onClick={() => setStatus(t)}
                    className={`px-3 py-2 rounded-lg text-[11px] font-bold transition ${status === t ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Agente</th>
                <th className="px-5 py-3">Evento</th>
                <th className="px-5 py-3">Detalhe</th>
                <th className="px-5 py-3">Latência</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(l => (
                <tr key={l.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">{l.time}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {l.agent === 'Guard' ? <AlertTriangle size={13} className="text-red-500" /> : l.agent === 'Orquestrador' ? <Brain size={13} className="text-slate-700" /> : <Bot size={13} className="text-emerald-600" />}
                      <span className="text-sm font-bold text-slate-700 whitespace-nowrap">{l.agent}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3"><span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 whitespace-nowrap">{l.event}</span></td>
                  <td className="px-5 py-3 text-xs text-slate-500">{l.detail}</td>
                  <td className="px-5 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">{l.latency}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap ${statusColor[l.status]}`}>
                      {l.status === 'SUCCESS' ? <CheckCircle2 size={10} className="inline mr-1" /> : l.status === 'INFO' ? <FileText size={10} className="inline mr-1" /> : <AlertTriangle size={10} className="inline mr-1" />}
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="py-12 text-center text-sm text-slate-400">Nenhum log encontrado</div>}
        </div>
      </div>
    </div>
  );
};

export default AILogs;