import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Building2,
  Layers,
  BarChart3,
  Hammer,
  Plus,
  Eye,
  Pencil,
  Trash2,
  X,
  Map,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

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
  registration_number?: string;
  total_area?: number;
}

const statusLabels: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  projeto: { label: 'Projeto', color: 'text-slate-600', bg: 'bg-slate-100' },
  aprovacao: {
    label: 'Aprovação',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  pre_venda: {
    label: 'Pré-Venda',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  em_obras: { label: 'Em Obras', color: 'text-amber-700', bg: 'bg-amber-100' },
  lancamento: {
    label: 'Lançamento',
    color: 'text-blue-700',
    bg: 'bg-blue-100',
  },
  pronto: { label: 'Pronto', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  esgotado: { label: 'Esgotado', color: 'text-red-700', bg: 'bg-red-100' },
};

const Empreendimentos: React.FC = () => {
  const { profile } = useAuth();
  const [developments, setDevelopments] = useState<Development[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inventoryValue, setInventoryValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    total_units: 0,
    status: 'projeto',
    progress_pct: 0,
    registration_number: '',
    total_area: 0,
  });

  useEffect(() => {
    if (profile?.organization_id) load();
  }, [profile?.organization_id]);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data }, { data: lots }] = await Promise.all([
        supabase
          .from('developments')
          .select('*')
          .eq('organization_id', profile?.organization_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('urban_lots')
          .select('price,status')
          .eq('organization_id', profile?.organization_id)
          .in('status', ['available', 'reserved']),
      ]);
      setDevelopments(data || []);
      setInventoryValue(
        (lots || []).reduce((total, lot) => total + Number(lot.price || 0), 0)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name) return;
    if (!profile?.organization_id) {
      alert(
        'Erro: Organização não identificada. Por favor, recarregue a página.'
      );
      return;
    }

    const payload = {
      ...form,
      organization_id: profile.organization_id,
      available_units: form.total_units,
    };
    const { error } = editingId
      ? await supabase
          .from('developments')
          .update(payload)
          .eq('id', editingId)
          .eq('organization_id', profile.organization_id)
      : await supabase.from('developments').insert(payload);
    if (error) {
      logger.error('Erro ao salvar empreendimento:', error);
      return;
    }
    setShowModal(false);
    setEditingId(null);
    setForm({
      name: '',
      address: '',
      city: '',
      state: '',
      total_units: 0,
      status: 'projeto',
      progress_pct: 0,
      registration_number: '',
      total_area: 0,
    });
    load();
  };

  const handleEdit = (development: Development) => {
    setEditingId(development.id);
    setForm({
      name: development.name || '',
      address: development.address || '',
      city: development.city || '',
      state: development.state || '',
      total_units: development.total_units || 0,
      status: development.status || 'projeto',
      progress_pct: development.progress_pct || 0,
      registration_number: development.registration_number || '',
      total_area: development.total_area || 0,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este empreendimento e todos os seus lotes?'))
      return;
    const { error } = await supabase
      .from('developments')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile?.organization_id);
    if (error) {
      logger.error('Erro ao excluir empreendimento:', error);
      return;
    }
    load();
  };

  const totalUnits = developments.reduce((a, d) => a + d.total_units, 0);
  const availableUnits = developments.reduce(
    (a, d) => a + d.available_units,
    0
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 uppercase italic tracking-tighter flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
              <Building2 className="text-white" size={32} />
            </div>
            Gestão de Loteamentos
          </h1>
          <p className="text-slate-500 font-medium mt-2">
            Plataforma 360° para Loteadoras, Incorporadoras e Urbanizadoras.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95"
        >
          <Plus size={20} /> Novo Loteamento
        </button>
      </div>

      {/* Quick Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            icon: Building2,
            label: 'Empreendimentos',
            value: String(developments.length),
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            icon: Layers,
            label: 'Total de Lotes',
            value: String(totalUnits),
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
          },
          {
            icon: BarChart3,
            label: 'Lotes Disponíveis',
            value: String(availableUnits),
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            icon: TrendingUp,
            label: 'VGV em Estoque',
            value: inventoryValue.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0,
            }),
            color: 'text-purple-600',
            bg: 'bg-purple-50',
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
          >
            <div
              className={`p-3 rounded-2xl ${stat.bg} ${stat.color} w-fit mb-4`}
            >
              <stat.icon size={24} />
            </div>
            <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
              {stat.label}
            </h3>
            <p className="text-3xl font-bold text-slate-900 italic tracking-tighter">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Loteamento / Localização
                </th>
                <th className="text-left px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Matrícula Mãe
                </th>
                <th className="text-left px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Estoque (Lotes)
                </th>
                <th className="text-left px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Infraestrutura
                </th>
                <th className="text-left px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Status
                </th>
                <th className="text-center px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Ações 360°
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-20 text-slate-400 animate-pulse"
                  >
                    Carregando empreendimentos...
                  </td>
                </tr>
              ) : developments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-slate-400">
                    <Building2
                      className="mx-auto mb-4 text-slate-200"
                      size={60}
                    />
                    <p className="font-bold uppercase tracking-widest text-xs">
                      Nenhum loteamento encontrado
                    </p>
                  </td>
                </tr>
              ) : (
                developments.map((dev) => {
                  const st = statusLabels[dev.status] || statusLabels.projeto;
                  return (
                    <tr
                      key={dev.id}
                      className="hover:bg-slate-50/50 transition-all group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 uppercase italic tracking-tighter text-lg leading-none">
                            {dev.name}
                          </span>
                          <span className="text-xs text-slate-400 font-medium mt-1">
                            {dev.city}, {dev.state}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {dev.registration_number || 'Não Informado'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-emerald-600">
                            {dev.available_units}
                          </span>
                          <span className="text-xs font-bold text-slate-300">
                            DE {dev.total_units}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1.5 w-32">
                          <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
                            <span>Progresso</span>
                            <span>{dev.progress_pct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                              style={{ width: `${dev.progress_pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span
                          className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${st.bg} ${st.color} border border-black/5`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            to={`/urban/loteamentos/${dev.id}`}
                            className="p-3 rounded-xl bg-slate-900 text-white hover:bg-black transition-all shadow-lg shadow-slate-900/10 flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                          >
                            <Map size={14} /> Mapa / Lotes
                          </Link>
                          <button
                            onClick={() => handleEdit(dev)}
                            className="p-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(dev.id)}
                            className="p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Loteamento */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 w-full max-w-2xl shadow-2xl border border-white/20 overflow-hidden relative">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 uppercase italic tracking-tighter">
                    {editingId
                      ? 'Editar Empreendimento'
                      : 'Novo Empreendimento'}
                  </h3>
                  <p className="text-slate-400 text-sm font-medium">
                    Configure os dados básicos da loteadora.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                }}
                className="p-3 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto px-1 custom-scrollbar">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                    Nome do Loteamento *
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all"
                    placeholder="Ex: Residencial Parque das Águas"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                    Cidade
                  </label>
                  <input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                    Estado (UF)
                  </label>
                  <input
                    value={form.state}
                    onChange={(e) =>
                      setForm({ ...form, state: e.target.value.toUpperCase() })
                    }
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold outline-none"
                    maxLength={2}
                    placeholder="SP"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                    Matrícula Mãe / Registro
                  </label>
                  <input
                    value={form.registration_number}
                    onChange={(e) =>
                      setForm({ ...form, registration_number: e.target.value })
                    }
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold outline-none"
                    placeholder="Ex: 123.456 no CRI de Sorocaba"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                    Total de Lotes
                  </label>
                  <input
                    type="number"
                    value={form.total_units}
                    onChange={(e) =>
                      setForm({ ...form, total_units: Number(e.target.value) })
                    }
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                    Infraestrutura (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.progress_pct}
                    onChange={(e) =>
                      setForm({ ...form, progress_pct: Number(e.target.value) })
                    }
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                    Status Inicial
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold outline-none"
                  >
                    <option value="projeto">Projeto / Viabilidade</option>
                    <option value="aprovacao">Em Aprovação</option>
                    <option value="pre_venda">Pré-Venda</option>
                    <option value="lancamento">Lançamento</option>
                    <option value="em_obras">Em Obras</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-10 flex gap-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-95"
              >
                {editingId
                  ? 'Atualizar Empreendimento'
                  : 'Salvar Empreendimento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Empreendimentos;
