import React from 'react';
import { Building, Wrench, Users, Bell, TrendingDown, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const stats = [
  { label: 'Condomínios Gerenciados', value: '12', icon: Building, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Chamados Abertos', value: '7', icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-50' },
  { label: 'Moradores Cadastrados', value: '248', icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
  { label: 'Inadimplentes', value: '3', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
];

const chamados = [
  { id: 1, condominio: 'Residencial das Flores', unidade: 'Apt 201', tipo: 'Elétrica', desc: 'Tomada com cheiro de queimado', status: 'Aberto', prioridade: 'Alta', data: '28/05/2026' },
  { id: 2, condominio: 'Edifício Alfa', unidade: 'Apt 305', tipo: 'Hidráulica', desc: 'Torneira pingando na cozinha', status: 'Em Atendimento', prioridade: 'Média', data: '27/05/2026' },
  { id: 3, condominio: 'Residencial das Flores', unidade: 'Área Comum', tipo: 'Portaria', desc: 'Interfone da entrada com defeito', status: 'Concluído', prioridade: 'Baixa', data: '25/05/2026' },
];

const statusColors: Record<string, string> = {
  'Aberto': 'bg-red-100 text-red-700',
  'Em Atendimento': 'bg-amber-100 text-amber-700',
  'Concluído': 'bg-green-100 text-green-700',
};

const prioridadeColors: Record<string, string> = {
  'Alta': 'bg-red-500',
  'Média': 'bg-amber-400',
  'Baixa': 'bg-green-500',
};

export default function AdmCondominios() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="h1 flex items-center gap-3 text-slate-900">
          <Building className="text-primary" size={32} />
          Administração de Condomínios
        </h1>
        <p className="body mt-1 text-slate-500">Gerencie condomínios, moradores, cobranças e chamados de manutenção.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="card-premium p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon size={24} className={s.color} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card-premium overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-black text-slate-900 text-lg flex items-center gap-2"><Wrench size={20} className="text-primary" /> Chamados de Manutenção</h2>
          <button className="btn btn-primary">+ Novo Chamado</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Prioridade</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Condomínio / Unidade</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest hidden md:table-cell">Descrição</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest hidden lg:table-cell">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chamados.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${prioridadeColors[c.prioridade]}`}></div>
                      <span className="text-xs font-bold text-slate-600">{c.prioridade}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-slate-900 text-sm">{c.condominio}</p>
                    <p className="text-xs text-slate-500">{c.unidade} · {c.tipo}</p>
                  </td>
                  <td className="p-4 hidden md:table-cell text-sm text-slate-600">{c.desc}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusColors[c.status]}`}>{c.status}</span>
                  </td>
                  <td className="p-4 hidden lg:table-cell text-sm text-slate-500">{c.data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
