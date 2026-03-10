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
  BarChart3,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
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
  Cell
} from 'recharts';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'];

const UrbanDashboard: React.FC = () => {
  const { settings } = useSettings();
  const [propertyCount, setPropertyCount] = useState(0);
  const [leadCount, setLeadCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { count: pCount } = await supabase.from('properties').select('id', { count: 'exact' });
      const { count: lCount } = await supabase.from('leads').select('id', { count: 'exact' });
      setPropertyCount(pCount || 0);
      setLeadCount(lCount || 0);
    };
    load();
  }, []);

  const stats = [
    { label: 'Leads Ativos', value: String(leadCount), change: '+12%', trend: 'up', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Estoque Ativo', value: String(propertyCount), change: '+3%', trend: 'up', icon: Home, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Locações Ativas', value: '0', change: '—', trend: 'up', icon: Key, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'VGV em Propostas', value: 'R$ 4.2M', change: '+24%', trend: 'up', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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
    'WhatsApp': 'bg-emerald-100 text-emerald-700',
    'Site': 'bg-blue-100 text-blue-700',
    'Portal': 'bg-purple-100 text-purple-700',
    'Indicação': 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter flex items-center gap-3">
          <Building2 className="text-blue-600" size={32} />
          Dashboard Urbano
        </h1>
        <p className="text-black/60 font-medium">Visão geral da sua operação imobiliária tradicional.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${stat.trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                {stat.change}
                {stat.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              </div>
            </div>
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{stat.label}</h3>
            <p className="text-3xl font-black text-slate-900 italic tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Leads by Channel */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-black">Leads por Canal</h3>
            <select className="bg-slate-50 border-none rounded-lg text-sm font-medium text-slate-600 px-3 py-1.5 outline-none">
              <option>Últimos 6 meses</option>
              <option>Este ano</option>
            </select>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={channelData}>
                <defs>
                  <linearGradient id="colorWA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.1}/><stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSite" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                <Area type="monotone" dataKey="whatsapp" name="WhatsApp" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorWA)" />
                <Area type="monotone" dataKey="site" name="Site" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorSite)" />
                <Area type="monotone" dataKey="portal" name="Portal" stroke="#7c3aed" strokeWidth={2} fillOpacity={0} />
                <Area type="monotone" dataKey="indicacao" name="Indicação" stroke="#d97706" strokeWidth={2} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock by Type */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-black mb-6">Estoque por Tipo</h3>
          <div className="h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                  {typeData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1.5">
            {typeData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-bold text-slate-800">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conversion + Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Conversion by Broker */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-black mb-6">Conversão por Corretor</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#0f172a', fontSize: 12}} width={80} />
                <Tooltip contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="leads" name="Leads" fill="#bfdbfe" radius={[0, 4, 4, 0]} />
                <Bar dataKey="vendas" name="Vendas" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-black">Leads Recentes</h3>
            <Link to="/urban/crm" className="text-sm font-semibold text-blue-600 hover:text-blue-700">Ver CRM</Link>
          </div>
          <div className="space-y-4">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                    {lead.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-black">{lead.name}</p>
                    <p className="text-xs text-slate-400">{lead.interest}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${channelColors[lead.channel]}`}>
                    {lead.channel}
                  </span>
                  <span className="text-xs text-slate-400">{lead.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link to="/urban/properties/new" className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl text-blue-700 hover:bg-blue-100 transition-all font-medium text-sm">
          <Home size={20} /> Novo Imóvel
        </Link>
        <Link to="/urban/empreendimentos" className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl text-indigo-700 hover:bg-indigo-100 transition-all font-medium text-sm">
          <Building2 size={20} /> Empreendimentos
        </Link>
        <Link to="/urban/locacao" className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl text-amber-700 hover:bg-amber-100 transition-all font-medium text-sm">
          <Key size={20} /> Locação
        </Link>
        <Link to="/urban/exportador" className="flex items-center gap-3 p-4 bg-purple-50 rounded-2xl text-purple-700 hover:bg-purple-100 transition-all font-medium text-sm">
          <TrendingUp size={20} /> Exportar Portais
        </Link>
      </div>
    </div>
  );
};

export default UrbanDashboard;
