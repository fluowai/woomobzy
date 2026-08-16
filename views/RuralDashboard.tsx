import { logger } from '@/utils/logger';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Users as UsersIcon,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Wheat,
  Activity,
  Target,
  Briefcase,
  Trees,
  Sprout,
} from 'lucide-react';
import IADashboardSummary from '../components/IADashboardSummary';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { isRuralProperty } from '../utils/propertyNiche';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

const RuralDashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [ruralProperties, setRuralProperties] = useState<any[]>([]);
  const [leadCount, setLeadCount] = useState(0);
  const [leadDelta, setLeadDelta] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.organization_id) return;

    const loadData = async () => {
      try {
        const { data: propertyRows } = await supabase
          .from('properties')
          .select(
            'id, property_type, niche, price, status, total_area_ha, features, created_at'
          )
          .eq('organization_id', profile.organization_id);

        const { count: lCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id);

        const now = new Date();
        const currentMonthStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        ).toISOString();
        const previousMonthStart = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1
        ).toISOString();

        const [{ count: currentMonthLeads }, { count: previousMonthLeads }] =
          await Promise.all([
            supabase
              .from('leads')
              .select('*', { count: 'exact', head: true })
              .eq('organization_id', profile.organization_id)
              .gte('created_at', currentMonthStart),
            supabase
              .from('leads')
              .select('*', { count: 'exact', head: true })
              .eq('organization_id', profile.organization_id)
              .gte('created_at', previousMonthStart)
              .lt('created_at', currentMonthStart),
          ]);

        const prevCount = previousMonthLeads || 0;
        const delta =
          prevCount > 0
            ? Math.round(
                (((currentMonthLeads || 0) - prevCount) / prevCount) * 100
              )
            : 0;

        setRuralProperties((propertyRows || []).filter(isRuralProperty));
        setLeadCount(lCount || 0);
        setLeadDelta(delta);
      } catch (err) {
        logger.error('Loader error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [profile?.organization_id]);

  const propertyCount = ruralProperties.length;
  const pendingDueDiligence = ruralProperties.filter((property) => {
    const validation = property.features?.rural_due_diligence?.validation;
    return !validation || Number(validation.riskScore || 0) < 80;
  }).length;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyPortfolioValue = ruralProperties
    .filter((property) => {
      const createdAt = property.created_at
        ? new Date(property.created_at)
        : null;
      return (
        createdAt &&
        createdAt.getMonth() === currentMonth &&
        createdAt.getFullYear() === currentYear
      );
    })
    .reduce((sum, property) => sum + Number(property.price || 0), 0);
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);

  const currentQuarterStart = (() => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    return new Date(now.getFullYear(), quarter * 3, 1);
  })();

  const previousQuarterStart = (() => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    return new Date(now.getFullYear(), quarter * 3 - 3, 1);
  })();

  const capturedThisQuarter = ruralProperties
    .filter((property) => {
      const createdAt = property.created_at
        ? new Date(property.created_at)
        : null;
      return createdAt && createdAt >= currentQuarterStart;
    })
    .reduce((sum, property) => sum + Number(property.price || 0), 0);

  const capturedLastQuarter = ruralProperties
    .filter((property) => {
      const createdAt = property.created_at
        ? new Date(property.created_at)
        : null;
      return (
        createdAt &&
        createdAt >= previousQuarterStart &&
        createdAt < currentQuarterStart
      );
    })
    .reduce((sum, property) => sum + Number(property.price || 0), 0);

  const quarterTarget =
    capturedLastQuarter > 0
      ? capturedLastQuarter * 1.25
      : capturedThisQuarter || 1;

  const goalProgress = Math.min(
    100,
    Math.round((capturedThisQuarter / quarterTarget) * 100)
  );

  const kpis = [
    {
      label: 'Propriedades Rurais',
      value: loading ? '—' : String(propertyCount),
      change: 'Fazendas',
      trend: 'neutral' as const,
      icon: Wheat,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Investidores Ativos',
      value: loading ? '—' : String(leadCount),
      change: `${leadDelta > 0 ? '+' : ''}${leadDelta}%`,
      trend: leadDelta >= 0 ? 'up' : 'down',
      icon: UsersIcon,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Due Diligence Pend.',
      value: loading ? '—' : String(pendingDueDiligence),
      change: 'Análise',
      trend: 'neutral',
      icon: ShieldCheck,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Volume Adicionado (Mês)',
      value: loading ? '—' : formatCurrency(monthlyPortfolioValue),
      change: 'Em VGV',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
  ];

  const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
  const chartData = Array.from({ length: 6 }, (_, offset) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - offset));
    const value = ruralProperties
      .filter((property) => {
        const createdAt = property.created_at
          ? new Date(property.created_at)
          : null;
        return (
          createdAt &&
          createdAt.getMonth() === date.getMonth() &&
          createdAt.getFullYear() === date.getFullYear()
        );
      })
      .reduce((sum, property) => sum + Number(property.price || 0), 0);

    return {
      name: monthFormatter.format(date).replace('.', ''),
      valor: Number((value / 1_000_000).toFixed(2)),
    };
  });

  const displayName =
    profile?.full_name ||
    (profile as any)?.name ||
    profile?.organization?.name ||
    'Gestor';

  const tooltipStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
    color: '#1e293b',
    fontSize: '12px',
    fontWeight: '500' as const,
  };

  const quickActions = [
    {
      icon: Activity,
      label: 'Análise Fundiária',
      desc: 'Sincronizar dados do CAR/SIGEF',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      path: '/rural/territorio/due-diligence',
    },
    {
      icon: Target,
      label: 'Inteligência Comercial',
      desc: 'Mapa de calor de investidores',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
      path: '/rural/portal-comprador',
    },
    {
      icon: Briefcase,
      label: 'Novo Prospecto',
      desc: 'Criar apresentação personalizada',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      path: '/rural/properties/new',
    },
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-8 pb-12 font-sans text-gray-900">
      {/* Header Premium (Rural variant) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 p-8 shadow-lg shadow-emerald-900/20">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute left-0 bottom-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold tracking-wider uppercase backdrop-blur-sm border border-white/10">
                Gestor: {displayName}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
              <Trees className="text-emerald-400" size={36} />
              Dashboard Rural
            </h1>
            <p className="text-emerald-100 mt-2 text-sm md:text-base max-w-xl">
              Gerenciamento de grandes áreas, compliance fundiário e performance
              comercial de fazendas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/rural/properties/new')}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2"
            >
              <Sprout size={18} /> Nova Captação
            </button>
          </div>
        </div>
      </div>

      <IADashboardSummary />

      {/* Premium Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="group relative bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-default hover:-translate-y-1"
          >
            {/* Background Icon */}
            <kpi.icon
              className={`absolute -right-6 -bottom-6 w-32 h-32 opacity-[0.03] transform group-hover:scale-110 transition-transform duration-500 ${kpi.color}`}
            />

            <div className="flex items-start justify-between mb-4 relative z-10">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${kpi.bg} ${kpi.color}`}
              >
                <kpi.icon size={24} />
              </div>

              {kpi.trend !== 'neutral' && (
                <div
                  className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${kpi.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}
                >
                  {kpi.trend === 'up' ? (
                    <ArrowUpRight size={14} />
                  ) : (
                    <ArrowDownRight size={14} />
                  )}
                  {kpi.change}
                </div>
              )}
            </div>

            <div className="relative z-10">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                {kpi.label}
              </p>
              <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {kpi.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Volume de Negociações
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Variação mensal de captação em milhões (R$)
              </p>
            </div>
            <select className="bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium">
              <option>Últimos 6 meses</option>
              <option>Este ano</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="colorValRural"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{
                    stroke: '#e2e8f0',
                    strokeWidth: 1,
                    strokeDasharray: '4 4',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="valor"
                  name="Negócios (M)"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorValRural)"
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions + Goal */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 mb-5 uppercase tracking-widest">
              Ações Estratégicas
            </h3>
            <div className="space-y-3">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(action.path)}
                  className={`flex items-center gap-4 w-full p-4 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 hover:shadow-sm transition-all group text-left`}
                >
                  <div
                    className={`p-2.5 rounded-xl border ${action.bg} ${action.border} transition-transform group-hover:scale-110`}
                  >
                    <action.icon size={20} className={action.color} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                      {action.label}
                    </p>
                    <p className="text-[11px] font-medium text-gray-500 mt-0.5">
                      {action.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Goal Card */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 p-6 rounded-2xl shadow-lg relative overflow-hidden text-white">
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl translate-x-1/3 translate-y-1/3"></div>
            <div className="relative z-10">
              <h3 className="text-[11px] font-bold text-gray-400 mb-4 uppercase tracking-widest">
                Meta de Captação do Trimestre
              </h3>
              <div className="flex items-end justify-between mb-3">
                <span className="text-lg font-bold text-white">
                  {formatCurrency(capturedThisQuarter)}{' '}
                  <span className="text-sm font-medium text-gray-400">
                    / {formatCurrency(quarterTarget)}
                  </span>
                </span>
                <span className="text-sm font-bold text-emerald-400">
                  {goalProgress}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-700/50 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-300 font-medium leading-relaxed">
                {capturedLastQuarter > 0 ? (
                  <>
                    Você captou{' '}
                    <strong className="text-emerald-400">
                      {formatCurrency(capturedThisQuarter)}
                    </strong>{' '}
                    no trimestre (
                    {Math.round((capturedThisQuarter / quarterTarget) * 100)}%
                    da meta), meta calculada sobre o trimestre anterior.
                  </>
                ) : (
                  <>
                    Sem captação no trimestre anterior para referência. Este é o
                    volume acumulado em grandes ativos no trimestre atual.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuralDashboard;
