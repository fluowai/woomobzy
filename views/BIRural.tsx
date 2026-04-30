import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Home as HomeIcon,
  DollarSign,
  PieChart as PieIcon,
  ArrowUpRight,
  MapPin,
  Activity,
  Calendar,
  Filter,
  Download,
  FilterX,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useSettings } from '../context/SettingsContext';
import { MOCK_PROPERTIES, MOCK_LEADS } from '../constants.tsx';
import { PropertyType, Property } from '../types';
import { supabase } from '../services/supabase';

const BIRural: React.FC = () => {
  const { settings } = useSettings();
  const [timeRange, setTimeRange] = useState('Anual');
  const [properties, setProperties] = useState<Property[]>([]);
  const [biStats, setBiStats] = useState<any>(null);
  const [leadSources, setLeadSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch stats via RPC
      const { data: stats, error: statsError } = await supabase.rpc(
        'get_bi_stats',
        { org_id: settings.id }
      );

      if (statsError) {
        console.warn(
          '⚠️ RPC get_bi_stats não encontrada ou falhou. Usando fallback local.'
        );
      } else {
        setBiStats(stats);
      }

      // Fetch lead sources via RPC
      const { data: sources, error: sourcesError } = await supabase.rpc(
        'get_bi_lead_sources',
        { org_id: settings.id }
      );

      if (sourcesError) {
        console.warn('⚠️ RPC get_bi_lead_sources não encontrada ou falhou.');
        setLeadSources([]);
      } else {
        setLeadSources(sources || []);
      }

      const { data: props, error: propsError } = await supabase
        .from('properties')
        .select('*')
        .in('property_type', [
          'Fazenda',
          'Sítio',
          'Chácara',
          'Área Produtiva',
          'Gleba',
          'Rural',
          'Estância',
          'Haras',
          'Granja',
          'Agropecuária',
          'Terreno Rural',
          'Lote Rural',
        ])
        .neq('status', 'Pendente');

      if (propsError) console.error('Error fetching properties:', propsError);
      else setProperties(props || []);
    } catch (error) {
      console.error('Error loading BI data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Aggregation Logic (Now based on real properties)
  const stats = useMemo(() => {
    if (biStats) {
      return {
        totalValue: biStats.total_value,
        totalArea: biStats.total_area_ha,
        avgHectarePrice: biStats.avg_ha_price,
        totalLeads: leadSources.reduce((acc, s) => acc + s.value, 0),
        propertyCount: biStats.property_count,
      };
    }

    const totalValue = properties.reduce((acc, p) => acc + (p.price || 0), 0);
    const totalArea = properties.reduce(
      (acc, p) => acc + (p.area_total_ha || 0),
      0
    );
    const avgHectarePrice = totalArea > 0 ? totalValue / totalArea : 0;

    return {
      totalValue,
      totalArea,
      avgHectarePrice,
      totalLeads: leadSources.reduce((acc, s) => acc + s.value, 0),
      propertyCount: properties.length,
    };
  }, [properties, biStats, leadSources]);

  // Inventory by Type Data
  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    properties.forEach((p) => {
      counts[p.type] = (counts[p.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [properties]);

  // Regional Distribution Data
  const regionData = useMemo(() => {
    const regions: Record<string, number> = {};
    properties.forEach((p) => {
      regions[p.state] = (regions[p.state] || 0) + (p.price || 0);
    });
    return Object.entries(regions)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [properties]);

  // Lead Source Data (Now from DB)
  const leadSourceData = useMemo(() => {
    if (leadSources.length === 0) {
      return [{ name: 'Nenhum Dado', value: 0 }];
    }
    const total = leadSources.reduce((acc, s) => acc + s.value, 0);
    return leadSources.map((s) => ({
      name: s.name,
      value: total > 0 ? Math.round((s.value / total) * 100) : 0,
    }));
  }, [leadSources]);

  // Growth Data (Simulated for now as we don't have historical aggregation yet)
  const growthData = [
    { month: 'Jan', listings: 4, leads: 12 },
    { month: 'Fev', listings: 6, leads: 18 },
    { month: 'Mar', listings: 5, leads: 15 },
    { month: 'Abr', listings: 8, leads: 24 },
    { month: 'Mai', listings: 12, leads: 32 },
    { month: 'Jun', listings: 10, leads: 28 },
  ];

  const COLORS = [
    settings.primaryColor,
    '#10b981',
    '#f59e0b',
    '#6366f1',
    '#ec4899',
  ];

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
    }).format(val);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white rounded-[3rem]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-sm font-black uppercase tracking-widest text-black/40">
            Sincronizando BI...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-black uppercase italic tracking-tighter leading-none mb-3">
            BI & Inteligência <br />{' '}
            <span style={{ color: settings.primaryColor }}>Rural Select</span>
          </h1>
          <p className="text-black/60 font-medium italic">
            Análise de performance, portfólio e mercado em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-slate-100">
            {['Mensal', 'Semestral', 'Anual'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${timeRange === range ? 'bg-black text-white' : 'text-black/40 hover:text-black'}`}
              >
                {range}
              </button>
            ))}
          </div>
          <button className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:bg-slate-50 transition-all text-black/60">
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* KPI Cloud */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: 'Valor em Carteira',
            value: formatCurrency(stats.totalValue),
            icon: DollarSign,
            trend: '+12.5%',
            color: settings.primaryColor,
          },
          {
            label: 'Área Total Sob Gestão',
            value: `${stats.totalArea.toLocaleString()} ha`,
            icon: MapPin,
            trend: '+8.2%',
            color: '#10b981',
          },
          {
            label: 'Ticket Médio/Hectare',
            value: formatCurrency(stats.avgHectarePrice),
            icon: Activity,
            trend: '-2.1%',
            color: '#f59e0b',
          },
          {
            label: 'Performance de Leads',
            value: `${stats.totalLeads} Ativos`,
            icon: Users,
            trend: '+18.4%',
            color: '#6366f1',
          },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-all group overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-700">
              <kpi.icon size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div
                  className="p-3 rounded-2xl"
                  style={{
                    backgroundColor: `${kpi.color}15`,
                    color: kpi.color,
                  }}
                >
                  <kpi.icon size={24} />
                </div>
                <span
                  className={`text-[10px] font-black px-3 py-1 rounded-full ${kpi.trend.startsWith('+') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
                >
                  {kpi.trend}
                </span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black/40 mb-2">
                {kpi.label}
              </p>
              <h3 className="text-2xl font-black text-black italic tracking-tighter">
                {kpi.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Market Trends Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div
                className="w-1.5 h-8 rounded-full"
                style={{ backgroundColor: settings.primaryColor }}
              ></div>
              <div>
                <h3 className="text-lg font-black uppercase italic tracking-tighter text-black">
                  Crescimento de Inventário
                </h3>
                <p className="text-xs font-medium text-black/40">
                  Análise histórica de novas captações vs. leads gerados.
                </p>
              </div>
            </div>
            <Filter size={18} className="text-black/20" />
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient
                    id="colorListings"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={settings.primaryColor}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={settings.primaryColor}
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
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                  dy={15}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '20px',
                    border: 'none',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    padding: '15px',
                  }}
                  itemStyle={{
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    fontSize: '10px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="listings"
                  stroke={settings.primaryColor}
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorListings)"
                />
                <Area
                  type="monotone"
                  dataKey="leads"
                  stroke="#10b981"
                  strokeWidth={4}
                  fillOpacity={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Portfolio Distribution Pie Chart */}
        <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
          <div className="mb-10">
            <h3 className="text-lg font-black uppercase italic tracking-tighter text-black">
              Mix de Produtos
            </h3>
            <p className="text-xs font-medium text-black/40">
              Distribuição por tipologia rural.
            </p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  iconType="circle"
                  wrapperStyle={{
                    paddingTop: '20px',
                    fontSize: '10px',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Regional Distribution Bar Chart */}
        <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
          <div className="mb-10">
            <h3 className="text-lg font-black uppercase italic tracking-tighter text-black">
              Potencial por Região
            </h3>
            <p className="text-xs font-medium text-black/40">
              Volume de VGV (Valor Geral de Vendas) por Estado.
            </p>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionData} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#f1f5f9"
                />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#000000', fontSize: 12, fontWeight: 900 }}
                  width={40}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: '20px',
                    border: 'none',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar
                  dataKey="value"
                  fill={settings.primaryColor}
                  radius={[0, 20, 20, 0]}
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Source Distribution */}
        <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 overflow-hidden relative">
          <div className="mb-10 relative z-10">
            <h3 className="text-lg font-black uppercase italic tracking-tighter text-black">
              Origem da Prospecção
            </h3>
            <p className="text-xs font-medium text-black/40">
              Eficácia dos canais de aquisição de clientes.
            </p>
          </div>

          <div className="space-y-6 relative z-10">
            {leadSourceData.map((source, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black uppercase tracking-widest text-black">
                    {source.name}
                  </span>
                  <span className="text-xs font-black text-black/40">
                    {source.value}%
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${source.value}%`,
                      backgroundColor: COLORS[idx % COLORS.length],
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-8 bg-black rounded-[2rem] text-white relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2 rounded-xl bg-white/10">
                <TrendingUp size={20} className="text-white" />
              </div>
              <h4 className="text-sm font-black uppercase tracking-tighter italic">
                Insight de Performance
              </h4>
            </div>
            <p className="text-xs text-white/60 leading-relaxed italic">
              Canais de conversão direta (WhatsApp) tiveram um incremento de 15%
              na última semana. Recomenda-se aumentar o investimento em
              campanhas mobile-first.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BIRural;
