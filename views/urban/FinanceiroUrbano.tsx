import React, { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, CheckCircle, BarChart2, CreditCard, Send } from 'lucide-react';

const resumo = [
  { label: 'A Receber (Mês)', value: 'R$ 48.500', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', detalhe: '32 contratos ativos' },
  { label: 'A Pagar (Mês)', value: 'R$ 12.200', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50', detalhe: 'Repasses e despesas' },
  { label: 'Inadimplência', value: 'R$ 3.800', icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', detalhe: '4 contratos em atraso' },
  { label: 'Saldo Líquido', value: 'R$ 36.300', icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10', detalhe: 'Resultado do mês' },
];

const cobrancas = [
  { id: '1', inquilino: 'João Pedro Silva', imovel: 'Apt 301 - Ed. Aurora', vencimento: '05/06/2026', valor: 'R$ 1.800', status: 'Pendente' },
  { id: '2', inquilino: 'Maria Fernanda Costa', imovel: 'Casa Rua das Flores, 12', vencimento: '01/06/2026', valor: 'R$ 2.200', status: 'Pago' },
  { id: '3', inquilino: 'Roberto Alves', imovel: 'Sala 504 - Ed. Business', vencimento: '28/05/2026', valor: 'R$ 3.500', status: 'Atrasado' },
  { id: '4', inquilino: 'Carla Mendes', imovel: 'Apt 102 - Res. Jardins', vencimento: '10/06/2026', valor: 'R$ 1.500', status: 'Pendente' },
];

const statusColors: Record<string, string> = {
  'Pago': 'bg-green-100 text-green-700',
  'Pendente': 'bg-blue-100 text-blue-700',
  'Atrasado': 'bg-red-100 text-red-700',
};

export default function FinanceiroUrbano() {
  const [tab, setTab] = useState<'cobranca' | 'fluxo' | 'dre'>('cobranca');

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="h1 flex items-center gap-3 text-slate-900">
          <DollarSign className="text-primary" size={32} />
          Financeiro &amp; ERP
        </h1>
        <p className="body mt-1 text-slate-500">Cobrança, fluxo de caixa, repasses e gestão de inadimplência.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {resumo.map(s => (
          <div key={s.label} className="card-premium p-5">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon size={20} className={s.color} />
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-bold text-slate-700 mt-1">{s.label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{s.detalhe}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: 'cobranca', label: 'Cobranças / Boletos', icon: CreditCard },
          { id: 'fluxo', label: 'Fluxo de Caixa', icon: BarChart2 },
          { id: 'dre', label: 'DRE', icon: TrendingUp },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'cobranca' && (
        <div className="card-premium overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-black text-slate-900">Cobranças do Mês</h2>
            <div className="flex gap-2">
              <button className="btn bg-slate-100 text-slate-700 text-sm"><Send size={15} /> Enviar Boletos</button>
              <button className="btn btn-primary text-sm">+ Gerar Cobrança</button>
            </div>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Inquilino', 'Imóvel', 'Vencimento', 'Valor', 'Status', 'Ação'].map(h => (
                  <th key={h} className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cobrancas.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-bold text-slate-900 text-sm">{c.inquilino}</td>
                  <td className="p-4 text-sm text-slate-600">{c.imovel}</td>
                  <td className="p-4 text-sm text-slate-600">{c.vencimento}</td>
                  <td className="p-4 font-bold text-slate-900">{c.valor}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusColors[c.status]}`}>{c.status}</span>
                  </td>
                  <td className="p-4">
                    {c.status === 'Pago'
                      ? <span className="flex items-center gap-1 text-xs text-green-600 font-bold"><CheckCircle size={14} /> Quitado</span>
                      : <button className="text-xs font-bold text-primary hover:underline">Ver Boleto</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(tab === 'fluxo' || tab === 'dre') && (
        <div className="card-premium p-16 text-center">
          <BarChart2 size={48} className="text-slate-200 mx-auto mb-4" />
          <h3 className="text-xl font-black text-slate-400">{tab === 'fluxo' ? 'Fluxo de Caixa' : 'DRE — Demonstrativo de Resultados'}</h3>
          <p className="text-slate-400 mt-2 text-sm">Em desenvolvimento. Integração com gateway financeiro necessária para ativar.</p>
        </div>
      )}
    </div>
  );
}
