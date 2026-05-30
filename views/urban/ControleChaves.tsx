import React, { useState } from 'react';
import { Key, Search, Plus, ArrowUpRight, ArrowDownLeft, Clock, User, Home } from 'lucide-react';

const chaves = [
  { id: '1', imovel: 'Apt 301 - Ed. Aurora', codigo: 'CH-001', status: 'Disponível', localizacao: 'Painel Principal', responsavel: null, retirada: null, devolucaoPrevista: null },
  { id: '2', imovel: 'Casa Rua das Palmeiras, 45', codigo: 'CH-002', status: 'Retirada', localizacao: null, responsavel: 'Carlos Melo (Corretor)', retirada: '29/05/2026 09:30', devolucaoPrevista: '29/05/2026 17:00' },
  { id: '3', imovel: 'Sala Comercial - Ed. Business', codigo: 'CH-003', status: 'Atrasada', localizacao: null, responsavel: 'Ana Paula (Cliente)', retirada: '27/05/2026 14:00', devolucaoPrevista: '28/05/2026 12:00' },
  { id: '4', imovel: 'Galpão Industrial, Lote 7', codigo: 'CH-004', status: 'Disponível', localizacao: 'Recepção', responsavel: null, retirada: null, devolucaoPrevista: null },
];

const statusConfig: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  'Disponível': { color: 'text-green-700', bg: 'bg-green-100', icon: Home },
  'Retirada': { color: 'text-blue-700', bg: 'bg-blue-100', icon: ArrowUpRight },
  'Atrasada': { color: 'text-red-700', bg: 'bg-red-100', icon: Clock },
};

export default function ControleChaves() {
  const [search, setSearch] = useState('');

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="h1 flex items-center gap-3 text-slate-900">
            <Key className="text-primary" size={32} />
            Controle de Chaves
          </h1>
          <p className="body mt-1 text-slate-500">Gerencie a localização e o histórico de todas as chaves dos imóveis.</p>
        </div>
        <button className="btn btn-primary shadow-lg shadow-primary/25">
          <Plus size={20} /> Registrar Chave
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Disponíveis', value: chaves.filter(c => c.status === 'Disponível').length, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Retiradas', value: chaves.filter(c => c.status === 'Retirada').length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Atrasadas', value: chaves.filter(c => c.status === 'Atrasada').length, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className="card-premium p-5 text-center">
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card-premium overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="relative max-w-sm group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary" size={18} />
            <input
              type="text"
              placeholder="Buscar por imóvel ou código..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-11 bg-slate-50"
            />
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {chaves.map(c => {
            const cfg = statusConfig[c.status];
            const Icon = cfg.icon;
            return (
              <div key={c.id} className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${cfg.bg} flex items-center justify-center`}>
                    <Icon size={22} className={cfg.color} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{c.imovel}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{c.codigo}</p>
                  </div>
                </div>
                <div className="flex flex-col md:items-end gap-1.5">
                  <span className={`self-start md:self-auto px-3 py-1 rounded-full text-[10px] font-bold uppercase ${cfg.bg} ${cfg.color}`}>{c.status}</span>
                  {c.responsavel && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <User size={12} /> {c.responsavel}
                    </div>
                  )}
                  {c.localizacao && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Home size={12} /> {c.localizacao}
                    </div>
                  )}
                  {c.devolucaoPrevista && (
                    <div className={`flex items-center gap-1.5 text-xs font-bold ${c.status === 'Atrasada' ? 'text-red-600' : 'text-slate-500'}`}>
                      <Clock size={12} /> Dev. prevista: {c.devolucaoPrevista}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {c.status !== 'Disponível' && (
                    <button className="btn bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 text-xs px-3 h-9">
                      <ArrowDownLeft size={14} /> Devolver
                    </button>
                  )}
                  {c.status === 'Disponível' && (
                    <button className="btn bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs px-3 h-9">
                      <ArrowUpRight size={14} /> Retirar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
