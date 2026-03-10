import React, { useState, useEffect } from 'react';
import { Building2, Layers, BarChart3, Hammer, Plus, Eye, Pencil, Trash2, X } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

interface Development {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  total_units: number;
  available_units: number;
  status: string;
  progress_pct: number;
}

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  em_obras: { label: 'Em Obras', color: 'text-amber-700', bg: 'bg-amber-100' },
  lancamento: { label: 'Lançamento', color: 'text-blue-700', bg: 'bg-blue-100' },
  pronto: { label: 'Pronto', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  esgotado: { label: 'Esgotado', color: 'text-red-700', bg: 'bg-red-100' },
};

const Empreendimentos: React.FC = () => {
  const { profile } = useAuth();
  const [developments, setDevelopments] = useState<Development[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', city: '', state: '', total_units: 0, status: 'lancamento', progress_pct: 0 });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from('developments').select('*').order('created_at', { ascending: false });
    setDevelopments(data || []);
  };

  const handleSave = async () => {
    if (!form.name) return;
    await supabase.from('developments').insert({
      ...form,
      organization_id: profile?.organization_id,
      available_units: form.total_units,
    });
    setShowModal(false);
    setForm({ name: '', address: '', city: '', state: '', total_units: 0, status: 'lancamento', progress_pct: 0 });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este empreendimento?')) return;
    await supabase.from('developments').delete().eq('id', id);
    load();
  };

  const totalUnits = developments.reduce((a, d) => a + d.total_units, 0);
  const availableUnits = developments.reduce((a, d) => a + d.available_units, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter flex items-center gap-3">
            <Building2 className="text-blue-600" size={32} />
            Empreendimentos
          </h1>
          <p className="text-black/60 font-medium">Cadastro de lançamentos, unidades e controle de estoque.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-500 transition-all shadow-lg">
          <Plus size={18} /> Novo Empreendimento
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { icon: Building2, label: 'Empreendimentos', value: String(developments.length), color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: Layers, label: 'Unidades Totais', value: String(totalUnits), color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { icon: BarChart3, label: 'Disponíveis', value: String(availableUnits), color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: Hammer, label: 'Em Obra', value: String(developments.filter(d => d.status === 'em_obras').length), color: 'text-amber-600', bg: 'bg-amber-50' },
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
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Empreendimento</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Local</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidades</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Obra</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody>
              {developments.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">
                  <Building2 className="mx-auto mb-3 text-slate-300" size={40} />
                  <p className="font-medium">Nenhum empreendimento cadastrado</p>
                </td></tr>
              ) : developments.map(dev => {
                const st = statusLabels[dev.status] || statusLabels.lancamento;
                return (
                  <tr key={dev.id} className="border-b border-slate-100 hover:bg-slate-50 transition-all">
                    <td className="px-6 py-4 text-sm font-bold text-black">{dev.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{dev.city}/{dev.state}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="font-bold text-emerald-600">{dev.available_units}</span>
                      <span className="text-slate-400">/{dev.total_units}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${dev.progress_pct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-500">{dev.progress_pct}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${st.bg} ${st.color}`}>{st.label}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"><Eye size={16} /></button>
                        <button onClick={() => handleDelete(dev.id)} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all"><Trash2 size={16} /></button>
                      </div>
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
              <h3 className="text-xl font-bold text-black">Novo Empreendimento</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nome</label>
                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="Residencial Vida Nova" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cidade</label>
                  <input value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">UF</label>
                  <input value={form.state} onChange={e => setForm(f => ({...f, state: e.target.value}))} className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none" maxLength={2} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Endereço</label>
                <input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Unidades</label>
                  <input type="number" value={form.total_units} onChange={e => setForm(f => ({...f, total_units: Number(e.target.value)}))} className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Obra (%)</label>
                  <input type="number" min={0} max={100} value={form.progress_pct} onChange={e => setForm(f => ({...f, progress_pct: Number(e.target.value)}))} className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none">
                    <option value="lancamento">Lançamento</option>
                    <option value="em_obras">Em Obras</option>
                    <option value="pronto">Pronto</option>
                    <option value="esgotado">Esgotado</option>
                  </select>
                </div>
              </div>
            </div>
            <button onClick={handleSave} className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-500 transition-all shadow-lg">
              Salvar Empreendimento
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Empreendimentos;
