import { logger } from '@/utils/logger';
import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Users as UsersIcon,
  ShieldCheck,
  ArrowUpRight,
  Wheat,
  Activity,
  Target,
  Briefcase,
  MapPin,
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
  const [ruralProperties, setRuralProperties] = useState<any[]>([]);
  const [leadCount, setLeadCount] = useState(0);
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

        setRuralProperties((propertyRows || []).filter(isRuralProperty));
        setLeadCount(lCount || 0);
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

  const kpis = [
    {
      label: 'Propriedades',
      value: loading ? '—' : String(propertyCount),
      change: 'Rural',
      icon: Wheat,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10 border-primary/20',
    },
    {
      label: 'Investidores',
      value: loading ? '—' : String(leadCount),
      change: 'Ativos',
      icon: UsersIcon,
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      label: 'Due Diligence',
      value: loading ? '—' : String(pendingDueDiligence),
      change: 'Pendentes',
      icon: ShieldCheck,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Negócios (Mês)',
      value: loading ? '—' : formatCurrency(monthlyPortfolioValue),
      change: 'Carteira',
      icon: TrendingUp,
      iconColor: 'text-teal-400',
      iconBg: 'bg-teal-500/10 border-teal-500/20',
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
    'gestor';

  const tooltipStyle = {
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-premium)',
    color: 'var(--color-text-primary)',
    fontSize: '12px',
  };

  const quickActions = [
    {
      icon: Activity,
      label: 'Análise Fundiária',
      desc: 'Sincronizar dados do CAR/SIGEF',
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10 border-primary/20',
    },
    {
      icon: Target,
      label: 'Inteligência Comercial',
      desc: 'Mapa de calor de investidores',
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      icon: Briefcase,
      label: 'Novo Prospecto',
      desc: 'Criar apresentação personalizada',
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/20',
    },
  ];

  return (
    <div className="workspace-page space-y-5">
      <div className="animate-fade-in flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-primary/5 rounded-xl border border-primary/10">
            <MapPin className="text-primary" size={24} />
          </span>
          <div>
            <p className="workspace-eyebrow">Dashboard Rural</p>
            <h1 className="workspace-title">Seja bem-vindo, {displayName}</h1>
          </div>
        </div>
        <p className="workspace-subtitle ml-14">
          Gerenciamento de ativos e performance comercial.
        </p>
      </div>

      <IADashboardSummary />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="workspace-card workspace-card-hover p-5 animate-slide-up"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl border ${kpi.iconBg}`}>
                <kpi.icon size={20} className={kpi.iconColor} />
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                {kpi.change}
                <ArrowUpRight size={13} />
              </div>
            </div>
            <p className="text-tiny font-medium text-text-tertiary uppercase tracking-widest mb-1">
              {kpi.label}
            </p>
            <h2 className="h2 text-3xl font-bold text-text-primary tracking-tight mb-0">
              {kpi.value}
            </h2>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div
          className="lg:col-span-2 workspace-card p-5 animate-slide-up"
          style={{ animationDelay: '400ms' }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="h3 mb-1">Volume de Negociações</h3>
              <p className="text-small text-text-tertiary">
                Variação mensal de captação em milhões (R$)
              </p>
            </div>
            <select className="select-field w-auto min-w-[160px]">
              <option>Últimos 6 meses</option>
              <option>Este ano</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="colorValRural"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--color-primary)"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-border-subtle)"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
                  dy={12}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="valor"
                  name="Negócios (M)"
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorValRural)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions + Goal */}
        <div className="space-y-5">
          {/* Quick Actions */}
          <div className="workspace-card p-5">
            <h3 className="text-xs font-semibold text-text-tertiary mb-4 uppercase tracking-widest">
              Ações Estratégicas
            </h3>
            <div className="space-y-2">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-bg-hover transition-all group text-left border border-transparent hover:border-border-subtle"
                >
                  <div
                    className={`p-2 rounded-lg border ${action.iconBg} transition-all`}
                  >
                    <action.icon size={16} className={action.iconColor} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {action.label}
                    </p>
                    <p className="text-[11px] text-text-tertiary">
                      {action.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Goal Card */}
          <div className="bg-primary/10 border border-primary/20 p-5 rounded-2xl">
            <h3 className="text-xs font-semibold text-text-tertiary mb-4 uppercase tracking-widest">
              Meta de Captação
            </h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-text-primary">
                R$ 12.5M / R$ 15M
              </span>
              <span className="text-xs font-bold text-primary">82%</span>
            </div>
            <div className="w-full h-2 bg-bg-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-1000"
                style={{ width: '82%' }}
              />
            </div>
            <p className="mt-4 text-[11px] text-text-secondary leading-relaxed">
              Você está a apenas{' '}
              <strong className="text-primary">R$ 2.5M</strong> da meta
              trimestral. Mantenha o foco em grandes ativos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuralDashboard;
