import { logger } from '@/utils/logger';
import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  DollarSign,
  MapPin,
  Activity,
  Filter,
  Download,
  Trees
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
import { useAuth } from '../context/AuthContext';
import { Property } from '../types';
import { supabase } from '../services/supabase';
import { isRuralProperty } from '../utils/propertyNiche';

const BIRural: React.FC = () => {
  const { settings } = useSettings();
  const { profile } = useAuth();
  const [timeRange, setTimeRange] = useState('Anual');
  const [properties, setProperties] = useState<Property[]>([]);
  const [ruralLeads, setRuralLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.organization_id) return;
    loadData();
  }, [profile?.organization_id]);

  const loadData = async () => {
    if (!profile?.organization_id) return;
    try {
      setLoading(true);
      const organizationId = profile.organization_id;

      const [
        { data: props, error: propsError },
        { data: leads, error: leadsError },
      ] = await Promise.all([
        supabase
          .from('properties')
          .select('*')
          .eq('organization_id', organizationId)
          .neq('status', 'Pendente'),
        supabase
          .from('leads')
          .select('id, source, created_at, match_profile, preferences')
          .eq('organization_id', organizationId),
      ]);

      if (propsError) logger.error('Error fetching properties:', propsError);
      else setProperties((props || []).filter(isRuralProperty) as any);
      if (leadsError) logger.error('Error fetching rural leads:', leadsError);
      else {
        setRuralLeads(
          (leads || []).filter(
            (lead) =>
              lead.match_profile === 'rural' ||
              lead.preferences?.niche === 'rural' ||
              lead.preferences?.profile === 'rural'
          )
        );
      }
    } catch (error) {
      logger.error('Error loading BI data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Aggregation Logic
  const stats = useMemo(() => {
    const totalValue = properties.reduce((acc, p) => acc + (p.price || 0), 0);
    const totalArea = properties.reduce(
      (acc, p) => acc + (p.total_area_ha || 0),
      0
    );
    const avgHectarePrice = totalArea > 0 ? totalValue / totalArea : 0;

    return {
      totalValue,
      totalArea,
      avgHectarePrice,
      totalLeads: ruralLeads.length,
      propertyCount: properties.length,
    };
  }, [properties, ruralLeads]);

  // Inventory by Type Data
  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    properties.forEach((p) => {
      const type = p.type || 'Rural';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [properties]);

  // Regional Distribution Data
  const regionData = useMemo(() => {
    const regions: Record<string, number> = {};
    properties.forEach((p) => {
      const state = p.location?.state || 'Não informado';
      regions[state] = (regions[state] || 0) + (p.price || 0);
    });
    return Object.entries(regions)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [properties]);

  // Lead Source Data
  const leadSourceData = useMemo(() => {
    if (ruralLeads.length === 0) {
      return [{ name: 'Nenhum Dado', value: 0 }];
    }
    const counts = ruralLeads.reduce<Record<string, number>>((acc, lead) => {
      const source = lead.source || 'Não informado';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, count]) => ({
      name,
      value: Math.round((Number(count) / ruralLeads.length) * 100),
    }));
  }, [ruralLeads]);

  const growthData = useMemo(() => {
    const monthCount =
      timeRange === 'Mensal' ? 4 : timeRange === 'Semestral' ? 6 : 12;
    return Array.from({ length: monthCount }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (monthCount - 1 - index));
      const matchesMonth = (value?: string) => {
        if (!value) return false;
        const createdAt = new Date(value);
        return (
          createdAt.getMonth() === date.getMonth() &&
          createdAt.getFullYear() === date.getFullYear()
        );
      };
      return {
        month: new Intl.DateTimeFormat('pt-BR', { month: 'short' })
          .format(date)
          .replace('.', ''),
        listings: properties.filter((property) =>
          matchesMonth((property as any).created_at)
        ).length,
        leads: ruralLeads.filter((lead) => matchesMonth(lead.created_at))
          .length,
      };
    });
  }, [properties, ruralLeads, timeRange]);

  const COLORS = [
    '#10b981', // emerald
    '#f59e0b', // amber
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#ec4899', // pink
  ];

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
    }).format(val);

  const exportReport = () => {
    const rows = [
      ['Imóvel', 'Tipo', 'Cidade', 'UF', 'Área (ha)', 'Valor'],
      ...properties.map((property) => [
        property.title,
        property.type,
        property.location?.city || '',
        property.location?.state || '',
        String(property.total_area_ha || property.features?.areaHectares || 0),
        String(property.price || 0),
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';')
      )
      .join('\n');
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `bi-rural-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const tooltipStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
    color: '#1e293b',
    fontSize: '12px',
    fontWeight: '500' as const
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white/50 rounded-3xl animate-pulse">
        <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Sincronizando BI Rural...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-8 pb-12 font-sans text-gray-900">
      
      {/* Header Premium */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 p-8 shadow-lg shadow-emerald-900/20">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute left-0 bottom-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold tracking-wider uppercase backdrop-blur-sm border border-white/10">
                Inteligência Rural
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
              <Activity className="text-emerald-400" size={36} />
              BI Rural Select
            </h1>
            <p className="text-emerald-100 mt-2 text-sm md:text-base max-w-xl">
              Análise de performance, portfólio e mercado do segmento rural em tempo real.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-white/10 rounded-xl p-1 backdrop-blur-sm border border-white/20">
              {['Mensal', 'Semestral', 'Anual'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${timeRange === range ? 'bg-white text-emerald-900 shadow-sm' : 'text-white/70 hover:text-white'}`}
                >
                  {range}
                </button>
              ))}
            </div>
            <button
              onClick={exportReport}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl backdrop-blur-sm transition-all flex items-center gap-2 border border-white/20"
            >
              <Download size={18} /> Exportar
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cloud */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: 'Valor em Carteira',
            value: formatCurrency(stats.totalValue),
            icon: DollarSign,
            trend: `${stats.propertyCount} imóveis`,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            label: 'Área Total Sob Gestão',
            value: `${stats.totalArea.toLocaleString()} ha`,
            icon: MapPin,
            trend: 'Área cadastrada',
            color: 'text-teal-600',
            bg: 'bg-teal-50',
          },
          {
            label: 'Ticket Médio/Hectare',
            value: formatCurrency(stats.avgHectarePrice),
            icon: Activity,
            trend: 'Média da carteira',
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
          {
            label: 'Performance de Leads',
            value: `${stats.totalLeads} Ativos`,
            icon: Users,
            trend: 'Perfil rural',
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
          },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className="group relative bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-default hover:-translate-y-1"
          >
            <kpi.icon className={`absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.03] transform group-hover:scale-110 transition-transform duration-500 ${kpi.color}`} />
            
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${kpi.bg} ${kpi.color}`}>
                <kpi.icon size={24} />
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 uppercase tracking-widest">
                {kpi.trend}
              </span>
            </div>
            
            <div className="relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                {kpi.label}
              </p>
              <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                {kpi.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Trends Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-8 rounded-full bg-emerald-500"></div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Crescimento de Inventário
                </h3>
                <p className="text-xs font-medium text-gray-500 mt-1">
                  Análise histórica de novas captações vs. leads gerados.
                </p>
              </div>
            </div>
            <Filter size={18} className="text-gray-400" />
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorListings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="listings" name="Captações" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorListings)" activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
                <Area type="monotone" dataKey="leads" name="Leads" stroke="#6366f1" strokeWidth={3} fillOpacity={0} activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Portfolio Distribution Pie Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900">
              Mix de Produtos
            </h3>
            <p className="text-xs font-medium text-gray-500 mt-1">
              Distribuição por tipologia rural.
            </p>
          </div>
          <div className="flex-1 h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-gray-900">{stats.propertyCount}</span>
              <span className="text-[10px] uppercase font-bold text-gray-400">Total</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {typeData.slice(0, 4).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-sm font-medium text-gray-700">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Distribution Bar Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900">
              Potencial por Região
            </h3>
            <p className="text-xs font-medium text-gray-500 mt-1">
              Volume de VGV (Valor Geral de Vendas) por Estado.
            </p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" fill="#10b981" radius={[0, 6, 6, 0]}>
                  {regionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Source Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 overflow-hidden relative flex flex-col">
          <div className="mb-8 relative z-10">
            <h3 className="text-lg font-bold text-gray-900">
              Origem da Prospecção
            </h3>
            <p className="text-xs font-medium text-gray-500 mt-1">
              Eficácia dos canais de aquisição de clientes.
            </p>
          </div>

          <div className="space-y-5 relative z-10 flex-1 flex flex-col justify-center">
            {leadSourceData.map((source, idx) => (
              <div key={idx} className="group">
                <div className="mb-2 flex justify-between items-end">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                    {source.name}
                  </span>
                  <span className="text-xs font-bold text-gray-900">
                    {source.value}%
                  </span>
                </div>
                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden relative">
                  <div
                    className="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.max(2, source.value)}%`,
                      backgroundColor: COLORS[idx % COLORS.length],
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl text-white relative z-10 shadow-lg">
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl translate-x-1/3 translate-y-1/3"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-white/10">
                  <TrendingUp size={18} className="text-emerald-400" />
                </div>
                <h4 className="text-sm font-bold uppercase tracking-widest">
                  Insight de Performance
                </h4>
              </div>
              <p className="text-xs text-gray-300 font-medium leading-relaxed">
                {stats.totalLeads > 0
                  ? `${leadSourceData[0]?.name || 'O principal canal'} concentra ${leadSourceData[0]?.value || 0}% dos leads rurais registrados.`
                  : 'Ainda não há leads classificados com perfil rural para gerar recomendações de canal.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BIRural;
