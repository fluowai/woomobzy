import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Users as UsersIcon,
  ShieldCheck,
  FileText,
  Search,
  Plus,
  ArrowUpRight,
  Wheat,
  Activity,
  Map as MapIcon,
  Target,
  Briefcase
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
} from 'recharts';

const RuralDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [propertyCount, setPropertyCount] = useState(0);
  const [leadCount, setLeadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.organization_id) return;

    const loadData = async () => {
      try {
        const { count: pCount } = await supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id);

        const { count: lCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id);

        setPropertyCount(pCount || 0);
        setLeadCount(lCount || 0);
      } catch (err) {
        console.error('Loader error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [profile?.organization_id]);

  const kpis = [
    { label: 'PROPRIEDADES', value: String(propertyCount), change: '+12%', icon: Wheat, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'INVESTIDORES', value: String(leadCount), change: '+5%', icon: UsersIcon, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'DUE DILIGENCE', value: '18', change: '+8%', icon: ShieldCheck, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'NEGÓCIOS (MÊS)', value: 'R$ 8.2M', change: '+24%', icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  const chartData = [
    { name: 'Jan', valor: 45 },
    { name: 'Fev', valor: 52 },
    { name: 'Mar', valor: 48 },
    { name: 'Abr', valor: 61 },
    { name: 'Mai', valor: 55 },
    { name: 'Jun', valor: 67 },
  ];

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] mb-1">Visão Geral</h1>
        <p className="text-sm text-[#64748B]">Gerenciamento de ativos e performance comercial.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="card-premium flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${kpi.bg}`}>
                <kpi.icon size={20} className={kpi.color} />
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                {kpi.change}
                <ArrowUpRight size={14} />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.1em] mb-1">{kpi.label}</p>
              <h2 className="text-2xl font-bold text-[#0F172A]">{kpi.value}</h2>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Chart */}
        <div className="lg:col-span-2 card-premium">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">Volume de Negociações</h3>
              <p className="text-xs text-[#64748B]">Variação mensal de captação em milhões (R$)</p>
            </div>
            <select className="text-xs font-bold text-[#64748B] bg-[#F8FAFC] border-none rounded-lg px-3 py-2 outline-none cursor-pointer hover:bg-slate-100 transition-colors">
              <option>Últimos 6 meses</option>
              <option>Este ano</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94A3B8', fontSize: 11, fontWeight: 500}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94A3B8', fontSize: 11, fontWeight: 500}}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="valor" 
                  stroke="#22C55E" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorVal)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions & Tasks */}
        <div className="space-y-6">
          <div className="card-premium">
            <h3 className="text-sm font-bold text-[#0F172A] mb-4 uppercase tracking-wider">Ações Estratégicas</h3>
            <div className="space-y-2">
              <button className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-50 transition-all group text-left border border-transparent hover:border-slate-100">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <Activity size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">Análise Fundiária</p>
                  <p className="text-[10px] text-[#64748B]">Sincronizar dados do CAR/SIGEF</p>
                </div>
              </button>
              <button className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-50 transition-all group text-left border border-transparent hover:border-slate-100">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <Target size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">Inteligência Comercial</p>
                  <p className="text-[10px] text-[#64748B]">Mapa de calor de investidores</p>
                </div>
              </button>
              <button className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-50 transition-all group text-left border border-transparent hover:border-slate-100">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <Briefcase size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">Novo Prospecto</p>
                  <p className="text-[10px] text-[#64748B]">Criar apresentação personalizada</p>
                </div>
              </button>
            </div>
          </div>

          <div className="card-premium bg-[#0F172A] border-none text-white">
            <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-[0.15em]">Meta de Captação</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">R$ 12.5M / R$ 15M</span>
              <span className="text-xs font-bold text-emerald-400">82%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '82%' }} />
            </div>
            <p className="mt-4 text-[10px] text-slate-400 leading-relaxed font-medium">
              Você está a apenas R$ 2.5M da meta trimestral. Mantenha o foco em grandes ativos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuralDashboard;
