import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarDays,
  Download,
  FileSpreadsheet,
  Home,
  Inbox,
  KeyRound,
  LayoutDashboard,
  ListOrdered,
  LucideIcon,
  MapPin,
  Printer,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { logger } from '@/utils/logger';
import { isUrbanProperty, isRuralProperty } from '../utils/propertyNiche';
import { LEASE_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../src/types/lease';

type Mode = 'urban' | 'rural';
type TimeRange = '30d' | '90d' | '6m' | '1y' | 'all';
type ReportTab = 'overview' | 'commercial' | 'leads' | 'brokers' | 'rentals';

interface ReportsCenterProps {
  mode: Mode;
}

interface PropertyRow {
  id: string;
  title: string;
  price: number | null;
  status: string | null;
  property_type: string | null;
  type: string | null;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  niche: string | null;
  created_at: string | null;
  updated_at: string | null;
  views_count: number | null;
  favorites_count: number | null;
  broker_id: string | null;
  total_area_ha: number | null;
  rental_value: number | null;
  price_per_m2: number | null;
  features: Record<string, any> | null;
}

interface LeadRow {
  id: string;
  name: string;
  source: string | null;
  status: string | null;
  created_at: string | null;
  match_profile: string | null;
  preferences: Record<string, any> | null;
  budget: number | null;
  campaign: string | null;
  lead_score: number | null;
  assigned_to: string | null;
}

interface BrokerRow {
  id: string;
  name: string | null;
  role: string | null;
  email: string | null;
  creci: string | null;
  commission_rate: number | null;
}

interface LeaseContractRow {
  id: string;
  status: string | null;
  monthly_rent: number | null;
  payment_status: string | null;
  start_date: string | null;
  end_date: string | null;
  property_id: string | null;
  tenant_name: string;
  created_at: string | null;
}

const TIME_RANGES: { id: TimeRange; label: string }[] = [
  { id: '30d', label: '30 dias' },
  { id: '90d', label: '90 dias' },
  { id: '6m', label: '6 meses' },
  { id: '1y', label: '1 ano' },
  { id: 'all', label: 'Todo período' },
];

const THEMES: Record<
  Mode,
  {
    label: string;
    title: string;
    subtitle: string;
    breadcrumb: string;
    primaryText: string;
    primaryBg: string;
    primarySoft: string;
    gradient: string;
    chart: string;
    chartSoft: string;
    lightText: string;
    barSolid: string;
    barSoft: string;
  }
> = {
  urban: {
    label: 'Urbano',
    title: 'Relatórios Gerenciais',
    subtitle:
      'Inteligência comercial do portfólio urbano com dados reais: vendas, leads, corretores e locação.',
    breadcrumb: 'Urbano / Relatórios',
    primaryText: 'text-blue-600',
    primaryBg: 'bg-blue-600',
    primarySoft: 'bg-blue-50',
    gradient: 'from-blue-900 via-blue-800 to-indigo-900',
    chart: '#2563eb',
    chartSoft: '#93c5fd',
    lightText: 'text-blue-100',
    barSolid: 'bg-blue-500',
    barSoft: 'bg-blue-100',
  },
  rural: {
    label: 'Rural',
    title: 'Relatórios',
    subtitle:
      'Inteligência comercial do portfólio rural com dados reais: fazendas, leads, corretores e locação.',
    breadcrumb: 'Rural / Relatórios',
    primaryText: 'text-emerald-600',
    primaryBg: 'bg-emerald-600',
    primarySoft: 'bg-emerald-50',
    gradient: 'from-emerald-950 via-emerald-900 to-teal-900',
    chart: '#059669',
    chartSoft: '#6ee7b7',
    lightText: 'text-emerald-100',
    barSolid: 'bg-emerald-500',
    barSoft: 'bg-emerald-100',
  },
};

const PALETTE = [
  '#2563eb',
  '#10b981',
  '#f59e0b',
  '#7c3aed',
  '#0891b2',
  '#ec4899',
  '#64748b',
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value || 0);

const formatPercent = (value: number) =>
  `${(Number.isFinite(value) ? value : 0).toFixed(1)}%`;

const formatNumber = (value: number) =>
  new Intl.NumberFormat('pt-BR').format(value || 0);

const tooltipStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
  color: '#1e293b',
  fontSize: '12px',
  fontWeight: '500' as const,
};

function downloadCSV(filename: string, rows: unknown[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
        .join(';')
    )
    .join('\n');
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const statusLabel = (status: string | null, key: string): string => {
  const labelMap: Record<string, Record<string, string>> = {
    lease: LEASE_STATUS_LABELS as Record<string, string>,
    payment: PAYMENT_STATUS_LABELS as Record<string, string>,
  };
  const map = labelMap[key];
  if (map && status && map[status]) return map[status];
  return status || 'Não informado';
};

const KpiCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}> = ({ label, value, sub, icon: Icon, color, bg }) => (
  <div className="group relative bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
    <Icon
      className={`absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.04] ${color}`}
    />
    <div
      className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${bg}`}
    >
      <Icon className={color} size={22} />
    </div>
    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
      {label}
    </p>
    <p className="mt-1 text-2xl font-extrabold text-gray-900 tracking-tight">
      {value}
    </p>
    {sub && <p className="mt-1 text-xs font-medium text-gray-400">{sub}</p>}
  </div>
);

const SectionCard: React.FC<{
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, className = '', children }) => (
  <div
    className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ${className}`}
  >
    <div className="mb-6">
      <h3 className="text-base font-bold text-gray-900">{title}</h3>
      {subtitle && (
        <p className="mt-1 text-xs font-medium text-gray-500">{subtitle}</p>
      )}
    </div>
    {children}
  </div>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <Inbox size={36} className="text-gray-300 mb-3" />
    <p className="text-sm font-medium text-gray-400">{message}</p>
  </div>
);

