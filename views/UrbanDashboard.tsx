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
} from 'lucide-react';
import { Link } from 'react-router-dom';
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

const BRAND_COLORS = ['#007850', '#f59600', '#7c3aed', '#d97706', '#0891b2'];

const UrbanDashboard: React.FC = () => {
  const [propertyCount, setPropertyCount] = useState(0);
  const [leadCount, setLeadCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { count: pCount } = await supabase
        .from('properties')
        .select('id', { count: 'exact' })
        .not('property_type', 'in', '("Rural","Fazenda")');
      const { count: lCount } = await supabase
        .from('leads')
        .select('id', { count: 'exact' });
      setPropertyCount(pCount || 0);
      setLeadCount(lCount || 0);
    };
    load();
  }, []);

  const stats = [
    {
      label: 'Leads Ativos',
      value: String(leadCount),
      change: '+12%',
      trend: 'up',
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
      borderColor: 'border-primary/20',
    },
    {
      label: 'Estoque Ativo',
      value: String(propertyCount),
      change: '+3%',
      trend: 'up',
      icon: Home,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
    {
      label: 'Locações Ativas',
      value: '0',
      change: '—',
      trend: 'neutral',
      icon: Key,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
    },
    {
      label: 'VGV em Propostas',
      value: 'R$ 4.2M',
      change: '+24%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10',
      borderColor: 'border-teal-500/20',
    },
  ];

  const channelData = [
    { name: 'Jan', whatsapp: 20, site: 12, portal: 8, indicacao: 5 },
    { name: 'Fev', whatsapp: 25, site: 15, portal: 10, indicacao: 7 },
    { name: 'Mar', whatsapp: 18, site: 20, portal: 14, indicacao: 6 },
    { name: 'Abr', whatsapp: 30, site: 18, portal: 12, indicacao: 9 },
    { name: 'Mai', whatsapp: 28, site: 22, portal: 16, indicacao: 8 },
    { name: 'Jun', whatsapp: 35, site: 25, portal: 18, indicacao: 11 },
  ];

  const conversionData = [
    { name: 'Carlos S.', leads: 15, vendas: 3 },
    { name: 'Ana M.', leads: 22, vendas: 5 },
    { name: 'Roberto L.', leads: 12, vendas: 2 },
    { name: 'Julia P.', leads: 18, vendas: 4 },
  ];

  const typeData = [
    { name: 'Apartamento', value: 45 },
    { name: 'Casa', value: 25 },
    { name: 'Comercial', value: 15 },
    { name: 'Terreno', value: 10 },
    { name: 'Lançamento', value: 5 },
  ];

  const recentLeads = [
    { id: 1, name: 'Marcos Silva', interest: 'Apt 3Q - Centro', channel: 'WhatsApp', time: '2min' },
    { id: 2, name: 'Fernanda Lima', interest: 'Casa - Jardins', channel: 'Site', time: '15min' },
    { id: 3, name: 'Paulo Costa', interest: 'Sala Comercial', channel: 'Portal', time: '1h' },
    { id: 4, name: 'Carla Nunes', interest: 'Cobertura', channel: 'Indicação', time: '3h' },
  ];

  const channelColors: Record<string, string> = {
    WhatsApp: 'bg-primary/15 text-primary',
    Site: 'bg-purple-500/15 text-purple-400',
    Portal: 'bg-amber-500/15 text-amber-400',
    Indicação: 'bg-teal-500/15 text-teal-400',
  };

  const tooltipStyle = {
    backgroundColor: '#12151c',
    borderRadius: '12px',
    border: '1px solid #1e293b',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    color: '#f8fafc',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
          <span className="p-2 bg-primary/10 rounded-xl border border-primary/20">
            <Building2 className="text-primary" size={24} />
          </span>
          Dashboard Urbano
        </h1>
        <p className="text-text-secondary mt-2 ml-1">
          Visão geral da sua operação imobiliária.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className={`p-6 rounded-2xl border bg-bg-card transition-all hover-lift cursor-default ${stat.borderColor} hover:border-opacity-60`}
            style={{ borderColor: `var(--color-border-subtle)` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl border ${stat.bg} ${stat.color} ${stat.borderColor}`}>
                <stat.icon size={20} />
              </div>
              {stat.trend !== 'neutral' && (
                <div
                  className={`flex items-center gap-1 text-[11px] font-semibold ${
                    stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {stat.change}
                  {stat.trend === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                </div>
              )}
            </div>
            <p className="text-text-tertiary text-xs font-medium uppercase tracking-widest mb-1">
              {stat.label}
            </p>
            <p className="text-3xl font-bold text-text-primary tracking-tight">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads by Channel */}
        <div className="lg:col-span-2 bg-bg-card p-6 rounded-2xl border border-border-subtle">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-text-primary">Leads por Canal</h3>
            <select className="bg-bg-hover border border-border-subtle rounded-lg text-sm text-text-secondary px-3 py-1.5 outline-none focus:border-primary transition-colors">
              <option>Últimos 6 meses</option>
              <option>Este ano</option>
            </select>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={channelData}>
                <defs>
                  <linearGradient id="colorWA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#007850" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#007850" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSite" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="whatsapp" name="WhatsApp" stroke="#007850" strokeWidth={2} fillOpacity={1} fill="url(#colorWA)" />
                <Area type="monotone" dataKey="site" name="Site" stroke="#7c3aed" strokeWidth={2} fillOpacity={1} fill="url(#colorSite)" />
                <Area type="monotone" dataKey="portal" name="Portal" stroke="#f59600" strokeWidth={2} fillOpacity={0} />
                <Area type="monotone" dataKey="indicacao" name="Indicação" stroke="#0891b2" strokeWidth={2} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock by Type */}
        <div className="bg-bg-card p-6 rounded-2xl border border-border-subtle">
          <h3 className="text-base font-semibold text-text-primary mb-6">Estoque por Tipo</h3>
          <div className="h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={4} dataKey="value">
                  {typeData.map((_, idx) => (
                    <Cell key={idx} fill={BRAND_COLORS[idx % BRAND_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {typeData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BRAND_COLORS[idx] }} />
                  <span className="text-text-secondary">{item.name}</span>
                </div>
                <span className="font-semibold text-text-primary">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conversion + Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion by Broker */}
        <div className="bg-bg-card p-6 rounded-2xl border border-border-subtle">
          <h3 className="text-base font-semibold text-text-primary mb-6">Conversão por Corretor</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} width={80} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="leads" name="Leads" fill="#1e293b" radius={[0, 4, 4, 0]} />
                <Bar dataKey="vendas" name="Vendas" fill="#007850" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-bg-card p-6 rounded-2xl border border-border-subtle">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-text-primary">Leads Recentes</h3>
            <Link to="/urban/crm" className="text-xs font-semibold text-primary hover:underline">
              Ver CRM →
            </Link>
          </div>
          <div className="space-y-3">
            {recentLeads.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between p-3 rounded-xl bg-bg-hover border border-border-subtle hover:border-primary/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                    {lead.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{lead.name}</p>
                    <p className="text-xs text-text-tertiary">{lead.interest}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full uppercase tracking-wider ${channelColors[lead.channel]}`}>
                    {lead.channel}
                  </span>
                  <span className="text-xs text-text-tertiary">{lead.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          to="/urban/properties/new"
          className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary hover:bg-primary/20 transition-all font-medium text-sm hover-lift"
        >
          <Home size={18} /> Novo Imóvel
        </Link>
        <Link
          to="/urban/empreendimentos"
          className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 hover:bg-purple-500/20 transition-all font-medium text-sm hover-lift"
        >
          <Building2 size={18} /> Empreendimentos
        </Link>
        <Link
          to="/urban/locacao"
          className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 hover:bg-amber-500/20 transition-all font-medium text-sm hover-lift"
        >
          <Key size={18} /> Locação
        </Link>
        <Link
          to="/urban/exportador"
          className="flex items-center gap-3 p-4 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-400 hover:bg-teal-500/20 transition-all font-medium text-sm hover-lift"
        >
          <TrendingUp size={18} /> Exportar Portais
        </Link>
      </div>
    </div>
  );
};

export default UrbanDashboard;
