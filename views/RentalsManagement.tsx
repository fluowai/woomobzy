import { logger } from '@/utils/logger';
import React, { useState } from 'react';
import { useEffect, useMemo } from 'react';
import {
  locacaoService,
  type Contract,
  type DashboardResumo,
} from '@/services/locacaoService';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

import {
  FileText,
  Plus,
  Search,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Clock,
  Percent,
  Download,
  Upload,
  BarChart3,
  Wallet,
  ArrowRightLeft,
  MoreVertical,
  Filter,
  Users,
  DollarSign,
  Sparkles,
  X,
  Send,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { generateLeaseAssistantResponse } from '@/services/geminiService';

export default function RentalsManagement() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Todos');
  const [agendaMonth, setAgendaMonth] = useState(new Date().getMonth());
  const [agendaYear, setAgendaYear] = useState(new Date().getFullYear());
  const [showFilters, setShowFilters] = useState(false);

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [billings, setBillings] = useState<any[]>([]);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<DashboardResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<
    { role: 'user' | 'assistant'; text: string }[]
  >([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dashRes, listRes, billingRes, renewalRes] = await Promise.all([
          locacaoService.getDashboard(),
          locacaoService.listContracts(),
          profile?.organization_id
            ? supabase
                .from('billing')
                .select('*')
                .eq('organization_id', profile.organization_id)
            : Promise.resolve({ data: null }),
          profile?.organization_id
            ? supabase
                .from('contract_renewals')
                .select('*')
                .eq('organization_id', profile.organization_id)
            : Promise.resolve({ data: null }),
        ]);
        setDashboard(dashRes.data);
        setContracts(listRes.data);
        setBillings(billingRes.data || []);
        setRenewals(renewalRes.data || []);
      } catch (e) {
        logger.error('Erro ao carregar dados do dashboard:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile?.organization_id]);

  const filteredContracts = useMemo(() => {
    let result = contracts;
    if (activeTab === 'Em dia')
      result = result.filter((c) => c.payment_status === 'em_dia');
    else if (activeTab === 'Inadimplentes')
      result = result.filter((c) => c.payment_status === 'inadimplente');
    else if (activeTab === 'Atenção')
      result = result.filter((c) => c.payment_status === 'atrasado');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          (c.tenant_name || '').toLowerCase().includes(q) ||
          (c.property_title || '').toLowerCase().includes(q) ||
          (c.contract_number || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [contracts, activeTab, searchQuery]);

  const contractMap = useMemo(
    () => new Map<string, Contract>(contracts.map((c) => [c.id || '', c])),
    [contracts]
  );

  const repassePendentes = useMemo(
    () =>
      billings.filter((b) => b.status === 'aberto' || b.status === 'vencido'),
    [billings]
  );
  const repassePendenteTotal = repassePendentes.reduce(
    (sum, b) => sum + (Number(b.amount) || 0),
    0
  );
  const recebidoTotal = billings
    .filter((b) => b.status === 'pago')
    .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const reajustesCount = renewals.filter(
    (r) => r.renewal_type === 'reajuste'
  ).length;

  const agendaItems = useMemo(() => {
    const startOfMonth = new Date(agendaYear, agendaMonth, 1);
    const endOfMonth = new Date(agendaYear, agendaMonth + 1, 1);
    return billings
      .filter((b) => {
        if (!b.due_date) return false;
        const d = new Date(b.due_date + 'T00:00:00');
        return d >= startOfMonth && d < endOfMonth;
      })
      .sort(
        (a, b) =>
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      );
  }, [billings, agendaMonth, agendaYear]);

  const fluxoData = [
    {
      name: 'Previsto',
      value: dashboard?.receita_mensal || 0,
      color: '#10b981',
    },
    {
      name: 'Recebido',
      value: recebidoTotal,
      color: '#10b981',
    },
    {
      name: 'Pendente',
      value: repassePendenteTotal,
      color: '#f59e0b',
    },
  ];

  const emDiaCount = useMemo(
    () => contracts.filter((c) => c.payment_status === 'em_dia').length,
    [contracts]
  );
  const atrasadosCount = useMemo(
    () => contracts.filter((c) => c.payment_status === 'atrasado').length,
    [contracts]
  );
  const inadimplentesCount = useMemo(
    () => contracts.filter((c) => c.payment_status === 'inadimplente').length,
    [contracts]
  );
  const valorAtrasado = useMemo(
    () =>
      contracts
        .filter(
          (c) =>
            c.payment_status === 'inadimplente' ||
            c.payment_status === 'atrasado'
        )
        .reduce((sum, c) => sum + (c.monthly_rent || 0), 0),
    [contracts]
  );

  const vencendo60Dias = useMemo(() => {
    const now = new Date();
    const em60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    return contracts.filter((c) => {
      if (!c.end_date || c.status !== 'active') return false;
      const end = new Date(c.end_date);
      return end >= now && end <= em60Days;
    }).length;
  }, [contracts]);

  const formatCompactCurrency = (val: number) =>
    val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    });

  const handleAiSend = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const question = aiInput.trim();
    setAiInput('');
    setAiMessages((prev) => [...prev, { role: 'user', text: question }]);
    setAiLoading(true);
    try {
      const context = `Carteira com ${contracts.length} contratos. ${dashboard ? `Receita mensal: R$ ${dashboard.receita_mensal}. ` : ''}Inadimplentes: ${dashboard?.inadimplentes || 0}. Atrasados: ${dashboard?.atrasados || 0}.`;
      const response = await generateLeaseAssistantResponse(question, context);
      setAiMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: response || 'Não consegui gerar uma resposta no momento.',
        },
      ]);
    } catch (error) {
      logger.error('Erro no assistente IA:', error);
      setAiMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Ocorreu um erro ao consultar o assistente.',
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setAgendaMonth((prev) => {
      if (prev === 0) {
        setAgendaYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setAgendaMonth((prev) => {
      if (prev === 11) {
        setAgendaYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const monthName = new Date(agendaYear, agendaMonth).toLocaleString('pt-BR', {
    month: 'long',
  });
  const monthYearLabel = `${
    monthName.charAt(0).toUpperCase() + monthName.slice(1)
  } de ${agendaYear}`;

  const handleNewInspection = () => {
    navigate('/urban/locacao/novo');
  };

  const handleSendReminder = async () => {
    try {
      const res = await fetch('/api/locacao/notifications/due-soon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days_ahead: 5 }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Lembretes enviados: ${data.data?.length || 0}`);
      } else {
        toast.error('Erro ao enviar lembretes');
      }
    } catch {
      toast.error('Erro ao enviar lembretes');
    }
  };

  const handleViewAdjustments = () => {
    navigate('/urban/locacao');
  };

  const handleGenerateCharge = () => {
    navigate('/urban/locacao/novo');
  };

  return (
    <div className="wootech-reference-screen w-full max-w-[1600px] mx-auto pb-12 font-sans text-slate-800 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <span className="font-medium text-slate-400">Imóveis</span>
            <span className="text-slate-300">/</span>
            <span className="text-emerald-600 font-semibold">Locações</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Central de locações
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Recebimentos, repasses, contratos e pendências em um só fluxo.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleGenerateCharge}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm rounded-lg transition-all shadow-sm flex items-center gap-2"
          >
            <FileText size={18} /> Gerar cobrança
          </button>
          <button
            onClick={() => navigate('/urban/financeiro-advanced/novo')}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-all shadow-sm flex items-center gap-2"
          >
            <Plus size={18} /> Nova locação
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left Column (Main Area) */}
        <div className="flex-1 flex flex-col gap-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
                <BarChart3 size={20} className="text-slate-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">
                  {formatCompactCurrency(dashboard?.receita_mensal || 0)}
                </p>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                  Receita prevista
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                <Wallet size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">
                  {formatCompactCurrency(dashboard?.receita_anual || 0)}
                </p>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                  Recebido
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle size={20} className="text-red-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-red-500">
                  {formatCompactCurrency(dashboard?.valor_inadimplencia || 0)}
                </p>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                  Em atraso
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                <ArrowRightLeft size={20} className="text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xl font-bold text-slate-900">
                    {formatCompactCurrency(repassePendenteTotal)}
                  </p>
                  <span className="text-[10px] font-bold text-slate-400">
                    {monthYearLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                  A repassar
                </p>
              </div>
            </div>
          </div>

          {/* Agenda Financeira */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              Agenda financeira{' '}
              <span className="text-slate-400 text-sm font-medium">
                • {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
              </span>
            </h3>

            <div className="flex items-center justify-between mb-8">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-slate-50 rounded-full transition-colors"
              >
                <ChevronLeft size={20} className="text-slate-400" />
              </button>

              <div className="flex gap-8">
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase">
                    {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                  </p>
                  <p className="text-lg font-medium text-slate-700">
                    {new Date(agendaYear, agendaMonth).toLocaleString('pt-BR', {
                      month: 'short',
                    })}
                  </p>
                </div>
              </div>

              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-slate-50 rounded-full transition-colors"
              >
                <ChevronRight size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              {agendaItems.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-6">
                  Nenhum registro para este mês.
                </p>
              ) : (
                agendaItems.map((b) => {
                  const contract = contractMap.get(b.contract_id);
                  const isPaid = b.status === 'pago';
                  const isOverdue = b.status === 'vencido';
                  const due = b.due_date
                    ? new Date(b.due_date + 'T00:00:00')
                    : null;
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const tomorrow = new Date(today);
                  tomorrow.setDate(tomorrow.getDate() + 1);

                  let dateLabel = '';
                  if (isPaid) {
                    dateLabel = 'Pago';
                  } else if (isOverdue) {
                    dateLabel = 'Vencido';
                  } else if (due) {
                    if (due.getTime() === today.getTime()) dateLabel = 'Hoje';
                    else if (due.getTime() === tomorrow.getTime())
                      dateLabel = 'Amanhã';
                    else
                      dateLabel = due.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                      });
                  }

                  const meta = isPaid
                    ? {
                        icon: Upload,
                        bg: 'bg-emerald-50',
                        color: 'text-emerald-600',
                      }
                    : isOverdue
                      ? {
                          icon: AlertCircle,
                          bg: 'bg-red-50',
                          color: 'text-red-600',
                        }
                      : {
                          icon: Download,
                          bg: 'bg-blue-50',
                          color: 'text-blue-600',
                        };
                  const Icon = meta.icon;

                  return (
                    <div
                      key={b.id}
                      className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group cursor-pointer border border-transparent hover:border-slate-100"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-full ${meta.bg} flex items-center justify-center ${meta.color}`}
                        >
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {isPaid ? 'Pagamento registrado' : 'Recebimento'}{' '}
                            <span className="text-slate-400 font-normal">
                              • {contract?.tenant_name || 'Cobrança'}
                            </span>
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-slate-700">
                        {formatCompactCurrency(b.amount || 0)}
                      </p>
                      <p
                        className={`text-xs font-bold ${isOverdue ? 'text-red-500' : 'text-emerald-600'}`}
                      >
                        {dateLabel}
                      </p>
                      <p className="text-sm font-medium text-emerald-600 group-hover:underline flex items-center gap-1">
                        {isPaid ? 'Ver detalhes' : 'Registrar pagamento'}{' '}
                        <ChevronRight size={14} />
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Carteira de locações */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="p-6 pb-0 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-6">
                Carteira de locações
              </h3>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                <div className="flex items-center gap-6 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('Todos')}
                    className={`text-sm font-bold border-b-2 pb-2 whitespace-nowrap transition-colors ${activeTab === 'Todos' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                    Todos{' '}
                    <span
                      className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'Todos' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100'}`}
                    >
                      {contracts.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('Em dia')}
                    className={`text-sm font-bold border-b-2 pb-2 whitespace-nowrap transition-colors ${activeTab === 'Em dia' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                    Em dia{' '}
                    <span
                      className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'Em dia' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100'}`}
                    >
                      {emDiaCount}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('Atenção')}
                    className={`text-sm font-bold border-b-2 pb-2 whitespace-nowrap transition-colors ${activeTab === 'Atenção' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                    Atenção{' '}
                    <span
                      className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'Atenção' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100'}`}
                    >
                      {atrasadosCount}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('Inadimplentes')}
                    className={`text-sm font-bold border-b-2 pb-2 whitespace-nowrap transition-colors ${activeTab === 'Inadimplentes' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                    Inadimplentes{' '}
                    <span
                      className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'Inadimplentes' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100'}`}
                    >
                      {inadimplentesCount}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar inquilino ou imóvel..."
                      className="w-64 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Filter size={16} /> Filtros
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-4 pl-6 pr-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Inquilino / Imóvel
                    </th>
                    <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Aluguel
                    </th>
                    <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Próximo vencimento
                    </th>
                    <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Situação
                    </th>
                    <th className="py-4 pr-6 pl-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Próxima ação
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-slate-500"
                      >
                        Carregando locações...
                      </td>
                    </tr>
                  ) : filteredContracts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-slate-500"
                      >
                        Nenhum contrato encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredContracts.map((contract) => (
                      <tr
                        key={contract.id}
                        onClick={() =>
                          navigate(`/urban/locacao/${contract.id}`)
                        }
                        className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                      >
                        <td className="py-4 pl-6 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold">
                              {(contract.tenant_name || 'C')
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">
                                {contract.tenant_name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {(contract as any).property?.title || 'Imóvel'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm font-bold text-slate-700">
                            {formatCompactCurrency(contract.monthly_rent || 0)}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm font-medium text-slate-700">
                            {contract.end_date
                              ? new Date(contract.end_date).toLocaleDateString()
                              : 'N/A'}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${locacaoService.getStatusColor(contract.payment_status).bg} ${locacaoService.getStatusColor(contract.payment_status).color}`}
                          >
                            {contract.payment_status === 'em_dia'
                              ? 'Em dia'
                              : contract.payment_status === 'inadimplente'
                                ? 'Inadimplente'
                                : 'Atrasado'}
                          </span>
                        </td>
                        <td className="py-4 pr-6 pl-4">
                          <div className="flex items-center gap-3 justify-between">
                            <span className="text-sm font-medium text-emerald-600 flex items-center gap-1.5">
                              <ChevronRight size={16} /> Ver detalhes
                            </span>
                            <MoreVertical
                              size={16}
                              className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="w-full xl:w-96 shrink-0 space-y-6">
          {/* Atenção necessária */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-6">
              Atenção necessária
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle
                  size={20}
                  className="text-red-500 shrink-0 mt-0.5"
                />
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">
                    {atrasadosCount + inadimplentesCount} aluguéis em atraso{' '}
                    <span className="text-red-500 ml-1">
                      • {formatCompactCurrency(valorAtrasado)}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Ação imediata recomendada
                  </p>
                </div>
                <button
                  onClick={() =>
                    navigate('/urban/locacao?filter=inadimplentes')
                  }
                  className="text-xs font-bold text-emerald-600 whitespace-nowrap mt-0.5"
                >
                  Ver detalhes {'>'}
                </button>
              </div>

              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <Clock size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">
                    {vencendo60Dias} contratos vencem em 60 dias
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Planeje renovações
                  </p>
                </div>
                <button
                  onClick={() => navigate('/urban/locacao')}
                  className="text-xs font-bold text-emerald-600 whitespace-nowrap mt-0.5"
                >
                  Ver contratos {'>'}
                </button>
              </div>

              <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <Percent
                  size={20}
                  className="text-emerald-600 shrink-0 mt-0.5"
                />
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">
                    {reajustesCount} reajustes registrados
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Atualize os valores
                  </p>
                </div>
                <button
                  onClick={handleViewAdjustments}
                  className="text-xs font-bold text-emerald-600 whitespace-nowrap mt-0.5"
                >
                  Ver reajustes {'>'}
                </button>
              </div>
            </div>
          </div>

          {/* Fluxo do mês */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-6">
              Fluxo do mês
            </h3>

            <div className="h-40 w-full mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fluxoData} barSize={40}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    dy={10}
                  />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    formatter={(value: number) => [
                      formatCompactCurrency(value),
                      '',
                    ]}
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {fluxoData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-between text-center px-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Previsto
                </p>
                <p className="text-xs font-bold text-slate-700">
                  {formatCompactCurrency(fluxoData[0]?.value || 0)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Recebido
                </p>
                <p className="text-xs font-bold text-slate-700">
                  {formatCompactCurrency(fluxoData[1]?.value || 0)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Pendente
                </p>
                <p className="text-xs font-bold text-slate-700">
                  {formatCompactCurrency(fluxoData[2]?.value || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Repasses */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-6">
              Repasses aos proprietários
            </h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {repassePendentes.length} pendentes de pagamento
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    {formatCompactCurrency(repassePendenteTotal)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/urban/locacao/bordero')}
                className="px-4 py-2 bg-white border border-emerald-600 text-emerald-600 font-bold text-sm rounded-lg hover:bg-emerald-50 transition-colors"
              >
                Ver borderô
              </button>
            </div>
          </div>

          {/* Ações rápidas */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-6">
              Ações rápidas
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => navigate('/urban/locacao')}
                className="flex flex-col items-center justify-center gap-2 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-700 text-center leading-tight">
                  Registrar pagamento
                </span>
              </button>

              <button
                onClick={handleNewInspection}
                className="flex flex-col items-center justify-center gap-2 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Search size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-700 text-center leading-tight">
                  Nova vistoria
                </span>
              </button>

              <button
                onClick={handleSendReminder}
                className="flex flex-col items-center justify-center gap-2 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <AlertCircle size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-700 text-center leading-tight">
                  Enviar lembrete
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant */}
      {aiChatOpen && (
        <div className="fixed bottom-6 right-6 w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col z-50">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600 rounded-xl text-white">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Assistente IA
                </p>
                <p className="text-[10px] text-slate-500">Gestão de locações</p>
              </div>
            </div>
            <button
              onClick={() => setAiChatOpen(false)}
              className="p-1 hover:bg-slate-100 rounded-lg"
            >
              <X size={18} className="text-slate-500" />
            </button>
          </div>
          <div className="flex-1 min-h-[300px] max-h-[400px] overflow-y-auto p-4 space-y-3">
            {aiMessages.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-8">
                Pergunte sobre inadimplência, reajustes, renovações ou dúvidas
                do módulo.
              </p>
            )}
            {aiMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-xl bg-slate-100 text-xs text-slate-500">
                  Digitando...
                </div>
              </div>
            )}
          </div>
          <div className="p-3 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiSend()}
              placeholder="Digite sua pergunta..."
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleAiSend}
              disabled={aiLoading}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {!aiChatOpen && (
        <button
          onClick={() => setAiChatOpen(true)}
          className="fixed bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center gap-2 z-40"
        >
          <Sparkles size={20} />
          <span className="text-xs font-bold">Assistente IA</span>
        </button>
      )}
    </div>
  );
}
