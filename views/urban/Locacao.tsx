import React, { useState, useEffect } from 'react';
import { Key, DollarSign, AlertTriangle, FileText, Plus, Trash2, X, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

interface Contract {
  id: string;
  tenant_name: string;
  tenant_email: string;
  tenant_phone: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  adjustment_index: string;
  payment_status: string;
  status: string;
}

const paymentLabels: Record<string, { label: string; color: string; bg: string }> = {
  em_dia: { label: 'Em Dia', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  atrasado: { label: 'Atrasado', color: 'text-amber-700', bg: 'bg-amber-100' },
  inadimplente: { label: 'Inadimplente', color: 'text-red-700', bg: 'bg-red-100' },
};

const Locacao: React.FC = () => {
  const { profile } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    tenant_name: '', tenant_email: '', tenant_phone: '',
    start_date: '', end_date: '', monthly_rent: 0,
    adjustment_index: 'IGPM', payment_status: 'em_dia'
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from('rental_contracts').select('*').order('created_at', { ascending: false });
    setContracts(data || []);
  };

  const handleSave = async () => {
    if (!form.tenant_name) return;
    await supabase.from('rental_contracts').insert({
      ...form,
      organization_id: profile?.organization_id,
      status: 'active',
    });
    setShowModal(false);
    setForm({ tenant_name: '', tenant_email: '', tenant_phone: '', start_date: '', end_date: '', monthly_rent: 0, adjustment_index: 'IGPM', payment_status: 'em_dia' });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este contrato?')) return;
    await supabase.from('rental_contracts').delete().eq('id', id);
    load();
  };

  const totalRent = contracts.filter(c => c.status === 'active').reduce((a, c) => a + (c.monthly_rent || 0), 0);
  const inadimplentes = contracts.filter(c => c.payment_status === 'inadimplente').length;
  const atrasados = contracts.filter(c => c.payment_status === 'atrasado').length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter flex items-center gap-3">
            <Key className="text-blue-600" size={32} />
            Locação & Administração
          </h1>
          <p className="text-black/60 font-medium">Contratos ativos, reajustes automáticos, inadimplência e boletos.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-500 transition-all shadow-lg">
          <Plus size={18} /> Novo Contrato
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { icon: Key, label: 'Contratos Ativos', value: String(contracts.filter(c => c.status === 'active').length), color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: DollarSign, label: 'Receita Mensal', value: `R$ ${totalRent.toLocaleString('pt-BR')}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: AlertTriangle, label: 'Inadimplentes', value: String(inadimplentes), color: 'text-red-600', bg: 'bg-red-50' },
          { icon: Calendar, label: 'Reajustes Pendentes', value: String(atrasados), color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} w-fit mb-4`}><stat.icon size={24} /></div>
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{stat.label}</h3>
            <p className="text-3xl font-black text-slate-900 italic tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Locatário</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Período</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aluguel</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Índice</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pagamento</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody>
              {contracts.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">
                  <Key className="mx-auto mb-3 text-slate-300" size={40} />
                  <p className="font-medium">Nenhum contrato de locação</p>
                </td></tr>
              ) : contracts.map(c => {
                const pay = paymentLabels[c.payment_status] || paymentLabels.em_dia;
                return (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-all">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-black">{c.tenant_name}</p>
                      <p className="text-xs text-slate-400">{c.tenant_email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {c.start_date ? new Date(c.start_date).toLocaleDateString('pt-BR') : '—'} → {c.end_date ? new Date(c.end_date).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-600">R$ {c.monthly_rent?.toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{c.adjustment_index}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${pay.bg} ${pay.color}`}>{pay.label}</span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-black">Novo Contrato de Locação</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nome do Locatário</label>
                <input value={form.tenant_name} onChange={e => setForm(f => ({...f, tenant_name: e.target.value}))} className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/30" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email</label>
                  <input value={form.tenant_email} onChange={e => setForm(f => ({...f, tenant_email: e.target.value}))} className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Telefone</label>
                  <input value={form.tenant_phone} onChange={e => setForm(f => ({...f, tenant_phone: e.target.value}))} className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Início</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Término</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Aluguel (R$)</label>
                  <input type="number" value={form.monthly_rent} onChange={e => setForm(f => ({...f, monthly_rent: Number(e.target.value)}))} className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Índice de Reajuste</label>
                  <select value={form.adjustment_index} onChange={e => setForm(f => ({...f, adjustment_index: e.target.value}))} className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none">
                    <option value="IGPM">IGPM</option>
                    <option value="IPCA">IPCA</option>
                    <option value="INPC">INPC</option>
                  </select>
                </div>
              </div>
            </div>
            <button onClick={handleSave} className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-500 transition-all shadow-lg">
              Salvar Contrato
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Locacao;
