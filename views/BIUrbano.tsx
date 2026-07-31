import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Activity,
  Building2,
  DollarSign,
  Download,
  Home,
  MapPin,
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

const URBAN_TYPES = [
  'Apartamento',
  'Casa',
  'Sobrado',
  'Terreno Urbano',
  'Sala Comercial',
  'Galpao Industrial',
  'Galpão Industrial',
  'Loft',
  'Studio',
  'Cobertura',
];

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#7c3aed', '#0891b2'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value || 0);

const BIUrbano: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.organization_id) return;

    const load = async () => {
      setLoading(true);
      const organizationId = profile.organization_id;

      const [{ data: propertyData }, { data: leadData }] = await Promise.all([
        supabase
          .from('properties')
          .select(
            'id,title,price,status,property_type,city,state,neighborhood,niche,created_at,features'
          )
          .eq('organization_id', organizationId)
          .or(
            `niche.eq.urbano,property_type.in.(${URBAN_TYPES.map((type) => `"${type}"`).join(',')})`
          )
          .order('created_at', { ascending: false }),
        supabase
          .from('leads')
          .select('id,source,status,created_at,match_profile,property_id')
          .eq('organization_id', organizationId)
          .or('match_profile.eq.urbano,match_profile.is.null')
          .order('created_at', { ascending: false }),
      ]);

      setProperties(propertyData || []);
      setLeads(leadData || []);
      setLoading(false);
    };

    load();
  }, [profile?.organization_id]);

  const stats = useMemo(() => {
    const available = properties.filter(
      (property) =>
        property.status === 'Disponível' || property.status === 'Disponivel'
    );
    const rented = properties.filter(
      (property) => property.status === 'Alugado'
    );
    const sold = properties.filter((property) => property.status === 'Vendido');
    const vgv = available.reduce(
      (sum, property) => sum + Number(property.price || 0),
      0
    );
    const avgTicket = available.length ? vgv / available.length : 0;

    return {
      vgv,
      avgTicket,
      propertyCount: properties.length,
      activeLeads: leads.length,
      rented: rented.length,
      sold: sold.length,
      available: available.length,
    };
  }, [properties, leads]);

  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    properties.forEach((property) => {
      const type = property.property_type || 'Sem tipo';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [properties]);

  const cityData = useMemo(() => {
    const totals: Record<string, number> = {};
    properties.forEach((property) => {
      const city =
        property.city || property.features?.location?.city || 'Sem cidade';
      totals[city] = (totals[city] || 0) + Number(property.price || 0);
    });
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [properties]);

  const leadSourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((lead) => {
      const source = lead.source || 'Não informado';
      counts[source] = (counts[source] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [leads]);

  const monthlyData = useMemo(() => {
    const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    return labels.map((month, index) => ({
      month,
      imoveis: properties.filter(
        (property) => new Date(property.created_at).getMonth() === index
      ).length,
      leads: leads.filter(
        (lead) => new Date(lead.created_at).getMonth() === index
      ).length,
    }));
  }, [properties, leads]);

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
        <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Carregando BI Urbano...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-8 pb-12 font-sans text-gray-900">
      
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 p-8 shadow-lg shadow-blue-900/20">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute left-0 bottom-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold tracking-wider uppercase backdrop-blur-sm border border-white/10">
                Inteligência
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
              <Activity className="text-blue-400" size={36} />
              BI Urbano
            </h1>
            <p className="text-blue-100 mt-2 text-sm md:text-base max-w-xl">
              Análise aprofundada de carteira, leads, vendas e performance comercial do portfólio urbano.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => toast.info('Exportando PDF...')} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl backdrop-blur-sm transition-all flex items-center gap-2">
              <Download size={18} /> Exportar PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'VGV Disponível',
            value: formatCurrency(stats.vgv),
            icon: DollarSign,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            label: 'Imóveis Urbanos',
            value: String(stats.propertyCount),
            icon: Building2,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            label: 'Leads Ativos',
            value: String(stats.activeLeads),
            icon: Users,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
          },
          {
            label: 'Ticket Médio',
            value: formatCurrency(stats.avgTicket),
            icon: TrendingUp,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
        ].map((item) => (
          <div
            key={item.label}
            className="group relative bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-default hover:-translate-y-1"
          >
            <item.icon className={`absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.03] transform group-hover:scale-110 transition-transform duration-500 ${item.color}`} />
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${item.bg}`}>
              <item.icon className={item.color} size={22} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {item.label}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-gray-900 tracking-tight">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Evolução Mensal</h2>
              <p className="text-xs text-gray-500 mt-1">Comparativo Captações vs Novos Leads</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Leads</div>
               <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Imóveis</div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorImoveis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} dy={10} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="leads" name="Leads" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }} />
                <Area type="monotone" dataKey="imoveis" name="Imóveis" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorImoveis)" activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-bold text-gray-900">Mix de Estoque</h2>
          <div className="h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={5}
                  stroke="none"
                >
                  {typeData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-bold text-gray-900">VGV por Região</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={110} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]}>
                  {cityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col">
          <h2 className="mb-6 text-lg font-bold text-gray-900">Eficácia de Captação (Origem)</h2>
          <div className="flex-1 space-y-5 flex flex-col justify-center">
            {leadSourceData.length === 0 ? (
              <p className="rounded-2xl bg-gray-50 p-8 text-center text-sm font-medium text-gray-400">
                Nenhum lead urbano encontrado.
              </p>
            ) : (
              leadSourceData.map((item, index) => (
                <div key={item.name} className="group">
                  <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-widest text-gray-500">
                    <span className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                       {item.name}
                    </span>
                    <span className="text-gray-900">{item.value} <span className="text-gray-400 font-medium">({Math.round((item.value / leads.length) * 100)}%)</span></span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-100 relative">
                    <div
                      className="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-1000"
                      style={{
                        width: `${Math.max(2, (item.value / Math.max(1, leads.length)) * 100)}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BIUrbano;
