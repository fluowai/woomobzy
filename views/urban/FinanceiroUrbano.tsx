import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart2,
  CheckCircle,
  CreditCard,
  DollarSign,
  Send,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  cobrancaService,
  type Billing,
  type DashboardFinanceiro,
} from '../../services/cobrancaService';

const statusColors: Record<string, string> = {
  pago: 'bg-green-100 text-green-700',
  aberto: 'bg-blue-100 text-blue-700',
  vencido: 'bg-red-100 text-red-700',
  cancelado: 'bg-slate-100 text-slate-600',
};

export default function FinanceiroUrbano() {
  const [tab, setTab] = useState<'cobranca' | 'fluxo' | 'dre'>('cobranca');
  const [dashboard, setDashboard] = useState<DashboardFinanceiro | null>(null);
  const [billings, setBillings] = useState<Billing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [dashboardData, billingData] = await Promise.all([
        cobrancaService.getDashboard(),
        cobrancaService.listBillings({ ano: new Date().getFullYear() }),
      ]);
      setDashboard(dashboardData);
      setBillings(billingData || []);
      setLoading(false);
    };

    load();
  }, []);

  const resumo = useMemo(
    () => [
      {
        label: 'A Receber (Mes)',
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
        label: 'Inadimplencia',
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

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="h1 flex items-center gap-3 text-slate-900">
          <DollarSign className="text-primary" size={32} />
          Financeiro &amp; ERP
        </h1>
        <p className="body mt-1 text-slate-500">
          Cobranca, fluxo de caixa, repasses e gestao de inadimplencia.
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

      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: 'cobranca', label: 'Cobrancas / Boletos', icon: CreditCard },
          { id: 'fluxo', label: 'Fluxo de Caixa', icon: BarChart2 },
          { id: 'dre', label: 'DRE', icon: TrendingUp },
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
            <h2 className="font-bold text-slate-900">Cobrancas do periodo</h2>
            <div className="flex gap-2">
              <button className="btn bg-slate-100 text-sm text-slate-700">
                <Send size={15} /> Enviar Boletos
              </button>
              <button className="btn btn-primary text-sm">
                + Gerar Cobranca
              </button>
            </div>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {[
                  'Cliente',
                  'Imovel',
                  'Vencimento',
                  'Valor',
                  'Status',
                  'Acao',
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
                    Nenhuma cobranca encontrada.
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
                        ? new Date(billing.due_date).toLocaleDateString('pt-BR')
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
                        <button className="text-xs font-bold text-primary hover:underline">
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
      )}

      {(tab === 'fluxo' || tab === 'dre') && (
        <div className="card-premium p-16 text-center">
          {tab === 'fluxo' ? (
            <BarChart2 size={48} className="mx-auto mb-4 text-slate-200" />
          ) : (
            <TrendingDown size={48} className="mx-auto mb-4 text-slate-200" />
          )}
          <h3 className="text-xl font-bold text-slate-400">
            {tab === 'fluxo'
              ? 'Fluxo de Caixa'
              : 'DRE - Demonstrativo de Resultados'}
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            Base financeira conectada. A visualizacao analitica pode evoluir com
            centros de custo e repasses.
          </p>
        </div>
      )}
    </div>
  );
}