const ProgressBar: React.FC<{ value: number; color: string }> = ({
  value,
  color,
}) => (
  <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
    <div
      className={`h-full rounded-full ${color}`}
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

const ReportsCenter: React.FC<ReportsCenterProps> = ({ mode }) => {
  const { profile } = useAuth();
  const theme = THEMES[mode];
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [brokers, setBrokers] = useState<BrokerRow[]>([]);
  const [contracts, setContracts] = useState<LeaseContractRow[]>([]);
  const [activitiesByBroker, setActivitiesByBroker] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    if (!profile?.organization_id) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.organization_id]);

  const loadData = async () => {
    if (!profile?.organization_id) return;
    try {
      setLoading(true);
      const organizationId = profile.organization_id;

      const [
        { data: props, error: propsError },
        { data: leadData, error: leadError },
        { data: brokersData, error: brokersError },
        { data: contractData, error: contractsError },
      ] = await Promise.all([
        supabase
          .from('properties')
          .select(
            'id,title,price,status,property_type,type,city,state,neighborhood,niche,created_at,updated_at,views_count,favorites_count,broker_id,total_area_ha,rental_value,price_per_m2,features'
          )
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(100000),
        supabase
          .from('leads')
          .select(
            'id,name,source,status,created_at,match_profile,preferences,budget,campaign,lead_score,assigned_to'
          )
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(100000),
        supabase
          .from('profiles')
          .select('id,name,role,email,creci,commission_rate')
          .eq('organization_id', organizationId),
        supabase
          .from('rental_contracts')
          .select(
            'id,status,monthly_rent,payment_status,start_date,end_date,property_id,tenant_name,created_at'
          )
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(100000),
      ]);

      if (propsError) logger.error('[Reports] Properties error:', propsError);
      else setProperties((props || []) as PropertyRow[]);

      if (leadError) logger.error('[Reports] Leads error:', leadError);
      else setLeads((leadData || []) as LeadRow[]);

      if (brokersError) logger.error('[Reports] Brokers error:', brokersError);
      else {
        const team = (brokersData || []) as BrokerRow[];
        setBrokers(team);

        const brokerIds = team
          .filter((b) => b.role !== 'superadmin')
          .map((b) => b.id);
        const activityResults = await Promise.all(
          brokerIds.map((id) =>
            supabase
              .from('lead_activities')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', organizationId)
              .eq('created_by', id)
          )
        );
        const counts: Record<string, number> = {};
        activityResults.forEach((res, index) => {
          counts[brokerIds[index]] = res.count || 0;
        });
        setActivitiesByBroker(counts);
      }

      if (contractsError)
        logger.error('[Reports] Contracts error:', contractsError);
      else setContracts((contractData || []) as LeaseContractRow[]);
    } catch (error) {
      logger.error('[Reports] Error loading data:', error);
      toast.error('Erro ao carregar os dados dos relatórios.');
    } finally {
      setLoading(false);
    }
  };

  const rangeStart = useMemo(() => {
    if (timeRange === 'all') return null;
    const days: Record<Exclude<TimeRange, 'all'>, number> = {
      '30d': 30,
      '90d': 90,
      '6m': 182,
      '1y': 365,
    };
    return new Date(Date.now() - days[timeRange] * 86400000);
  }, [timeRange]);

  const inRange = (dateStr?: string | null) => {
    if (!dateStr || !rangeStart) return true;
    return new Date(dateStr).getTime() >= rangeStart.getTime();
  };

  const nicheProperties = useMemo(() => {
    return properties.filter((p) =>
      mode === 'urban' ? isUrbanProperty(p) : isRuralProperty(p)
    );
  }, [properties, mode]);

  const nicheLeads = useMemo(() => {
    return leads.filter((l) => {
      if (mode === 'urban') {
        return (
          l.match_profile === 'urbano' ||
          l.match_profile === 'urban' ||
          !l.match_profile
        );
      }
      return (
        l.match_profile === 'rural' ||
        l.preferences?.niche === 'rural' ||
        l.preferences?.profile === 'rural'
      );
    });
  }, [leads, mode]);

  const propsAll = useMemo(() => nicheProperties, [nicheProperties]);
  const leadsAll = useMemo(() => nicheLeads, [nicheLeads]);
  const propsNew = useMemo(
    () => propsAll.filter((p) => inRange(p.created_at)),
    [propsAll, rangeStart] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const leadsNew = useMemo(
    () => leadsAll.filter((l) => inRange(l.created_at)),
    [leadsAll, rangeStart] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const availableProps = useMemo(
    () =>
      propsAll.filter(
        (p) => p.status === 'Disponível' || p.status === 'Disponivel'
      ),
    [propsAll]
  );
  const soldProps = useMemo(
    () => propsAll.filter((p) => p.status === 'Vendido'),
    [propsAll]
  );
  const rentedProps = useMemo(
    () => propsAll.filter((p) => p.status === 'Alugado'),
    [propsAll]
  );
  const reservedProps = useMemo(
    () => propsAll.filter((p) => p.status === 'Reservado'),
    [propsAll]
  );

  const convertedLeads = useMemo(
    () => leadsAll.filter((l) => l.status === 'Fechado'),
    [leadsAll]
  );
  const lostLeads = useMemo(
    () => leadsAll.filter((l) => l.status === 'Perdido'),
    [leadsAll]
  );

  const vgvPortfolio = useMemo(
    () => propsAll.reduce((sum, p) => sum + (p.price || 0), 0),
    [propsAll]
  );
  const vgvAvailable = useMemo(
    () => availableProps.reduce((sum, p) => sum + (p.price || 0), 0),
    [availableProps]
  );
  const vgvSold = useMemo(
    () => soldProps.reduce((sum, p) => sum + (p.price || 0), 0),
    [soldProps]
  );

  const avgTicket = useMemo(
    () => (availableProps.length ? vgvAvailable / availableProps.length : 0),
    [availableProps, vgvAvailable]
  );
  const avgTicketSold = useMemo(
    () => (soldProps.length ? vgvSold / soldProps.length : 0),
    [soldProps, vgvSold]
  );
  const conversionRate = useMemo(
    () =>
      leadsAll.length ? (convertedLeads.length / leadsAll.length) * 100 : 0,
    [leadsAll, convertedLeads]
  );
  const avgBudget = useMemo(
    () =>
      leadsAll.length
        ? leadsAll.reduce((sum, l) => sum + (l.budget || 0), 0) /
          leadsAll.length
        : 0,
    [leadsAll]
  );

  const avgDaysOnMarket = useMemo(() => {
    if (!availableProps.length) return 0;
    const now = Date.now();
    const total = availableProps.reduce((acc, p) => {
      const created = p.created_at ? new Date(p.created_at).getTime() : now;
      return acc + Math.max(0, Math.floor((now - created) / 86400000));
    }, 0);
    return Math.round(total / availableProps.length);
  }, [availableProps]);

  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    propsAll.forEach((p) => {
      const type = p.property_type || p.type || 'Sem tipo';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [propsAll]);

  const avgPriceByType = useMemo(() => {
    const totals: Record<string, { sum: number; count: number }> = {};
    propsAll.forEach((p) => {
      const type = p.property_type || p.type || 'Sem tipo';
      if (!totals[type]) totals[type] = { sum: 0, count: 0 };
      totals[type].sum += p.price || 0;
      totals[type].count += 1;
    });
    return Object.entries(totals)
      .map(([name, value]) => ({
        name,
        value: value.count ? Math.round(value.sum / value.count) : 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [propsAll]);

  const regionData = useMemo(() => {
    const totals: Record<string, number> = {};
    propsAll.forEach((p) => {
      const region =
        mode === 'rural' ? p.state || 'Não informado' : p.city || 'Sem cidade';
      totals[region] = (totals[region] || 0) + (p.price || 0);
    });
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [propsAll, mode]);

  const statusInventory = useMemo(() => {
    const order = [
      'Disponível',
      'Reservado',
      'Vendido',
      'Alugado',
      'Indisponível',
      'Pendente',
    ];
    const counts: Record<string, number> = {};
    const values: Record<string, number> = {};
    propsAll.forEach((p) => {
      const status = p.status || 'Sem status';
      counts[status] = (counts[status] || 0) + 1;
      values[status] = (values[status] || 0) + (p.price || 0);
    });
    const list = Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      value: values[name] || 0,
    }));
    const sorted = [...list].sort((a, b) => {
      const ai = order.indexOf(a.name);
      const bi = order.indexOf(b.name);
      if (ai === -1 && bi === -1) return b.count - a.count;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return sorted;
  }, [propsAll]);

  const leadSourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    leadsAll.forEach((l) => {
      const source = l.source || 'Não informado';
      counts[source] = (counts[source] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [leadsAll]);

  const leadCampaignData = useMemo(() => {
    const counts: Record<string, number> = {};
    leadsAll.forEach((l) => {
      const campaign = l.campaign || 'Sem campanha';
      counts[campaign] = (counts[campaign] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [leadsAll]);

  const leadFunnelData = useMemo(() => {
    const counts: Record<string, number> = {};
    leadsAll.forEach((l) => {
      const status = l.status || 'Novo';
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [leadsAll]);

  const leadConversionBySource = useMemo(() => {
    const rows: Record<
      string,
      { source: string; total: number; converted: number; budget: number }
    > = {};
    leadsAll.forEach((l) => {
      const source = l.source || 'Não informado';
      if (!rows[source])
        rows[source] = { source, total: 0, converted: 0, budget: 0 };
      rows[source].total++;
      if (l.status === 'Fechado') rows[source].converted++;
      rows[source].budget += l.budget || 0;
    });
    return Object.values(rows)
      .map((r) => ({
        ...r,
        rate: r.total ? (r.converted / r.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [leadsAll]);

  const evolutionData = useMemo(() => {
    const months: {
      key: string;
      label: string;
      captacoes: number;
      leads: number;
      vendas: number;
    }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: new Intl.DateTimeFormat('pt-BR', { month: 'short' })
          .format(d)
          .replace('.', ''),
        captacoes: 0,
        leads: 0,
        vendas: 0,
      });
    }
    propsAll.forEach((p) => {
      if (!p.created_at) return;
      const d = new Date(p.created_at);
      const month = months.find(
        (m) => m.key === `${d.getFullYear()}-${d.getMonth()}`
      );
      if (month) month.captacoes++;
      if (p.status === 'Vendido' && p.updated_at) {
        const ud = new Date(p.updated_at);
        const saleMonth = months.find(
          (m) => m.key === `${ud.getFullYear()}-${ud.getMonth()}`
        );
        if (saleMonth) saleMonth.vendas++;
      }
    });
    leadsAll.forEach((l) => {
      if (!l.created_at) return;
      const d = new Date(l.created_at);
      const month = months.find(
        (m) => m.key === `${d.getFullYear()}-${d.getMonth()}`
      );
      if (month) month.leads++;
    });
    return months;
  }, [propsAll, leadsAll]);

  const brokerStats = useMemo(() => {
    const byId = new Map<
      string,
      {
        broker: BrokerRow;
        leads: number;
        converted: number;
        lost: number;
        budget: number;
        captured: number;
        activities: number;
      }
    >();
    brokers
      .filter((b) => b.role !== 'superadmin')
      .forEach((b) => {
        byId.set(b.id, {
          broker: b,
          leads: 0,
          converted: 0,
          lost: 0,
          budget: 0,
          captured: 0,
          activities: activitiesByBroker[b.id] || 0,
        });
      });
    leadsAll.forEach((l) => {
      if (!l.assigned_to) return;
      const stats = byId.get(l.assigned_to);
      if (!stats) return;
      stats.leads++;
      if (l.status === 'Fechado') stats.converted++;
      if (l.status === 'Perdido') stats.lost++;
      stats.budget += l.budget || 0;
    });
    propsAll.forEach((p) => {
      if (!p.broker_id) return;
      const stats = byId.get(p.broker_id);
      if (stats) stats.captured++;
    });
    return [...byId.values()]
      .filter((s) => s.leads > 0 || s.captured > 0 || s.activities > 0)
      .map((s) => ({
        ...s,
        rate: s.leads ? (s.converted / s.leads) * 100 : 0,
      }))
      .sort(
        (a, b) =>
          b.converted - a.converted ||
          b.leads - a.leads ||
          b.activities - a.activities
      );
  }, [brokers, leadsAll, propsAll, activitiesByBroker]);

  const totalTeamActivities = useMemo(
    () => brokerStats.reduce((sum, s) => sum + s.activities, 0),
    [brokerStats]
  );

  const leaseStats = useMemo(() => {
    const active = contracts.filter((c) => c.status === 'active');
    const mrr = active.reduce((sum, c) => sum + (c.monthly_rent || 0), 0);
    const expiring90 = contracts.filter((c) => {
      if (!c.end_date) return false;
      const diff = new Date(c.end_date).getTime() - Date.now();
      return diff > 0 && diff <= 90 * 86400000;
    });
    const byPayment: Record<string, { count: number; value: number }> = {};
    contracts.forEach((c) => {
      const key = c.payment_status || 'nao_informado';
      if (!byPayment[key]) byPayment[key] = { count: 0, value: 0 };
      byPayment[key].count++;
      byPayment[key].value += c.monthly_rent || 0;
    });
    const byStatus: Record<string, number> = {};
    contracts.forEach((c) => {
      const key = c.status || 'nao_informado';
      byStatus[key] = (byStatus[key] || 0) + 1;
    });
    return {
      active: active.length,
      mrr,
      expiring90: expiring90.length,
      byPayment,
      byStatus,
      upcoming: expiring90
        .map((c) => ({
          ...c,
          daysUntil: Math.ceil(
            (new Date(c.end_date!).getTime() - Date.now()) / 86400000
          ),
        }))
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, 10),
    };
  }, [contracts]);

  const topProperties = useMemo(() => {
    return [...propsAll]
      .map((p) => ({
        ...p,
        engagement: (p.views_count || 0) + (p.favorites_count || 0) * 3,
      }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 8);
  }, [propsAll]);

  const exportCurrentCSV = () => {
    const date = new Date().toISOString().slice(0, 10);
    const baseName = `relatorio-${mode}-${activeTab}-${date}`;
    let rows: unknown[][];

    switch (activeTab) {
      case 'commercial':
        rows = [
          [
            'Imóvel',
            'Tipo',
            'Cidade',
            'UF',
            'Status',
            'Preço',
            'Views',
            'Favoritos',
            'Criado em',
          ],
          ...propsAll.map((p) => [
            p.title,
            p.property_type || p.type || '',
            p.city || '',
            p.state || '',
            p.status || '',
            p.price || 0,
            p.views_count || 0,
            p.favorites_count || 0,
            p.created_at || '',
          ]),
        ];
        break;
      case 'leads':
        rows = [
          ['Nome', 'Canal', 'Campanha', 'Status', 'Budget', 'Score', 'Data'],
          ...leadsAll.map((l) => [
            l.name,
            l.source || '',
            l.campaign || '',
            l.status || '',
            l.budget || 0,
            l.lead_score || 0,
            l.created_at || '',
          ]),
        ];
        break;
      case 'brokers':
        rows = [
          [
            'Corretor',
            'CRECI',
            'Leads',
            'Captações',
            'Conversões',
            'Perdidos',
            'Taxa (%)',
            'Budget',
            'Atividades',
          ],
          ...brokerStats.map((s) => [
            s.broker.name || s.broker.email || 'Sem nome',
            s.broker.creci || '',
            s.leads,
            s.captured,
            s.converted,
            s.lost,
            s.rate.toFixed(1),
            s.budget,
            s.activities,
          ]),
        ];
        break;
      case 'rentals':
        rows = [
          [
            'Locatário',
            'Status',
            'Aluguel Mensal',
            'Pagamento',
            'Início',
            'Término',
            'Imóvel',
          ],
          ...contracts.map((c) => [
            c.tenant_name,
            statusLabel(c.status, 'lease'),
            c.monthly_rent || 0,
            statusLabel(c.payment_status, 'payment'),
            c.start_date || '',
            c.end_date || '',
            c.property_id || '',
          ]),
        ];
        break;
      default:
        rows = [
          ['Categoria', 'Nome', 'Valor', 'Data'],
          ...propsAll.map((p) => [
            'Imóvel',
            p.title,
            p.price || 0,
            p.created_at || '',
          ]),
          ...leadsAll.map((l) => [
            'Lead',
            l.name,
            l.budget || 0,
            l.created_at || '',
          ]),
          ...contracts.map((c) => [
            'Contrato',
            c.tenant_name,
            c.monthly_rent || 0,
            c.created_at || '',
          ]),
        ];
        break;
    }
    downloadCSV(`${baseName}.csv`, rows);
    toast.success('Relatório exportado em CSV.');
  };

  const exportFullCSV = () => {
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(`relatorio-completo-${mode}-${date}.csv`, [
      ['Categoria', 'Nome', 'Tipo', 'Status', 'Valor', 'Cidade', 'UF', 'Data'],
      ...propsAll.map((p) => [
        'Imóvel',
        p.title,
        p.property_type || p.type || '',
        p.status || '',
        p.price || 0,
        p.city || '',
        p.state || '',
        p.created_at || '',
      ]),
      ...leadsAll.map((l) => [
        'Lead',
        l.name,
        l.campaign || '',
        l.status || '',
        l.budget || 0,
        l.source || '',
        '',
        l.created_at || '',
      ]),
      ...contracts.map((c) => [
        'Contrato',
        c.tenant_name,
        '',
        statusLabel(c.status, 'lease'),
        c.monthly_rent || 0,
        '',
        '',
        c.created_at || '',
      ]),
    ]);
    toast.success('Exportação completa gerada em CSV.');
  };

  const exportPDF = () => {
    window.print();
  };

  const tabs: { id: ReportTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'commercial', label: 'Comercial', icon: TrendingUp },
    { id: 'leads', label: 'Leads & Funil', icon: Users },
    { id: 'brokers', label: 'Corretores', icon: Briefcase },
    { id: 'rentals', label: 'Locação', icon: KeyRound },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white/50 rounded-3xl animate-pulse">
        <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">
          Carregando relatórios com dados reais...
        </span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-8 pb-12 font-sans text-gray-900">
      {/* Header */}
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${theme.gradient} p-8 shadow-lg`}
      >
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute left-0 bottom-0 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2.5 py-1 rounded-full bg-white/10 ${theme.lightText} text-xs font-semibold tracking-wider uppercase backdrop-blur-sm border border-white/10`}
              >
                {theme.breadcrumb}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
              <Activity className="text-white/90" size={36} />
              {theme.title}
            </h1>
            <p
              className={`${theme.lightText} mt-2 text-sm md:text-base max-w-2xl`}
            >
              {theme.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-xl border border-white/15 bg-white/10 p-1 backdrop-blur-sm">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.id}
                  onClick={() => setTimeRange(range.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    timeRange === range.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <button
              onClick={exportCurrentCSV}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl backdrop-blur-sm transition-all flex items-center gap-2"
            >
              <FileSpreadsheet size={18} /> Exportar CSV
            </button>
            <button
              onClick={exportFullCSV}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl backdrop-blur-sm transition-all flex items-center gap-2"
            >
              <Download size={18} /> Dados completos
            </button>
            <button
              onClick={exportPDF}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl backdrop-blur-sm transition-all flex items-center gap-2"
            >
              <Printer size={18} /> Imprimir / PDF
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border ${
                active
                  ? `${theme.primaryBg} text-white shadow-sm border-transparent`
                  : 'bg-white text-gray-600 border-gray-100 hover:border-gray-200 hover:text-gray-900'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ==================== OVERVIEW ==================== */}
      {activeTab === 'overview' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              label="VGV Carteira"
              value={formatCurrency(vgvPortfolio)}
              sub={`${propsAll.length} imóveis`}
              icon={Building2}
              color={theme.primaryText}
              bg={theme.primarySoft}
            />
            <KpiCard
              label="VGV Disponível"
              value={formatCurrency(vgvAvailable)}
              sub={`${availableProps.length} disponíveis`}
              icon={Home}
              color="text-emerald-600"
              bg="bg-emerald-50"
            />
            <KpiCard
              label="Captações"
              value={String(propsAll.length)}
              sub={`${propsNew.length} novas no período`}
              icon={TrendingUp}
              color="text-amber-600"
              bg="bg-amber-50"
            />
            <KpiCard
              label="Leads"
              value={formatNumber(leadsAll.length)}
              sub={`${leadsNew.length} novos no período`}
              icon={Users}
              color="text-purple-600"
              bg="bg-purple-50"
            />
            <KpiCard
              label="Ticket Médio"
              value={formatCurrency(avgTicket)}
              sub="Imóveis disponíveis"
              icon={MapPin}
              color="text-rose-600"
              bg="bg-rose-50"
            />
            <KpiCard
              label="Conversão"
              value={formatPercent(conversionRate)}
              sub={`${convertedLeads.length} fechados`}
              icon={BadgeCheck}
              color="text-sky-600"
              bg="bg-sky-50"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <SectionCard
              title="Evolução Mensal"
              subtitle="Captações, leads e vendas nos últimos 12 meses"
              className="lg:col-span-2"
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={evolutionData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gCapt" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={theme.chart}
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor={theme.chart}
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#7c3aed"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="#7c3aed"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                      dy={10}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="captacoes"
                      name="Captações"
                      stroke={theme.chart}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#gCapt)"
                      activeDot={{ r: 6, strokeWidth: 0, fill: theme.chart }}
                    />
                    <Area
                      type="monotone"
                      dataKey="leads"
                      name="Leads"
                      stroke="#7c3aed"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#gLeads)"
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#7c3aed' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="vendas"
                      name="Vendas"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fillOpacity={0}
                      strokeDasharray="6 4"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard
              title="Mix de Estoque"
              subtitle="Distribuição por tipologia"
            >
              {typeData.length === 0 ? (
                <EmptyState message="Nenhum imóvel encontrado." />
              ) : (
                <>
                  <div className="h-[220px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={typeData}
                          dataKey="value"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={4}
                          stroke="none"
                        >
                          {typeData.map((_, index) => (
                            <Cell
                              key={index}
                              fill={PALETTE[index % PALETTE.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-gray-900">
                        {propsAll.length}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-gray-400">
                        Total
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {typeData.slice(0, 5).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full shadow-sm"
                            style={{
                              backgroundColor: PALETTE[idx % PALETTE.length],
                            }}
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </SectionCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title={mode === 'rural' ? 'VGV por Estado' : 'VGV por Cidade'}
              subtitle="Volume de VGV por região"
            >
              {regionData.length === 0 ? (
                <EmptyState message="Nenhuma região com VGV." />
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={regionData}
                      layout="vertical"
                      margin={{ left: 20 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={120}
                        tickLine={false}
                        axisLine={false}
                        tick={{
                          fill: '#64748b',
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: '#f8fafc' }}
                        formatter={(value: any) =>
                          formatCurrency(Number(value))
                        }
                      />
                      <Bar
                        dataKey="value"
                        fill={theme.chart}
                        radius={[0, 6, 6, 0]}
                      >
                        {regionData.map((_, index) => (
                          <Cell
                            key={index}
                            fill={PALETTE[index % PALETTE.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Origem dos Leads"
              subtitle="Eficácia dos canais de aquisição"
            >
              {leadSourceData.length === 0 ? (
                <EmptyState message="Nenhum lead registrado." />
              ) : (
                <div className="space-y-4 pt-2">
                  {leadSourceData.slice(0, 8).map((item, index) => (
                    <div key={item.name} className="group">
                      <div className="mb-1.5 flex justify-between text-xs font-bold uppercase tracking-widest text-gray-500">
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: PALETTE[index % PALETTE.length],
                            }}
                          ></span>
                          {item.name}
                        </span>
                        <span className="text-gray-900">
                          {item.value}
                          <span className="text-gray-400 font-medium">
                            {' '}
                            (
                            {Math.round(
                              (item.value / Math.max(1, leadsAll.length)) * 100
                            )}
                            %)
                          </span>
                        </span>
                      </div>
                      <ProgressBar
                        value={
                          (item.value / Math.max(1, leadsAll.length)) * 100
                        }
                        color={theme.barSolid}
                      />
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}

      {/* ==================== COMMERCIAL ==================== */}
      {activeTab === 'commercial' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              label="Disponíveis"
              value={String(availableProps.length)}
              sub={formatCurrency(vgvAvailable)}
              icon={Home}
              color="text-emerald-600"
              bg="bg-emerald-50"
            />
            <KpiCard
              label="Reservados"
              value={String(reservedProps.length)}
              icon={Star}
              color="text-amber-600"
              bg="bg-amber-50"
            />
            <KpiCard
              label="Vendidos"
              value={String(soldProps.length)}
              sub={formatCurrency(vgvSold)}
              icon={BadgeCheck}
              color="text-blue-600"
              bg="bg-blue-50"
            />
            <KpiCard
              label="Alugados"
              value={String(rentedProps.length)}
              icon={KeyRound}
              color="text-purple-600"
              bg="bg-purple-50"
            />
            <KpiCard
              label="Ticket Médio Venda"
              value={formatCurrency(avgTicketSold)}
              sub="Imóveis vendidos"
              icon={TrendingUp}
              color="text-rose-600"
              bg="bg-rose-50"
            />
            <KpiCard
              label="Permanência no Mercado"
              value={`${avgDaysOnMarket} dias`}
              sub="Tempo médio em estoque"
              icon={CalendarDays}
              color="text-sky-600"
              bg="bg-sky-50"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Estoque por Status"
              subtitle="Distribuição atual da carteira"
            >
              {statusInventory.length === 0 ? (
                <EmptyState message="Nenhum imóvel encontrado." />
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusInventory} margin={{ left: -20 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tick={{
                          fill: '#64748b',
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{
                          fill: '#64748b',
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar dataKey="count" name="Imóveis" radius={[6, 6, 0, 0]}>
                        {statusInventory.map((_, index) => (
                          <Cell
                            key={index}
                            fill={PALETTE[index % PALETTE.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="VGV por Status"
              subtitle="Valor total da carteira em cada situação"
            >
              {statusInventory.length === 0 ? (
                <EmptyState message="Nenhum imóvel encontrado." />
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statusInventory}
                      layout="vertical"
                      margin={{ left: 20 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={110}
                        tickLine={false}
                        axisLine={false}
                        tick={{
                          fill: '#64748b',
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: '#f8fafc' }}
                        formatter={(value: any) =>
                          formatCurrency(Number(value))
                        }
                      />
                      <Bar
                        dataKey="value"
                        name="VGV"
                        fill={theme.chart}
                        radius={[0, 6, 6, 0]}
                      >
                        {statusInventory.map((_, index) => (
                          <Cell
                            key={index}
                            fill={PALETTE[index % PALETTE.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SectionCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Preço Médio por Tipo"
              subtitle="Ticket médio por tipologia"
            >
              {avgPriceByType.length === 0 ? (
                <EmptyState message="Nenhum imóvel encontrado." />
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={avgPriceByType} margin={{ left: -20 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tick={{
                          fill: '#64748b',
                          fontSize: 10,
                          fontWeight: 500,
                        }}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{
                          fill: '#64748b',
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                        tickFormatter={(value: number) => formatCurrency(value)}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: '#f8fafc' }}
                        formatter={(value: any) =>
                          formatCurrency(Number(value))
                        }
                      />
                      <Bar
                        dataKey="value"
                        name="Preço médio"
                        fill={theme.chartSoft}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Imóveis com Maior Engajamento"
              subtitle="Ranking por visualizações e favoritos"
            >
              {topProperties.length === 0 ? (
                <EmptyState message="Nenhum imóvel encontrado." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100">
                        <th className="py-2 pr-2">Imóvel</th>
                        <th className="py-2 pr-2">Status</th>
                        <th className="py-2 pr-2 text-right">Views</th>
                        <th className="py-2 pr-2 text-right">Fav.</th>
                        <th className="py-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProperties.map((p) => (
                        <tr
                          key={p.id}
                          className="border-b border-gray-50 last:border-0"
                        >
                          <td className="py-2.5 pr-2">
                            <p className="font-semibold text-gray-800 truncate max-w-[220px]">
                              {p.title}
                            </p>
                            <p className="text-xs text-gray-400">
                              {p.city || p.state || '—'}
                            </p>
                          </td>
                          <td className="py-2.5 pr-2">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                p.status === 'Disponível' ||
                                p.status === 'Disponivel'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : p.status === 'Vendido'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="py-2.5 pr-2 text-right font-bold text-gray-900">
                            {formatNumber(p.views_count || 0)}
                          </td>
                          <td className="py-2.5 pr-2 text-right font-bold text-gray-900">
                            {formatNumber(p.favorites_count || 0)}
                          </td>
                          <td className="py-2.5 text-right font-bold text-gray-900">
                            {formatCurrency(p.price || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}

      {/* ==================== LEADS & FUNIL ==================== */}
      {activeTab === 'leads' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              label="Total de Leads"
              value={formatNumber(leadsAll.length)}
              sub={`${leadsNew.length} novos no período`}
              icon={Users}
              color="text-blue-600"
              bg="bg-blue-50"
            />
            <KpiCard
              label="Fechados"
              value={formatNumber(convertedLeads.length)}
              sub={formatCurrency(
                convertedLeads.reduce((s, l) => s + (l.budget || 0), 0)
              )}
              icon={BadgeCheck}
              color="text-emerald-600"
              bg="bg-emerald-50"
            />
            <KpiCard
              label="Perdidos"
              value={formatNumber(lostLeads.length)}
              icon={AlertTriangle}
              color="text-red-600"
              bg="bg-red-50"
            />
            <KpiCard
              label="Taxa de Conversão"
              value={formatPercent(conversionRate)}
              icon={Activity}
              color="text-purple-600"
              bg="bg-purple-50"
            />
            <KpiCard
              label="Budget Médio"
              value={formatCurrency(avgBudget)}
              sub="Intenção financeira"
              icon={MapPin}
              color="text-amber-600"
              bg="bg-amber-50"
            />
            <KpiCard
              label="Qualificados (IA)"
              value={formatNumber(
                leadsAll.filter((l) => (l.lead_score || 0) >= 70).length
              )}
              sub="Score de qualificação"
              icon={Star}
              color="text-sky-600"
              bg="bg-sky-50"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Funil de Leads"
              subtitle="Distribuição por estágio do funil"
            >
              {leadFunnelData.length === 0 ? (
                <EmptyState message="Nenhum lead registrado." />
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leadFunnelData} margin={{ left: -20 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tick={{
                          fill: '#64748b',
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{
                          fill: '#64748b',
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar dataKey="value" name="Leads" radius={[6, 6, 0, 0]}>
                        {leadFunnelData.map((_, index) => (
                          <Cell
                            key={index}
                            fill={PALETTE[index % PALETTE.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Leads por Campanha"
              subtitle="Ranking de campanhas"
            >
              {leadCampaignData.length === 0 ? (
                <EmptyState message="Nenhuma campanha com leads." />
              ) : (
                <div className="space-y-4 pt-2">
                  {leadCampaignData.map((item, index) => (
                    <div key={item.name} className="group">
                      <div className="mb-1.5 flex justify-between text-xs font-bold uppercase tracking-widest text-gray-500">
                        <span className="truncate max-w-[70%]">
                          {item.name}
                        </span>
                        <span className="text-gray-900">{item.value}</span>
                      </div>
                      <ProgressBar
                        value={
                          (item.value /
                            Math.max(1, leadCampaignData[0].value)) *
                          100
                        }
                        color={
                          index === 0
                            ? theme.barSolid
                            : PALETTE[index % PALETTE.length]
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <SectionCard
            title="Conversão por Canal"
            subtitle="Leads, fechamentos, taxa de conversão e budget por origem"
          >
            {leadConversionBySource.length === 0 ? (
              <EmptyState message="Nenhum lead registrado." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100">
                      <th className="py-2 pr-3">Canal</th>
                      <th className="py-2 pr-3 text-right">Leads</th>
                      <th className="py-2 pr-3 text-right">Fechados</th>
                      <th className="py-2 pr-3 text-right">Taxa</th>
                      <th className="py-2 pr-3 text-right">Budget Total</th>
                      <th className="py-2 text-right">Conversão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadConversionBySource.map((row) => (
                      <tr
                        key={row.source}
                        className="border-b border-gray-50 last:border-0"
                      >
                        <td className="py-3 pr-3 font-semibold text-gray-800">
                          {row.source}
                        </td>
                        <td className="py-3 pr-3 text-right font-bold text-gray-900">
                          {formatNumber(row.total)}
                        </td>
                        <td className="py-3 pr-3 text-right font-bold text-emerald-600">
                          {formatNumber(row.converted)}
                        </td>
                        <td className="py-3 pr-3 text-right font-bold text-gray-900">
                          {formatPercent(row.rate)}
                        </td>
                        <td className="py-3 pr-3 text-right font-bold text-gray-900">
                          {formatCurrency(row.budget)}
                        </td>
                        <td className="py-3 w-40">
                          <ProgressBar
                            value={row.rate}
                            color={
                              row.rate >= 30
                                ? 'bg-emerald-500'
                                : row.rate >= 15
                                  ? 'bg-amber-500'
                                  : 'bg-red-400'
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      )}

      {/* ==================== BROKERS ==================== */}
      {activeTab === 'brokers' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              label="Corretores Ativos"
              value={formatNumber(brokerStats.length)}
              sub="Com leads, captações ou atividades"
              icon={Briefcase}
              color="text-blue-600"
              bg="bg-blue-50"
            />
            <KpiCard
              label="Leads do Time"
              value={formatNumber(brokerStats.reduce((s, b) => s + b.leads, 0))}
              icon={Users}
              color="text-purple-600"
              bg="bg-purple-50"
            />
            <KpiCard
              label="Conversões"
              value={formatNumber(
                brokerStats.reduce((s, b) => s + b.converted, 0)
              )}
              icon={BadgeCheck}
              color="text-emerald-600"
              bg="bg-emerald-50"
            />
            <KpiCard
              label="Atividades"
              value={formatNumber(totalTeamActivities)}
              icon={ListOrdered}
              color="text-amber-600"
              bg="bg-amber-50"
            />
            <KpiCard
              label="Conversão Média"
              value={formatPercent(
                (() => {
                  const totalLeads = brokerStats.reduce(
                    (s, b) => s + b.leads,
                    0
                  );
                  const totalConv = brokerStats.reduce(
                    (s, b) => s + b.converted,
                    0
                  );
                  return totalLeads ? (totalConv / totalLeads) * 100 : 0;
                })()
              )}
              icon={Activity}
              color="text-rose-600"
              bg="bg-rose-50"
            />
          </div>

          <SectionCard
            title="Ranking de Performance"
            subtitle="Leads atribuídos, conversões, captações e atividades por corretor"
          >
            {brokerStats.length === 0 ? (
              <EmptyState message="Nenhum corretor com dados ainda. Atribua leads e registre atividades para gerar o ranking." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100">
                      <th className="py-2 pr-3">#</th>
                      <th className="py-2 pr-3">Corretor</th>
                      <th className="py-2 pr-3 text-right">Leads</th>
                      <th className="py-2 pr-3 text-right">Captações</th>
                      <th className="py-2 pr-3 text-right">Conversões</th>
                      <th className="py-2 pr-3 text-right">Perdidos</th>
                      <th className="py-2 pr-3 text-right">Taxa</th>
                      <th className="py-2 pr-3 text-right">Budget</th>
                      <th className="py-2 pr-3 text-right">Atividades</th>
                      <th className="py-2 text-right">Conversão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brokerStats.map((row, index) => (
                      <tr
                        key={row.broker.id}
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                      >
                        <td className="py-3 pr-3">
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                              index === 0
                                ? 'bg-amber-100 text-amber-700'
                                : index === 1
                                  ? 'bg-slate-200 text-slate-600'
                                  : index === 2
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gray-700 to-gray-900 text-white text-xs font-bold uppercase">
                              {(row.broker.name || row.broker.email || '?')
                                .trim()
                                .slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">
                                {row.broker.name || 'Sem nome'}
                              </p>
                              <p className="text-xs text-gray-400">
                                {row.broker.creci
                                  ? `CRECI ${row.broker.creci}`
                                  : row.broker.email || ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-right font-bold text-gray-900">
                          {formatNumber(row.leads)}
                        </td>
                        <td className="py-3 pr-3 text-right font-bold text-gray-900">
                          {formatNumber(row.captured)}
                        </td>
                        <td className="py-3 pr-3 text-right font-bold text-emerald-600">
                          {formatNumber(row.converted)}
                        </td>
                        <td className="py-3 pr-3 text-right font-bold text-red-500">
                          {formatNumber(row.lost)}
                        </td>
                        <td className="py-3 pr-3 text-right font-bold text-gray-900">
                          {formatPercent(row.rate)}
                        </td>
                        <td className="py-3 pr-3 text-right font-bold text-gray-900">
                          {formatCurrency(row.budget)}
                        </td>
                        <td className="py-3 pr-3 text-right font-bold text-gray-900">
                          {formatNumber(row.activities)}
                        </td>
                        <td className="py-3 w-40 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-24">
                              <ProgressBar
                                value={row.rate}
                                color={
                                  row.rate >= 30
                                    ? 'bg-emerald-500'
                                    : row.rate >= 15
                                      ? 'bg-amber-500'
                                      : 'bg-red-400'
                                }
                              />
                            </div>
                            <span className="w-10 text-xs font-bold text-gray-500">
                              {formatPercent(row.rate)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      )}

      {/* ==================== RENTALS ==================== */}
      {activeTab === 'rentals' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard
              label="Contratos Ativos"
              value={formatNumber(leaseStats.active)}
              sub={`${contracts.length} contratos`}
              icon={KeyRound}
              color="text-blue-600"
              bg="bg-blue-50"
            />
            <KpiCard
              label="Receita Mensal (MRR)"
              value={formatCurrency(leaseStats.mrr)}
              sub="Contratos ativos"
              icon={TrendingUp}
              color="text-emerald-600"
              bg="bg-emerald-50"
            />
            <KpiCard
              label="Vencendo em 90 dias"
              value={formatNumber(leaseStats.expiring90)}
              icon={CalendarDays}
              color="text-amber-600"
              bg="bg-amber-50"
            />
            <KpiCard
              label="Em Dia"
              value={formatNumber(leaseStats.byPayment['em_dia']?.count || 0)}
              sub={formatCurrency(leaseStats.byPayment['em_dia']?.value || 0)}
              icon={BadgeCheck}
              color="text-emerald-600"
              bg="bg-emerald-50"
            />
            <KpiCard
              label="Inadimplência"
              value={formatNumber(
                (leaseStats.byPayment['inadimplente']?.count || 0) +
                  (leaseStats.byPayment['atrasado']?.count || 0)
              )}
              sub={formatCurrency(
                (leaseStats.byPayment['inadimplente']?.value || 0) +
                  (leaseStats.byPayment['atrasado']?.value || 0)
              )}
              icon={AlertTriangle}
              color="text-red-600"
              bg="bg-red-50"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Contratos por Status"
              subtitle="Situação da carteira de locação"
            >
              {Object.keys(leaseStats.byStatus).length === 0 ? (
                <EmptyState message="Nenhum contrato de locação encontrado." />
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries(leaseStats.byStatus).map(
                        ([name, count]) => ({
                          name: statusLabel(name, 'lease'),
                          count,
                        })
                      )}
                      margin={{ left: -20 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tick={{
                          fill: '#64748b',
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{
                          fill: '#64748b',
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar
                        dataKey="count"
                        name="Contratos"
                        radius={[6, 6, 0, 0]}
                        fill={theme.chart}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Próximos Vencimentos"
              subtitle="Contratos que vencem nos próximos 90 dias"
            >
              {leaseStats.upcoming.length === 0 ? (
                <EmptyState message="Nenhum contrato vencendo nos próximos 90 dias." />
              ) : (
                <div className="space-y-3">
                  {leaseStats.upcoming.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {c.tenant_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {c.end_date
                            ? new Date(c.end_date).toLocaleDateString('pt-BR')
                            : 'Sem data'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(c.monthly_rent || 0)}
                        </p>
                        <p
                          className={`text-xs font-bold ${
                            c.daysUntil <= 30
                              ? 'text-red-500'
                              : 'text-amber-500'
                          }`}
                        >
                          {c.daysUntil} dias
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <SectionCard
            title="Receita por Status de Pagamento"
            subtitle="Valor mensal sob gestão por situação de pagamento"
          >
            {Object.keys(leaseStats.byPayment).length === 0 ? (
              <EmptyState message="Nenhum contrato com status de pagamento informado." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(leaseStats.byPayment).map(
                  ([key, value], index) => (
                    <div
                      key={key}
                      className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: PALETTE[index % PALETTE.length],
                          }}
                        />
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                          {statusLabel(key, 'payment')}
                        </span>
                      </div>
                      <p className="text-2xl font-extrabold text-gray-900">
                        {formatCurrency(value.value)}
                      </p>
                      <p className="text-xs font-medium text-gray-400">
                        {value.count} contratos
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </SectionCard>
        </>
      )}

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
          <Activity size={14} className={theme.primaryText} />
          Dados reais da organização • {new Date().toLocaleString('pt-BR')}
        </div>
        <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
          <span>{propsAll.length} imóveis</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span>{leadsAll.length} leads</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span>{contracts.length} contratos</span>
        </div>
      </div>
    </div>
  );
};

export default ReportsCenter;
