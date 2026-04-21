import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  FileText,
  Plus,
  Trash2,
  X,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { cobrancaService } from '../../services/cobrancaService';

interface Billing {
  id: string;
  contract_id: string;
  amount: number;
  due_date: string;
  payment_date?: string;
  status: string;
  description?: string;
  contract?: {
    tenant_name?: string;
    property?: { title?: string };
  };
}

const Cobranca: React.FC = () => {
  const [billings, setBillings] = useState<Billing[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState('');
  const [contracts, setContracts] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    amount: 0,
    due_date: '',
    description: '',
  });

  const loadBillings = useCallback(async () => {
    const { data } = await supabase
      .from('billing')
      .select(
        '*, contract:rental_contracts(tenant_name, property:property_id(title))'
      )
      .order('due_date', { ascending: false });
    setBillings(data || []);
  }, []);

  const loadContracts = useCallback(async () => {
    const { data } = await supabase
      .from('rental_contracts')
      .select('id, tenant_name, property:property_id(title), monthly_rent')
      .eq('status', 'active')
      .order('tenant_name');
    setContracts(data || []);
  }, []);

  const loadDashboard = useCallback(async () => {
    const data = await cobrancaService.getDashboard();
    setDashboard(data);
  }, []);

  useEffect(() => {
    loadBillings();
    loadContracts();
    loadDashboard();
  }, [loadBillings, loadContracts, loadDashboard]);

  const handleCreate = async () => {
    if (!selectedContract || !form.due_date) return;
    await cobrancaService.createBilling({
      contract_id: selectedContract,
      amount: form.amount,
      due_date: form.due_date,
      description: form.description,
    });
    setShowModal(false);
    setForm({ amount: 0, due_date: '', description: '' });
    setSelectedContract('');
    loadBillings();
  };

  const handlePay = async (id: string) => {
    await cobrancaService.registerPayment(id, {
      data_pagamento: new Date().toISOString().split('T')[0],
    });
    loadBillings();
    loadDashboard();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir cobrança?')) return;
    await supabase.from('billing').delete().eq('id', id);
    loadBillings();
  };

  const handleGerarMensal = async () => {
    setIsLoading(true);
    const now = new Date();
    await cobrancaService.generateMonthlyBillings(
      now.getMonth() + 1,
      now.getFullYear()
    );
    setIsLoading(false);
    loadBillings();
    loadDashboard();
  };

  const handleExport = async (formato: 'csv' | 'xml') => {
    const data = await cobrancaService.exportData(formato, {
      ano: new Date().getFullYear(),
    });
    if (data) {
      const blob = new Blob([formato === 'csv' ? data : JSON.stringify(data)], {
        type: formato === 'csv' ? 'text/csv' : 'application/xml',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cobrancas.${formato}`;
      a.click();
    }
  };

  const totalRecebido = billings
    .filter((b) => b.status === 'pago')
    .reduce((s, b) => s + (b.amount || 0), 0);
  const totalVencido = billings
    .filter((b) => b.status === 'vencido')
    .reduce((s, b) => s + (b.amount || 0), 0);
  const totalAberto = billings
    .filter((b) => b.status === 'aberto')
    .reduce((s, b) => s + (b.amount || 0), 0);

  const getStatusColor = (status: string) => {
    const cfg = cobrancaService.getStatusColor(status);
    return cfg;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter flex items-center gap-3">
            <DollarSign className="text-blue-600" size={32} />
            Cobranças & Boletos
          </h1>
          <p className="text-black/60 font-medium">
            Gestão de boletos, inadimplência e exportação contábil.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGerarMensal}
            disabled={isLoading}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-500 transition-all"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Gerar Mensal
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-500 transition-all shadow-lg"
          >
            <Plus size={18} /> Novo Boleto
          </button>
        </div>
      </div>

      {/* Dashboard */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              label: 'Receita Mensal',
              value: dashboard.totais?.receita_mensal_projetada,
              icon: TrendingUp,
              color: 'text-emerald-600',
            },
            {
              label: 'Total Recebido (Ano)',
              value: dashboard.totais?.total_recebido_ano,
              icon: CheckCircle,
              color: 'text-blue-600',
            },
            {
              label: 'Total Vencido',
              value: dashboard.totais?.total_vencido,
              icon: AlertTriangle,
              color: 'text-red-600',
            },
            {
              label: 'Taxa Inadimplência',
              value: `${dashboard.totais?.taxa_inadimplencia}%`,
              icon: Clock,
              color: 'text-amber-600',
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"
            >
              <stat.icon size={24} className={`${stat.color} mb-3`} />
              <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                {stat.label}
              </h3>
              <p className="text-2xl font-black text-slate-900">
                {stat.value?.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }) || stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Totals Bar */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200">
          <p className="text-emerald-600 text-xs font-bold uppercase">
            Recebido
          </p>
          <p className="text-2xl font-black text-emerald-700">
            R$ {totalRecebido.toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="bg-red-50 p-6 rounded-2xl border border-red-200">
          <p className="text-red-600 text-xs font-bold uppercase">Vencido</p>
          <p className="text-2xl font-black text-red-700">
            R$ {totalVencido.toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200">
          <p className="text-blue-600 text-xs font-bold uppercase">Aberto</p>
          <p className="text-2xl font-black text-blue-700">
            R$ {totalAberto.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Exports */}
      <div className="flex gap-2">
        <button
          onClick={() => handleExport('csv')}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-sm font-medium hover:bg-slate-200"
        >
          <Download size={16} /> Exportar CSV
        </button>
        <button
          onClick={() => handleExport('xml')}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-sm font-medium hover:bg-slate-200"
        >
          <Download size={16} /> Exportar XML
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase">
                  Locatário
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase">
                  Vencimento
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase">
                  Valor
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {billings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    <DollarSign
                      className="mx-auto mb-3 text-slate-300"
                      size={40}
                    />
                    <p className="font-medium">Nenhuma cobrança</p>
                  </td>
                </tr>
              ) : (
                billings.map((b) => {
                  const cfg = getStatusColor(b.status);
                  return (
                    <tr
                      key={b.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-black">
                          {b.contract?.tenant_name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {b.description}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {b.due_date
                          ? new Date(b.due_date).toLocaleDateString('pt-BR')
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-emerald-600">
                        R$ {b.amount?.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${cfg.bg} ${cfg.color}`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        {b.status !== 'pago' && b.status !== 'cancelado' && (
                          <button
                            onClick={() => handlePay(b.id)}
                            className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-black">Nova Cobrança</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Contrato
                </label>
                <select
                  value={selectedContract}
                  onChange={(e) => {
                    setSelectedContract(e.target.value);
                    const c = contracts.find((x) => x.id === e.target.value);
                    if (c)
                      setForm((f) => ({ ...f, amount: c.monthly_rent || 0 }));
                  }}
                  className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200"
                >
                  <option value="">Selecione</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.tenant_name} - {c.property?.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, amount: Number(e.target.value) }))
                    }
                    className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Vencimento
                  </label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, due_date: e.target.value }))
                    }
                    className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Descrição
                </label>
                <input
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Aluguel mês参考..."
                  className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200"
                />
              </div>
            </div>
            <button
              onClick={handleCreate}
              className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-500"
            >
              Gerar Boleto
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cobranca;
