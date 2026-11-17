import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertCircle,
  BarChart2,
  CheckCircle,
  CreditCard,
  DollarSign,
  Send,
  TrendingDown,
  TrendingUp,
  X,
  Plus,
  Settings,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  cobrancaService,
  type Billing,
  type DashboardFinanceiro,
  type Expense,
} from '../../services/cobrancaService';

const statusColors: Record<string, string> = {
  pago: 'bg-green-100 text-green-700',
  aberto: 'bg-blue-100 text-blue-700',
  vencido: 'bg-red-100 text-red-700',
  cancelado: 'bg-slate-100 text-slate-600',
};

// Os gráficos agora usarão dados reativos calculados a partir da API

export default function FinanceiroUrbano() {
  const [tab, setTab] = useState<
    'cobranca' | 'despesas' | 'fluxo' | 'dre' | 'config'
  >('cobranca');
  const [isReguaActive, setIsReguaActive] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dashboard, setDashboard] = useState<DashboardFinanceiro | null>(null);
  const [billings, setBillings] = useState<Billing[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<Billing | null>(null);
  const [newBilling, setNewBilling] = useState({
    contract_id: '',
    tenantName: '',
    amount: 0,
    due_date: '',
    description: '',
  });
  const [newExpense, setNewExpense] = useState({
    provider_name: '',
    category: 'Operacional',
    amount: 0,
    due_date: '',
    description: '',
  });

  const loadData = async () => {
    setLoading(true);
    const [dashboardData, billingData, expensesData] = await Promise.all([
      cobrancaService.getDashboard(),
      cobrancaService.listBillings({ ano: new Date().getFullYear() }),
      cobrancaService.listExpenses({ ano: new Date().getFullYear() }),
    ]);
    setDashboard(dashboardData);
    setBillings(billingData || []);
    setExpenses(expensesData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const resumo = useMemo(
    () => [
      {
        label: 'A Receber (Mês)',
        value: cobrancaService.formatCurrency(
          dashboard?.totais?.total_aberto || 0
        ),
        icon: TrendingUp,
        color: 'text-green-600',
        bg: 'bg-green-50',
        detalhe: `${dashboard?.totais?.contratos_ativos || 0} contratos ativos`,
      },
      {
        label: 'Recebido (Ano)',
        value: cobrancaService.formatCurrency(
          dashboard?.totais?.total_recebido_ano || 0
        ),
        icon: CheckCircle,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        detalhe: 'Pagamentos confirmados',
      },
      {
        label: 'Inadimplência',
        value: cobrancaService.formatCurrency(
          dashboard?.totais?.total_vencido || 0
        ),
        icon: AlertCircle,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        detalhe: `${dashboard?.totais?.inadimplentes || 0} contratos em atraso`,
      },
      {
        label: 'Receita Projetada',
        value: cobrancaService.formatCurrency(
          dashboard?.totais?.receita_mensal_projetada || 0
        ),
        icon: DollarSign,
        color: 'text-primary',
        bg: 'bg-primary/10',
        detalhe: 'Resultado mensal previsto',
      },
    ],
    [dashboard]
  );

  const fluxoData = React.useMemo(() => {
    if (!dashboard || !dashboard.receita) return [];
    return dashboard.receita.map((item, idx) => ({
      mes: item.mes,
      receitas: item.valor,
      inadimplencia: dashboard.inadimplencia[idx]?.valor || 0
    }));
  }, [dashboard]);

  const dreData = React.useMemo(() => {
    if (!dashboard || !dashboard.receita) return [];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return dashboard.receita.map((item, idx) => {
      const monthExpenses = expenses
        .filter((e) => {
          if (!e.due_date) return false;
          const d = new Date(e.due_date);
          return !Number.isNaN(d.getTime()) && (d.getMonth() === idx || monthNames[d.getMonth()] === item.mes);
        })
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      return {
        mes: item.mes,
        lucroBruto: item.valor,
        lucroLiquido: Number((item.valor - monthExpenses).toFixed(2)),
      };
    });
  }, [dashboard, expenses]);

  const handleCreateBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBilling.amount || !newBilling.due_date) {
      toast.error('Preencha valor e vencimento.');
      return;
    }

    const created = await cobrancaService.createBilling({
      ...(newBilling.contract_id ? { contract_id: newBilling.contract_id } : {}),
      payer_name: newBilling.tenantName,
      amount: newBilling.amount,
      due_date: newBilling.due_date,
      description: newBilling.description,
    } as any);

    if (!created) {
      toast.error('Erro ao gerar cobrança no servidor.');
      return;
    }

    toast.success('Cobrança gerada com sucesso!');
    setIsModalOpen(false);
    setNewBilling({
      contract_id: '',
      tenantName: '',
      amount: 0,
      due_date: '',
      description: '',
    });
    await loadData();
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.provider_name || !newExpense.amount || !newExpense.due_date) {
      toast.error('Preencha fornecedor, valor e vencimento.');
      return;
    }
    const created = await cobrancaService.createExpense(newExpense);
    if (!created) {
      toast.error('Erro ao registrar despesa.');
      return;
    }
    toast.success('Despesa registrada com sucesso!');
    setIsExpenseModalOpen(false);
    setNewExpense({
      provider_name: '',
      category: 'Operacional',
      amount: 0,
      due_date: '',
      description: '',
    });
    await loadData();
  };

  const handlePayExpense = async (expenseId?: string) => {
    if (!expenseId) return;
    const updated = await cobrancaService.payExpense(expenseId);
    if (!updated) {
      toast.error('Não foi possível quitar a despesa.');
      return;
    }
    toast.success('Despesa marcada como paga!');
    await loadData();
  };

  const handleExportOpenBoletos = async () => {
    const csv = await cobrancaService.exportData('csv', {
      ano: new Date().getFullYear(),
    });
    if (!csv) {
      toast.error('Não foi possível exportar boletos.');
      return;
    }
    const blob = new Blob([typeof csv === 'string' ? csv : JSON.stringify(csv)], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cobrancas-${new Date().getFullYear()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Remessa / lista de boletos exportada!');
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="h1 flex items-center gap-3 text-slate-900">
          <DollarSign className="text-primary" size={32} />
          Financeiro &amp; ERP
        </h1>
        <p className="body mt-1 text-slate-500">
          Cobrança, fluxo de caixa, repasses e gestão de inadimplência.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {resumo.map((item) => (
          <div key={item.label} className="card-premium p-5">
            <div
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${item.bg}`}
            >
              <item.icon size={20} className={item.color} />
            </div>
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="mt-1 text-xs font-bold text-slate-700">
              {item.label}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">{item.detalhe}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        {[
          { id: 'cobranca', label: 'Contas a Receber', icon: CreditCard },
          { id: 'despesas', label: 'Contas a Pagar', icon: TrendingDown },
          { id: 'fluxo', label: 'Fluxo de Caixa', icon: BarChart2 },
          { id: 'dre', label: 'DRE', icon: TrendingUp },
          { id: 'config', label: 'Automação / Gateway', icon: Settings },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id as any)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
              tab === item.id
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <item.icon size={16} /> {item.label}
          </button>
        ))}
      </div>

      {tab === 'cobranca' && (
        <div className="card-premium overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <h2 className="font-bold text-slate-900">Cobranças do período</h2>
            <div className="flex gap-2">
              <button
                onClick={handleExportOpenBoletos}
                className="btn bg-slate-100 text-sm text-slate-700 hover:bg-slate-200"
              >
                <Send size={15} /> Exportar Boletos
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary text-sm flex items-center gap-1"
              >
                <Plus size={16} /> Gerar Cobrança
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {[
                    'Cliente',
                    'Imóvel',
                    'Vencimento',
                    'Valor',
                    'Status',
                    'Ação',
                  ].map((header) => (
                    <th
                      key={header}
                      className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-10 text-center text-sm text-slate-400"
                    >
                      Carregando financeiro...
                    </td>
                  </tr>
                ) : billings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-10 text-center text-sm text-slate-400"
                    >
                      Nenhuma cobrança encontrada.
                    </td>
                  </tr>
                ) : (
                  billings.slice(0, 20).map((billing) => (
                    <tr
                      key={billing.id}
                      className="transition-colors hover:bg-slate-50/50"
                    >
                      <td className="p-4 text-sm font-bold text-slate-900">
                        {billing.contract?.tenant_name || 'Cliente'}
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {billing.contract?.property?.title || '-'}
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {billing.due_date
                          ? new Date(billing.due_date).toLocaleDateString(
                              'pt-BR'
                            )
                          : '-'}
                      </td>
                      <td className="p-4 font-bold text-slate-900">
                        {cobrancaService.formatCurrency(billing.amount || 0)}
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusColors[billing.status || 'aberto'] || 'bg-slate-100 text-slate-600'}`}
                        >
                          {billing.status || 'aberto'}
                        </span>
                      </td>
                      <td className="p-4">
                        {billing.status === 'pago' ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                            <CheckCircle size={14} /> Quitado
                          </span>
                        ) : (
                          <button
                            onClick={() => setSelectedBilling(billing)}
                            className="text-xs font-bold text-primary hover:underline"
                          >
                            Ver Boleto
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'despesas' && (
        <div className="card-premium overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <h2 className="font-bold text-slate-900">
              Contas a Pagar (Despesas)
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="btn btn-primary text-sm flex items-center gap-1"
              >
                <Plus size={16} /> Nova Despesa
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {[
                    'Fornecedor',
                    'Categoria',
                    'Vencimento',
                    'Valor',
                    'Status',
                    'Ação',
                  ].map((header) => (
                    <th
                      key={header}
                      className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-10 text-center text-sm text-slate-400"
                    >
                      Nenhuma conta a pagar encontrada.
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="transition-colors hover:bg-slate-50/50"
                    >
                      <td className="p-4 text-sm font-bold text-slate-900">
                        {expense.provider_name}
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {expense.category}
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {expense.due_date
                          ? new Date(expense.due_date).toLocaleDateString(
                              'pt-BR'
                            )
                          : '-'}
                      </td>
                      <td className="p-4 font-bold text-slate-900">
                        {cobrancaService.formatCurrency(expense.amount || 0)}
                      </td>
                      <td className="p-4">
                        <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase bg-amber-100 text-amber-700">
                          {expense.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {expense.status === 'pago' ? (
                          <span className="text-xs font-bold text-emerald-600">Pago</span>
                        ) : (
                          <button
                            onClick={() => handlePayExpense(expense.id)}
                            className="text-xs font-bold text-primary hover:underline"
                          >
                            Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'fluxo' && (
        <div className="card-premium p-8">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BarChart2 className="text-primary" /> Fluxo de Caixa (Real vs
            Projetado)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={fluxoData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="mes"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dx={-10}
                  tickFormatter={(val) => `R$ ${val / 1000}k`}
                />
                <RechartsTooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ paddingTop: '20px' }}
                />
                <Bar
                  dataKey="receitas"
                  name="Receitas Reais"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                />
                <Bar
                  dataKey="inadimplencia"
                  name="Inadimplência"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'dre' && (
        <div className="card-premium p-8">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <TrendingDown className="text-blue-600" /> DRE - Demonstrativo de
            Resultados
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dreData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="mes"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dx={-10}
                  tickFormatter={(val) => `R$ ${val / 1000}k`}
                />
                <RechartsTooltip
                  cursor={{
                    stroke: '#cbd5e1',
                    strokeWidth: 1,
                    strokeDasharray: '5 5',
                  }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ paddingTop: '20px' }}
                />
                <Line
                  type="monotone"
                  dataKey="lucroBruto"
                  name="Lucro Bruto"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="lucroLiquido"
                  name="Lucro Líquido"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Modal Nova Cobrança */}
      {tab === 'config' && (
        <div className="card-premium p-8 space-y-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Settings className="text-primary" /> Automação e Gateway de
                Pagamento
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Configure a régua de cobrança automática e a integração com
                bancos.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />{' '}
              Ativo
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-l-4 border-primary pl-3">
                Régua de Cobrança
              </h3>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <p className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">
                      Aviso de Vencimento (D-3)
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase">
                      WhatsApp e Email - 3 dias antes
                    </p>
                  </div>
                  <div
                    className={`w-12 h-6 rounded-full transition-colors p-1 ${isReguaActive ? 'bg-primary' : 'bg-slate-300'}`}
                    onClick={() => setIsReguaActive(!isReguaActive)}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${isReguaActive ? 'translate-x-6' : 'translate-x-0'}`}
                    />
                  </div>
                </label>

                <hr className="border-slate-200" />

                <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <p className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">
                      Dia do Vencimento (D-0)
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase">
                      Envio do PIX/Boleto de manhã
                    </p>
                  </div>
                  <div
                    className={`w-12 h-6 rounded-full transition-colors p-1 ${isReguaActive ? 'bg-primary' : 'bg-slate-300'}`}
                    onClick={() => setIsReguaActive(!isReguaActive)}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${isReguaActive ? 'translate-x-6' : 'translate-x-0'}`}
                    />
                  </div>
                </label>

                <hr className="border-slate-200" />

                <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <p className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">
                      Aviso de Atraso (D+3)
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase">
                      Alerta de Juros/Multa
                    </p>
                  </div>
                  <div
                    className={`w-12 h-6 rounded-full transition-colors p-1 ${isReguaActive ? 'bg-primary' : 'bg-slate-300'}`}
                    onClick={() => setIsReguaActive(!isReguaActive)}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${isReguaActive ? 'translate-x-6' : 'translate-x-0'}`}
                    />
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-l-4 border-amber-500 pl-3">
                Gateway & Split de Repasse
              </h3>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    Gateway Principal
                  </label>
                  <select className="mt-1 w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-primary">
                    <option value="asaas">Asaas (Boleto/Pix)</option>
                    <option value="cora">Cora Bank (Isento)</option>
                    <option value="iugu">Iugu</option>
                  </select>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 accent-primary"
                      defaultChecked
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Ativar Split de Pagamento (Rateio)
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Ao pagar aluguel, descontar comissão da Imobiliária e
                        gerar 'Conta a Pagar' para Repasse do Proprietário
                        automaticamente.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() =>
                      toast.success('Configurações do Gateway salvas e ativas!')
                    }
                    className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-black transition-colors"
                  >
                    Salvar Configurações
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-900">Nova Cobrança</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateBilling} className="p-6 space-y-5">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    Nome do Cliente
                  </span>
                  <input
                    type="text"
                    required
                    value={newBilling.tenantName}
                    onChange={(e) =>
                      setNewBilling({
                        ...newBilling,
                        tenantName: e.target.value,
                      })
                    }
                    className="mt-1 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Nome do pagador"
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                      Valor (R$)
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newBilling.amount || ''}
                      onChange={(e) =>
                        setNewBilling({
                          ...newBilling,
                          amount: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="0.00"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                      Vencimento
                    </span>
                    <input
                      type="date"
                      required
                      value={newBilling.due_date}
                      onChange={(e) =>
                        setNewBilling({
                          ...newBilling,
                          due_date: e.target.value,
                        })
                      }
                      className="mt-1 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    Descrição / Referência
                  </span>
                  <input
                    type="text"
                    value={newBilling.description}
                    onChange={(e) =>
                      setNewBilling({
                        ...newBilling,
                        description: e.target.value,
                      })
                    }
                    className="mt-1 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Ex: Aluguel Ref. 05/2023"
                  />
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                >
                  Gerar Boleto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-900">Nova Despesa</h3>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateExpense} className="p-6 space-y-4">
              <label className="block">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Fornecedor</span>
                <input
                  type="text"
                  required
                  value={newExpense.provider_name}
                  onChange={(e) => setNewExpense({ ...newExpense, provider_name: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  placeholder="Ex: Energia, Manutenção, Condomínio"
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Valor (R$)</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newExpense.amount || ''}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                    className="mt-1 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Vencimento</span>
                  <input
                    type="date"
                    required
                    value={newExpense.due_date}
                    onChange={(e) => setNewExpense({ ...newExpense, due_date: e.target.value })}
                    className="mt-1 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Categoria</span>
                <input
                  type="text"
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </label>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary text-white font-bold text-sm rounded-xl"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedBilling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Detalhes da Cobrança</h3>
              <button
                onClick={() => setSelectedBilling(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Cliente:</strong> {selectedBilling.contract?.tenant_name || 'Cobrança avulsa'}</p>
              <p><strong>Valor:</strong> {cobrancaService.formatCurrency(selectedBilling.amount || 0)}</p>
              <p><strong>Vencimento:</strong> {selectedBilling.due_date ? new Date(selectedBilling.due_date).toLocaleDateString('pt-BR') : '-'}</p>
              <p><strong>Status:</strong> {selectedBilling.status || 'aberto'}</p>
              {selectedBilling.pix_code && (
                <div className="rounded-xl bg-slate-50 p-3 text-xs">
                  <p className="font-bold mb-1">PIX Copia e Cola:</p>
                  <code className="break-all">{selectedBilling.pix_code}</code>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {selectedBilling.invoice_url && (
                <a
                  href={selectedBilling.invoice_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                >
                  Abrir Fatura / Boleto
                </a>
              )}
              <button
                type="button"
                onClick={async () => {
                  if (!selectedBilling.id) return;
                  await cobrancaService.registerPayment(selectedBilling.id, {
                    data_pagamento: new Date().toISOString().slice(0, 10),
                    valor_pago: selectedBilling.amount,
                  });
                  toast.success('Pagamento registrado!');
                  setSelectedBilling(null);
                  await loadData();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                Registrar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
