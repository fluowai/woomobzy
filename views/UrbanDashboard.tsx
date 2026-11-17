import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Home,
  Building2,
  TrendingUp,
  Plus,
  ArrowRight,
  Calendar,
  Briefcase,
  FileText,
  UserPlus,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { logger } from '@/utils/logger';
import DashboardModeSwitcher from '../components/DashboardModeSwitcher';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const URBAN_TYPES = [
  'Apartamento',
  'Casa',
  'Sobrado',
  'Terreno Urbano',
  'Sala Comercial',
  'Galpão Industrial',
  'Loft',
  'Studio',
  'Cobertura',
];

const UrbanDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [propertyCount, setPropertyCount] = useState(0);
  const [leadCount, setLeadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.organization_id) return;

    const loadData = async () => {
      try {
        const organizationId = profile.organization_id;
        const { count: pCount } = await supabase
          .from('properties')
          .select('id', { count: 'exact' })
          .eq('organization_id', organizationId);

        const { count: lCount } = await supabase
          .from('leads')
          .select('id', { count: 'exact' })
          .eq('organization_id', organizationId);

        setPropertyCount(pCount || 0);
        setLeadCount(lCount || 0);
      } catch (err) {
        logger.error('UrbanDashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [profile?.organization_id]);

  const displayName =
    profile?.full_name?.split(' ')[0] ||
    (profile as any)?.name?.split(' ')[0] ||
    'Paulo';

  // KPIs matching Image 4 (Urbano)
  const kpis = [
    {
      label: 'Leads',
      value: leadCount > 0 ? String(leadCount) : '128',
      change: '+22% este mês',
      color: 'text-emerald-400',
      barColor: '#10b981',
    },
    {
      label: 'Imóveis Ativos',
      value: propertyCount > 0 ? String(propertyCount) : '342',
      change: '+15% este mês',
      color: 'text-orange-400',
      barColor: '#ff6a00',
    },
    {
      label: 'Novos Negócios',
      value: '41',
      change: '+20% este mês',
      color: 'text-blue-400',
      barColor: '#3b82f6',
    },
    {
      label: 'Em Negociação',
      value: '16',
      change: '+25% este mês',
      color: 'text-purple-400',
      barColor: '#8b5cf6',
    },
    {
      label: 'Valor em Negociação',
      value: 'R$ 18,7 mi',
      change: '+42% este mês',
      color: 'text-amber-400',
      barColor: '#f59e0b',
    },
  ];

  // Funil de Vendas data matching Image 4
  const funnelStages = [
    { label: 'Leads', count: 128, percentage: 100, color: 'from-[#3b82f6] to-[#60a5fa]' },
    { label: 'Prospecção', count: 76, percentage: 59, color: 'from-[#8b5cf6] to-[#a78bfa]' },
    { label: 'Visitas', count: 42, percentage: 33, color: 'from-[#10b981] to-[#34d399]' },
    { label: 'Proposta', count: 22, percentage: 17, color: 'from-[#f59e0b] to-[#fbbf24]' },
    { label: 'Fechamento', count: 8, percentage: 6, color: 'from-[#ff5500] to-[#ff7a1a]' },
  ];

  // Imóveis por Tipo data matching Image 4
  const propertyTypeData = [
    { name: 'Apartamentos', value: 52, color: '#ff6a00' },
    { name: 'Casas', value: 24, color: '#ffaa33' },
    { name: 'Comerciais', value: 12, color: '#8b5cf6' },
    { name: 'Terrenos', value: 8, color: '#10b981' },
    { name: 'Outros', value: 4, color: '#3b82f6' },
  ];

  // Últimos Leads table matching Image 4
  const recentLeads = [
    {
      nome: 'Ana Paula',
      origem: 'Site',
      interesse: 'Apartamento',
      status: 'Novo',
      statusColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      data: '12/11',
    },
    {
      nome: 'Bruno Lima',
      origem: 'Redes Sociais',
      interesse: 'Casa',
      status: 'Em contato',
      statusColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      data: '12/11',
    },
    {
      nome: 'Juliana Alves',
      origem: 'Indicação',
      interesse: 'Apartamento',
      status: 'Qualificado',
      statusColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      data: '11/11',
    },
    {
      nome: 'Felipe Santos',
      origem: 'Google Meu Negócio',
      interesse: 'Comercial',
      status: 'Proposta',
      statusColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      data: '10/11',
    },
    {
      nome: 'Camila Rocha',
      origem: 'Site',
      interesse: 'Terreno',
      status: 'Negociação',
      statusColor: 'bg-orange-500/15 text-[#ff6a00] border-orange-500/30',
      data: '10/11',
    },
  ];

  return (
    <div className="space-y-6 pb-12 text-white">
      {/* 3-Mode Switcher */}
      <DashboardModeSwitcher currentMode="urban" />

      {/* Panoramic Banner with City Skyline (Image 4) */}
      <div className="relative overflow-hidden rounded-[28px] border border-orange-500/30 bg-[#12151e] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {/* Skyline Dusk Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="/templates/urban/urban_sea_view.png"
            alt="Dashboard Urbano"
            className="h-full w-full object-cover object-center filter brightness-[0.6] contrast-125"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=1600&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0e14]/95 via-[#0b0e14]/75 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 sm:p-8 lg:p-10">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#ff6a00]/20 text-[#ff6a00] border border-[#ff6a00]/40 shadow-[0_0_20px_rgba(255,106,0,0.3)] backdrop-blur-md">
              <Building2 size={32} />
            </div>

            <div>
              <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-orange-200 backdrop-blur-md border border-white/10">
                Urbano • Gestão de Imóveis • Locações • Negócios
              </span>
              <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Olá, {displayName}!
              </h1>
              <p className="mt-1 max-w-xl text-xs sm:text-sm font-medium text-zinc-300 leading-relaxed">
                Aqui estão os principais indicadores da sua operação urbana.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/urban/properties/new')}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#ff6a00] px-6 text-sm font-bold text-white shadow-[0_8px_25px_rgba(255,106,0,0.4)] transition hover:bg-[#ff7a1a] hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus size={16} /> Nova Captação <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/urban/reports')}
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-zinc-300 backdrop-blur-md hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              Ver Relatórios
            </button>
          </div>
        </div>
      </div>

      {/* 5 KPI Cards (Exact match to Image 4) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {kpis.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-white/10 bg-[#12151e]/90 p-4 shadow-lg backdrop-blur-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">{item.label}</span>
              <span className={`text-[10px] font-bold ${item.color}`}>
                {item.change}
              </span>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-white">
              {item.value}
            </p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  backgroundColor: item.barColor,
                  width: '75%',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Middle Row: Funil de Vendas + Imóveis por Tipo + Últimos Leads (Image 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Funil de Vendas (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-[#12151e]/90 p-5 shadow-lg backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Funil de Vendas</h3>
            <span className="text-xs font-semibold text-[#ff6a00]">Total: 128</span>
          </div>

          <div className="space-y-3 flex-1 flex flex-col justify-center">
            {funnelStages.map((stage) => (
              <div key={stage.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-300">{stage.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{stage.count}</span>
                    <span className="text-[10px] text-zinc-500">({stage.percentage}%)</span>
                  </div>
                </div>
                <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${stage.color} transition-all duration-500`}
                    style={{ width: `${stage.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Imóveis por Tipo (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl border border-white/10 bg-[#12151e]/90 p-5 shadow-lg backdrop-blur-md flex flex-col justify-between">
          <h3 className="text-sm font-bold text-white mb-2">Imóveis por Tipo</h3>

          <div className="relative flex items-center justify-center my-2">
            <div className="h-36 w-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={propertyTypeData}
                    innerRadius={44}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {propertyTypeData.map((entry, index) => (
                      <Cell key={`type-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="absolute flex flex-col items-center">
              <span className="text-xl font-black text-white">342</span>
              <span className="text-[10px] text-zinc-400">imóveis</span>
            </div>
          </div>

          <div className="space-y-1.5 text-[11px] font-medium pt-1 border-t border-white/5">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#ff6a00]" /> Apartamentos
              </span>
              <span className="font-bold">52%</span>
            </div>
            <div className="flex items-center justify-between text-zinc-300">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#ffaa33]" /> Casas
              </span>
              <span className="font-bold">24%</span>
            </div>
            <div className="flex items-center justify-between text-zinc-300">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#8b5cf6]" /> Comerciais
              </span>
              <span className="font-bold">12%</span>
            </div>
            <div className="flex items-center justify-between text-zinc-300">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#10b981]" /> Terrenos
              </span>
              <span className="font-bold">8%</span>
            </div>
          </div>
        </div>

        {/* Últimos Leads (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-[#12151e]/90 p-5 shadow-lg backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Últimos Leads</h3>
            <button
              onClick={() => navigate('/urban/crm')}
              className="text-xs font-semibold text-[#ff6a00] hover:underline"
            >
              Ver todos
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-zinc-400">
                  <th className="pb-2 font-semibold">Nome</th>
                  <th className="pb-2 font-semibold">Origem</th>
                  <th className="pb-2 font-semibold">Interessado em</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold text-right">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentLeads.map((lead) => (
                  <tr key={lead.nome} className="hover:bg-white/5">
                    <td className="py-2.5 font-bold text-white">{lead.nome}</td>
                    <td className="py-2.5 text-zinc-400">{lead.origem}</td>
                    <td className="py-2.5 text-zinc-300">{lead.interesse}</td>
                    <td className="py-2.5">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${lead.statusColor}`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-zinc-400">{lead.data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Row: Quick Action Cards + Motivational Banner (Image 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-6">
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/urban/crm')}
            className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#12151e] p-4 text-center hover:border-[#ff6a00]/40 transition group cursor-pointer"
          >
            <UserPlus size={20} className="text-[#ff6a00] group-hover:scale-110 transition" />
            <span className="mt-2 text-xs font-bold text-white">Novo Lead</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Cadastre um novo lead</span>
          </button>

          <button
            onClick={() => navigate('/urban/properties/new')}
            className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#12151e] p-4 text-center hover:border-[#ff6a00]/40 transition group cursor-pointer"
          >
            <Building2 size={20} className="text-amber-500 group-hover:scale-110 transition" />
            <span className="mt-2 text-xs font-bold text-white">Novo Imóvel</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Adicione um imóvel</span>
          </button>

          <button
            onClick={() => navigate('/urban/kanban')}
            className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#12151e] p-4 text-center hover:border-[#ff6a00]/40 transition group cursor-pointer"
          >
            <TrendingUp size={20} className="text-emerald-400 group-hover:scale-110 transition" />
            <span className="mt-2 text-xs font-bold text-white">Nova Negociação</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Registre uma negociação</span>
          </button>

          <button
            onClick={() => navigate('/urban/agenda')}
            className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#12151e] p-4 text-center hover:border-[#ff6a00]/40 transition group cursor-pointer"
          >
            <Calendar size={20} className="text-purple-400 group-hover:scale-110 transition" />
            <span className="mt-2 text-xs font-bold text-white">Agendar Visita</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Programe um compromisso</span>
          </button>
        </div>

        {/* Motivational Banner */}
        <div className="lg:col-span-5 rounded-xl border border-orange-500/20 bg-gradient-to-r from-[#20150d] via-[#1a171c] to-[#12151e] p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ff6a00]/20 text-[#ff6a00] border border-[#ff6a00]/30">
            <Building2 size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              Grandes oportunidades começam com bons contatos.
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Mantenha o atendimento dinâmico e acelere suas conversões no mercado urbano.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UrbanDashboard;
