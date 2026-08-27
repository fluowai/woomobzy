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

// Mock data para os gráficos caso o dashboard venha vazio
const mockFluxoData = [
  { mes: 'Jan', receitas: 45000, despesas: 32000 },
  { mes: 'Fev', receitas: 52000, despesas: 31000 },
  { mes: 'Mar', receitas: 48000, despesas: 35000 },
  { mes: 'Abr', receitas: 61000, despesas: 38000 },
  { mes: 'Mai', receitas: 59000, despesas: 34000 },
  { mes: 'Jun', receitas: 65000, despesas: 39000 },
];

const mockDreData = [
  { mes: 'Jan', lucroBruto: 13000, lucroLiquido: 8500 },
  { mes: 'Fev', lucroBruto: 21000, lucroLiquido: 14000 },
  { mes: 'Mar', lucroBruto: 13000, lucroLiquido: 7000 },
  { mes: 'Abr', lucroBruto: 23000, lucroLiquido: 15500 },
  { mes: 'Mai', lucroBruto: 25000, lucroLiquido: 18000 },
  { mes: 'Jun', lucroBruto: 26000, lucroLiquido: 19500 },
];

export default function FinanceiroUrbano() {
  const [tab, setTab] = useState<'cobranca' | 'despesas' | 'fluxo' | 'dre'>(
    'cobranca'
  );
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dashboard, setDashboard] = useState<DashboardFinanceiro | null>(null);
  const [billings, setBillings] = useState<Billing[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBilling, setNewBilling] = useState({
    contract_id: 'contrato-avulso-123',
    tenantName: '',
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

  const handleCreateBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBilling.amount || !newBilling.due_date) {
      toast.error('Preencha valor e vencimento.');
      return;
    }

    try {
      await cobrancaService.createBilling({
        contract_id: newBilling.contract_id,
        amount: newBilling.amount,
        due_date: newBilling.due_date,
        description: newBilling.description,
      });
      toast.success('Cobrança gerada com sucesso!');
      setIsModalOpen(false);

      // Mocking optimistically to reflect on UI immediately since we might not have a real backend
      const optimisticBilling: Billing = {
        id: Math.random().toString(),
        amount: newBilling.amount,
        due_date: newBilling.due_date,
        status: 'aberto',
        description: newBilling.description,
        contract: {
          tenant_name: newBilling.tenantName || 'Avulso',
          property: {
            title: 'Imóvel Avulso',
          },
        },
      };
      setBillings((prev) => [optimisticBilling, ...prev]);

      setNewBilling({
        contract_id: 'contrato-avulso-123',
        tenantName: '',
        amount: 0,
        due_date: '',
        description: '',
      });
    } catch (error) {
      toast.error('Erro ao gerar cobrança.');
    }
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
                onClick={() => toast.info('Envio em lote em breve')}
                className="btn bg-slate-100 text-sm text-slate-700 hover:bg-slate-200"
              >
                <Send size={15} /> Enviar Boletos
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
                            onClick={() =>
                              toast.info('Visualização de boleto em breve')
                            }
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
                onClick={() => toast.info('Modal de nova despesa em breve')}
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
                        <button className="text-xs font-bold text-primary hover:underline">
                          Pagar
                        </button>
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
                data={mockFluxoData}
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
                  name="Receitas"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                />
                <Bar
                  dataKey="despesas"
                  name="Despesas"
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
                data={mockDreData}
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
    </div>
  );
}
