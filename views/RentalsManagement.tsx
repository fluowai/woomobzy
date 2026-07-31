import React, { useState } from 'react';
import { useEffect, useMemo } from 'react';
import {
  locacaoService,
  type Contract,
  type DashboardResumo,
} from '@/services/locacaoService';

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
  CheckCircle2,
  CalendarDays,
  MoreVertical,
  Filter,
  Users,
  DollarSign,
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

export default function RentalsManagement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Todos');

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [dashboard, setDashboard] = useState<DashboardResumo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dash, list] = await Promise.all([
          locacaoService.getDashboard(),
          locacaoService.listContracts(),
        ]);
        setDashboard(dash);
        setContracts(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredContracts = useMemo(() => {
    if (activeTab === 'Todos') return contracts;
    if (activeTab === 'Em dia')
      return contracts.filter((c) => c.payment_status === 'em_dia');
    if (activeTab === 'Inadimplentes')
      return contracts.filter((c) => c.payment_status === 'inadimplente');
    if (activeTab === 'Atenção')
      return contracts.filter((c) => c.payment_status === 'atrasado');
    return contracts;
  }, [contracts, activeTab]);

  // MOCK DATA for Recharts
  const fluxoData = [
    { name: 'Previsto', value: 184000, color: '#10b981' },
    { name: 'Recebido', value: 162000, color: '#10b981' },
    { name: 'Repassado', value: 119000, color: '#10b981' },
  ];

  const formatCompactCurrency = (val: number) =>
    val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    });

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-12 font-sans text-slate-800 animate-fade-in">
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
            onClick={() => toast.info('Gerador de cobrança em breve')}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm rounded-lg transition-all shadow-sm flex items-center gap-2"
          >
            <FileText size={18} /> Gerar cobrança
          </button>
          <button
            onClick={() => navigate('/locacoes/nova')}
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
                    {formatCompactCurrency(
                      (dashboard?.receita_mensal || 0) * 0.9
                    )}
                  </p>
                  <span className="text-[10px] font-bold text-slate-400">
                    Julho de 2026
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
                • Julho
              </span>
            </h3>

            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => toast.info('Mês anterior')}
                className="p-2 hover:bg-slate-50 rounded-full transition-colors"
              >
                <ChevronLeft size={20} className="text-slate-400" />
              </button>

              <div className="flex gap-8">
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase">
                    Seg
                  </p>
                  <p className="text-lg font-medium text-slate-700">28</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase">
                    Ter
                  </p>
                  <p className="text-lg font-medium text-slate-700">29</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase">
                    Qua
                  </p>
                  <p className="text-lg font-medium text-slate-700">30</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase">
                    Qui
                  </p>
                  <p className="text-lg font-medium text-slate-700">31</p>
                </div>
                <div className="text-center relative">
                  <div className="absolute -inset-2 bg-emerald-50 rounded-lg -z-10" />
                  <p className="text-xs font-bold text-emerald-600 uppercase">
                    Sex
                  </p>
                  <div className="w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mt-0.5">
                    01
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase">
                    Sáb
                  </p>
                  <p className="text-lg font-medium text-slate-700">02</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase">
                    Dom
                  </p>
                  <p className="text-lg font-medium text-slate-700">03</p>
                </div>
              </div>

              <button
                onClick={() => toast.info('Próximo mês')}
                className="p-2 hover:bg-slate-50 rounded-full transition-colors"
              >
                <ChevronRight size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group cursor-pointer border border-transparent hover:border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <Download size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Recebimento{' '}
                      <span className="text-slate-400 font-normal">
                        • Residencial Aurora, Apto 401
                      </span>
                    </p>
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-700">R$ 2.850</p>
                <p className="text-xs font-bold text-emerald-600">Hoje</p>
                <p className="text-sm font-medium text-emerald-600 group-hover:underline flex items-center gap-1">
                  Registrar pagamento <ChevronRight size={14} />
                </p>
              </div>

              <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group cursor-pointer border border-transparent hover:border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Upload size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Repasse{' '}
                      <span className="text-slate-400 font-normal">
                        • Carlos Mendes
                      </span>
                    </p>
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-700">R$ 2.430</p>
                <p className="text-xs font-bold text-emerald-600">Hoje</p>
                <p className="text-sm font-medium text-emerald-600 group-hover:underline flex items-center gap-1">
                  Realizar repasse <ChevronRight size={14} />
                </p>
              </div>

              <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group cursor-pointer border border-transparent hover:border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                    <Percent size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Reajuste IPCA{' '}
                      <span className="text-slate-400 font-normal">
                        • Contrato LOC-0084
                      </span>
                    </p>
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-700">+4,23%</p>
                <p className="text-xs font-bold text-amber-600">Amanhã</p>
                <p className="text-sm font-medium text-emerald-600 group-hover:underline flex items-center gap-1">
                  Aplicar reajuste <ChevronRight size={14} />
                </p>
              </div>

              <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group cursor-pointer border border-transparent hover:border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                    <Search size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Vistoria de saída{' '}
                      <span className="text-slate-400 font-normal">
                        • Casa Jardim Europa
                      </span>
                    </p>
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-700"></p>
                <p className="text-xs font-medium text-slate-500">
                  02 ago, 14:00
                </p>
                <p className="text-sm font-medium text-emerald-600 group-hover:underline flex items-center gap-1">
                  Ver detalhes <ChevronRight size={14} />
                </p>
              </div>

              <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group cursor-pointer border border-transparent hover:border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Renovação contratual{' '}
                      <span className="text-slate-400 font-normal">
                        • Mariana Costa
                      </span>
                    </p>
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-700"></p>
                <p className="text-xs font-medium text-slate-500">Em 12 dias</p>
                <p className="text-sm font-medium text-emerald-600 group-hover:underline flex items-center gap-1">
                  Antecipar renovação <ChevronRight size={14} />
                </p>
              </div>
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
                      128
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
                      112
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
                      11
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
                      5
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
                      placeholder="Buscar inquilino ou imóvel..."
                      className="w-64 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                  <button
                    onClick={() => toast.info('Painel de filtros em breve')}
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
                        onClick={() => navigate('/locacao/contrato')}
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
                    5 aluguéis em atraso{' '}
                    <span className="text-red-500 ml-1">• R$ 8.750</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Ação imediata recomendada
                  </p>
                </div>
                <button
                  onClick={() => navigate('/locacoes/inadimplentes')}
                  className="text-xs font-bold text-emerald-600 whitespace-nowrap mt-0.5"
                >
                  Ver detalhes {'>'}
                </button>
              </div>

              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <Clock size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">
                    8 contratos vencem em 60 dias
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Planeje renovações
                  </p>
                </div>
                <button
                  onClick={() => navigate('/contratos')}
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
                    6 reajustes aguardando aplicação
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Atualize os valores
                  </p>
                </div>
                <button
                  onClick={() => toast.info('Tela de reajustes em breve')}
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
                <p className="text-xs font-bold text-slate-700">R$ 184 mil</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Recebido
                </p>
                <p className="text-xs font-bold text-slate-700">R$ 162 mil</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Repassado
                </p>
                <p className="text-xs font-bold text-slate-700">R$ 119 mil</p>
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
                    12 programados hoje
                  </p>
                  <p className="text-xl font-bold text-slate-900">R$ 28.460</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/locacoes/bordero')}
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
                onClick={() => toast.info('Registro de pagamento em breve')}
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
                onClick={() => toast.info('Nova vistoria em breve')}
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
                onClick={() => toast.info('Envio de lembrete em breve')}
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
    </div>
  );
}
