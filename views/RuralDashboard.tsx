import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Home, 
  Activity,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { MOCK_LEADS } from '../constants';

const ruralStats = [
  { label: 'Leads de Alta Compatibilidade', value: '12', change: '+5%', trend: 'up', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Propriedades Georreferenciadas', value: '85', change: '+8%', trend: 'up', icon: Home, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: 'Acessos VIP Data Room', value: '34', change: '+15%', trend: 'up', icon: ShieldCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'Dossiês Técnicos Gerados', value: '56', change: '+24%', trend: 'up', icon: FileText, color: 'text-slate-600', bg: 'bg-slate-50' },
];

const chartData = [
  { name: 'Jan', leads: 40, sales: 24 },
  { name: 'Fev', leads: 30, sales: 13 },
  { name: 'Mar', leads: 20, sales: 98 },
  { name: 'Abr', leads: 27, sales: 39 },
  { name: 'Mai', leads: 18, sales: 48 },
  { name: 'Jun', leads: 23, sales: 38 },
];

const RuralDashboard: React.FC = () => {
  const { settings } = useSettings();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter">Dashboard Rural</h1>
        <p className="text-black/60 font-medium">Sua operação agro imobiliária. Acompanhe áreas georreferenciadas e investidores.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {ruralStats.map((stat, idx) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-black">Acessos à Data Room</h3>
            <select className="bg-slate-50 border-none rounded-lg text-sm font-medium text-slate-600 px-3 py-1.5 outline-none">
              <option>Últimos 6 meses</option>
              <option>Este ano</option>
            </select>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={settings.primaryColor} stopOpacity={0.1}/>
                    <stop offset="95%" stopColor={settings.primaryColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#000000', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#000000', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                />
                <Area type="monotone" dataKey="leads" stroke={settings.primaryColor} strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-black">Investidores Recentes</h3>
            <Link to="/admin/crm" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Ver todos</Link>
          </div>
          <div className="space-y-6">
            {MOCK_LEADS.slice(0, 4).map((lead) => (
              <div key={lead.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                    {lead.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-black">{lead.name}</p>
                    <p className="text-xs text-black/60">{lead.source}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                  lead.status === 'Novo' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {lead.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuralDashboard;
