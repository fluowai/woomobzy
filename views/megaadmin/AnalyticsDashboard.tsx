import { logger } from '@/utils/logger';
import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Users,
  Building2,
  Home,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Calendar,
  Activity,
  Globe,
  FileText,
  Zap,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = [
  '#2563eb',
  '#7c3aed',
  '#059669',
  '#d97706',
  '#dc2626',
  '#64748b',
];

const AnalyticsDashboard: React.FC = () => {
  const [tenantCount, setTenantCount] = useState(0);
  const [propertyCount, setPropertyCount] = useState(0);
  const [leadCount, setLeadCount] = useState(0);
  const [period, setPeriod] = useState('30d');
  const [organizations, setOrganizations] = useState<
    Array<{ created_at: string; niche?: string | null }>
  >([]);
  const [propertyDates, setPropertyDates] = useState<
    Array<{ created_at: string }>
  >([]);
  const [leadDates, setLeadDates] = useState<Array<{ created_at: string }>>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const load = async () => {
      const days = Number.parseInt(period, 10);
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const [tenants, properties, leads, orgRows, propertyRows, leadRows] =
        await Promise.all([
          supabase
            .from('organizations')
            .select('id', { count: 'exact', head: true }),
          supabase
            .from('properties')
            .select('id', { count: 'exact', head: true }),
          supabase.from('leads').select('id', { count: 'exact', head: true }),
          supabase
            .from('organizations')
            .select('created_at,niche')
            .gte('created_at', since),
          supabase
            .from('properties')
            .select('created_at')
            .gte('created_at', since),
          supabase.from('leads').select('created_at').gte('created_at', since),
        ]);
      const firstError =
        tenants.error ||
        properties.error ||
        leads.error ||
        orgRows.error ||
        propertyRows.error ||
        leadRows.error;
      if (firstError) {
        logger.error('Erro ao carregar analytics reais', firstError);
        setLoadError('Não foi possível carregar todas as métricas reais.');
      } else {
        setLoadError('');
      }
      setTenantCount(tenants.count || 0);
      setPropertyCount(properties.count || 0);
      setLeadCount(leads.count || 0);
      setOrganizations(orgRows.data || []);
      setPropertyDates(propertyRows.data || []);
      setLeadDates(leadRows.data || []);
    };
    load();
  }, [period]);

  const growthData = useMemo(() => {
    const rows = new Map<
      string,
      { name: string; tenants: number; properties: number; leads: number }
    >();
    const add = (date: string, key: 'tenants' | 'properties' | 'leads') => {
      const name = new Date(date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });
      const row = rows.get(name) || {
        name,
        tenants: 0,
        properties: 0,
        leads: 0,
      };
      row[key] += 1;
      rows.set(name, row);
    };
    organizations.forEach((item) => add(item.created_at, 'tenants'));
    propertyDates.forEach((item) => add(item.created_at, 'properties'));
    leadDates.forEach((item) => add(item.created_at, 'leads'));
    return [...rows.values()];
  }, [organizations, propertyDates, leadDates]);

  const nicheData = useMemo(() => {
    const counts = new Map<string, number>();
    organizations.forEach((item) => {
      const label = item.niche?.trim() || 'Não informado';
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return [...counts].map(([name, value]) => ({ name, value }));
  }, [organizations]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <BarChart3 className="text-indigo-600" size={28} />
            Analytics & Métricas
          </h1>
          <p className="text-gray-500 mt-1">
            Visão global da plataforma: crescimento, engajamento e KPIs.
          </p>
        </div>
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${period === p ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-200'}`}
            >
              {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            icon: Building2,
            label: 'Tenants',
            value: String(tenantCount),
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            icon: Home,
            label: 'Imóveis',
            value: String(propertyCount),
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            icon: Users,
            label: 'Leads',
            value: String(leadCount),
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Growth Chart + Niche Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            Crescimento da Plataforma
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="gTenants" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gProperties" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
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
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="tenants"
                  name="Tenants"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gTenants)"
                />
                <Area
                  type="monotone"
                  dataKey="properties"
                  name="Imóveis"
                  stroke="#059669"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gProperties)"
                />
                <Area
                  type="monotone"
                  dataKey="leads"
                  name="Leads"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  fillOpacity={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            Distribuição por Nicho
          </h3>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={nicheData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {nicheData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1.5">
            {nicheData.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[i] }}
                  />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-bold text-gray-800">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
        Uso de funcionalidades e MRR não são exibidos porque o sistema ainda não
        possui telemetria e faturamento consolidados para calcular esses
        indicadores com dados verificáveis.
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
