import React, { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Home,
  DollarSign,
  Key,
  Building2,
  TrendingUp,
  MapPin,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import { Link } from 'react-router-dom';
import IADashboardSummary from '../components/IADashboardSummary';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const BRAND_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#3b82f6', '#ec4899'];

const URBAN_TYPES = [
  'Apartamento',
  'Casa',
  'Sobrado',
  'Terreno Urbano',
  'Sala Comercial',
  'Galpão Industrial',
  'Galpao Industrial',
  'Loft',
  'Studio',
  'Cobertura',
];

const UrbanDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [propertyCount, setPropertyCount] = useState(0);
  const [leadCount, setLeadCount] = useState(0);
  const [vgv, setVgv] = useState(0);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [urbanProperties, setUrbanProperties] = useState<any[]>([]);
  const [urbanLeads, setUrbanLeads] = useState<any[]>([]);
  const [propertyStats, setPropertyStats] = useState({
    available: 0,
    sold: 0,
    rented: 0,
  });

  useEffect(() => {
    if (!profile?.organization_id) return;

    const load = async () => {
      const organizationId = profile.organization_id;
      // 1. Contagem Total de Imóveis Urbanos
      const { count: pCount } = await supabase
        .from('properties')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .or(`niche.eq.urbano,property_type.in.(${URBAN_TYPES.map((type) => `"${type}"`).join(',')})`);

      // 2. Contagem por Status
      const { data: pByStatus } = await supabase
        .from('properties')
        .select('id,status,price,property_type,niche,created_at')
        .eq('organization_id', organizationId)
        .or(`niche.eq.urbano,property_type.in.(${URBAN_TYPES.map((type) => `"${type}"`).join(',')})`);

      const statsMap = { available: 0, sold: 0, rented: 0 };
      pByStatus?.forEach((p) => {
        if (p.status === 'Disponível') statsMap.available++;
        if (p.status === 'Vendido') statsMap.sold++;
        if (p.status === 'Alugado') statsMap.rented++;
      });

      // 3. VGV (Valor Geral de Vendas)
      const totalVgv =
        pByStatus
          ?.filter((p) => p.status === 'Disponível' || p.status === 'Disponivel')
          .reduce((sum, p) => sum + (p.price || 0), 0) || 0;

      // 4. Contagem de Leads
      const { count: lCount } = await supabase
        .from('leads')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .or('match_profile.eq.urbano,match_profile.is.null');

      // 5. Leads Recentes Reais
      const { data: rLeads } = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', organizationId)
        .or('match_profile.eq.urbano,match_profile.is.null')
        .order('created_at', { ascending: false })
        .limit(4);

      const { data: allLeads } = await supabase
        .from('leads')
        .select('id,source,status,created_at,assigned_to,match_profile')
        .eq('organization_id', organizationId)
        .or('match_profile.eq.urbano,match_profile.is.null')
        .order('created_at', { ascending: false });

      setPropertyCount(pCount || 0);
      setLeadCount(lCount || 0);
      setVgv(totalVgv);
      setPropertyStats(statsMap);
      setRecentLeads(rLeads || []);
      setUrbanProperties(pByStatus || []);
      setUrbanLeads(allLeads || []);
    };
    load();
  }, [profile?.organization_id]);

  const stats = [
    {
      label: 'Leads Ativos',
      value: String(leadCount),
      change: '+12%',
      trend: 'up',
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      iconBg: 'bg-indigo-100',
      shadowColor: 'shadow-indigo-500/20'
    },
    {
      label: 'Imóveis Disponíveis',
      value: String(propertyStats.available),
      change: '+3%',
      trend: 'up',
      icon: Home,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      shadowColor: 'shadow-emerald-500/20'
    },
    {
      label: 'Locações Ativas',
      value: String(propertyStats.rented),
      change: '—',
      trend: 'neutral',
      icon: Key,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      shadowColor: 'shadow-amber-500/20'
    },
    {
      label: 'VGV em Estoque',
      value: `R$ ${(vgv / 1000000).toFixed(1)}M`,
      change: '+24%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      shadowColor: 'shadow-blue-500/20'
    },
  ];

  const channelData = React.useMemo(() => {
    const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    return labels.map((name, month) => {
      const monthLeads = urbanLeads.filter(
        (lead) => new Date(lead.created_at).getMonth() === month
      );
      const countBySource = (source: string) =>
        monthLeads.filter((lead) => String(lead.source || '').toLowerCase().includes(source)).length;

      return {
        name,
        whatsapp: countBySource('whatsapp'),
        site: countBySource('site'),
        portal: countBySource('portal'),
        indicacao: countBySource('indica'),
      };
    });
  }, [urbanLeads]);

  const conversionData = React.useMemo(() => {
    const grouped: Record<string, { name: string; leads: number; vendas: number }> = {};
    urbanLeads.forEach((lead) => {
      const key = lead.assigned_to || 'Sem corretor';
      grouped[key] = grouped[key] || {
        name: key === 'Sem corretor' ? key : `Corretor ${String(key).slice(0, 4)}`,
        leads: 0,
        vendas: 0,
      };
      grouped[key].leads++;
      if (['convertido', 'vendido', 'fechado'].includes(String(lead.status || '').toLowerCase())) {
        grouped[key].vendas++;
      }
    });
    return Object.values(grouped).slice(0, 6);
  }, [urbanLeads]);

  const typeData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    urbanProperties.forEach((property) => {
      const type = property.property_type || 'Outros';
      counts[type] = (counts[type] || 0) + 1;
    });
    // sort and take top 5
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [urbanProperties]);

  const channelColors: Record<string, string> = {
    WhatsApp: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Site: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    Portal: 'bg-amber-100 text-amber-700 border-amber-200',
    Indicação: 'bg-blue-100 text-blue-700 border-blue-200',
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

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-8 pb-12 font-sans text-gray-900">
      
      {/* Header Premium */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 p-8 shadow-lg shadow-indigo-900/20">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute left-0 bottom-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold tracking-wider uppercase backdrop-blur-sm border border-white/10">
                Visão Geral
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
              <Building2 className="text-indigo-400" size={36} />
              Dashboard Urbano
            </h1>
            <p className="text-indigo-200 mt-2 text-sm md:text-base max-w-xl">
              Acompanhe o desempenho da sua operação imobiliária urbana em tempo real.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link to="/urban/properties/new" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2">
              <Home size={18} /> Novo Imóvel
            </Link>
            <button className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl backdrop-blur-sm transition-all">
              Gerar Relatório
            </button>
          </div>
        </div>
      </div>

      {/* IA Summary (Keep if exists, just wrap in a nice card if needed) */}
      <IADashboardSummary />

      {/* Premium Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="group relative bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-default hover:-translate-y-1"
          >
            {/* Background Icon */}
            <stat.icon className={`absolute -right-6 -bottom-6 w-32 h-32 opacity-[0.03] transform group-hover:scale-110 transition-transform duration-500 ${stat.color}`} />
            
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              
              {stat.trend !== 'neutral' && (
                <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${stat.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {stat.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {stat.change}
                </div>
              )}
            </div>
            
            <div className="relative z-10">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                {stat.label}
              </p>
              <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {stat.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads by Channel */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Origem de Leads</h3>
              <p className="text-xs text-gray-500 mt-1">Evolução de captação por canal nos últimos 6 meses</p>
            </div>
            <select className="bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium">
              <option>Últimos 6 meses</option>
              <option>Este ano</option>
            </select>
          </div>
          
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={channelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSite" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="whatsapp" name="WhatsApp" stroke="#10b981" strokeWidth={3} fill="url(#colorWA)" activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
                <Area type="monotone" dataKey="site" name="Site" stroke="#6366f1" strokeWidth={3} fill="url(#colorSite)" activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock by Type */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900">Estoque por Tipo</h3>
            <p className="text-xs text-gray-500 mt-1">Distribuição do portfólio ativo</p>
          </div>
          
          <div className="flex-1 min-h-[200px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {typeData.map((_, idx) => (
                    <Cell key={idx} fill={BRAND_COLORS[idx % BRAND_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-gray-900">{typeData.reduce((a, b) => a + b.value, 0)}</span>
              <span className="text-[10px] uppercase font-bold text-gray-400">Total</span>
            </div>
          </div>
          
          <div className="mt-6 space-y-3">
            {typeData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: BRAND_COLORS[idx % BRAND_COLORS.length] }} />
                  <span className="text-sm font-medium text-gray-700">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conversion + Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Leads */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Leads Recentes</h3>
              <p className="text-xs text-gray-500 mt-1">Últimos contatos captados</p>
            </div>
            <Link to="/urban/crm" className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
              Ver CRM <ChevronRight size={16} />
            </Link>
          </div>
          
          <div className="space-y-4">
            {recentLeads.map((lead) => (
              <Link
                key={lead.id}
                to={`/urban/crm?leadId=${lead.id}`}
                className="group flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 bg-gray-50/50 hover:bg-white transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shadow-inner">
                    {lead.name?.charAt(0) || 'L'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">
                      {lead.name}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={12} className="text-gray-400" />
                      <p className="text-xs font-medium text-gray-500 truncate max-w-[150px]">
                        {lead.property?.title || 'Interesse Geral'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border ${channelColors[lead.source] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {lead.source || 'Site'}
                  </span>
                  <span className="text-[11px] font-medium text-gray-400">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
            {recentLeads.length === 0 && (
              <div className="text-center py-10">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="text-gray-400" size={20} />
                </div>
                <p className="text-gray-500 text-sm font-medium">Nenhum lead recente.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & More */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
             <h3 className="text-lg font-bold text-gray-900 mb-6">Acesso Rápido</h3>
             <div className="grid grid-cols-2 gap-4">
                <Link to="/urban/empreendimentos" className="group p-4 border border-gray-100 rounded-xl hover:border-indigo-200 hover:shadow-md hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-indigo-700">Empreendimentos</h4>
                    <p className="text-[11px] text-gray-500 font-medium mt-1">Gerenciar lançamentos</p>
                  </div>
                </Link>
                <Link to="/urban/locacao" className="group p-4 border border-gray-100 rounded-xl hover:border-emerald-200 hover:shadow-md hover:bg-emerald-50/30 transition-all flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                    <Key size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-emerald-700">Gestão de Locação</h4>
                    <p className="text-[11px] text-gray-500 font-medium mt-1">Contratos e Inquilinos</p>
                  </div>
                </Link>
             </div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 shadow-lg relative overflow-hidden text-white">
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/5 rounded-full blur-2xl translate-x-1/3 translate-y-1/3"></div>
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Exportador de Portais</h3>
                <p className="text-sm text-gray-300 font-medium max-w-[200px] leading-relaxed">
                  Sincronize seus imóveis com Zap, Viva Real e OLX automaticamente.
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                <TrendingUp size={20} className="text-emerald-400" />
              </div>
            </div>
            <Link to="/urban/exportador" className="relative z-10 mt-6 w-full py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-bold text-white flex items-center justify-center transition-colors">
              Configurar Exportação
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
};

export default UrbanDashboard;
