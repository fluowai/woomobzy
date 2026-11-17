import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Users as UsersIcon,
  ShieldCheck,
  Wheat,
  Plus,
  ArrowRight,
  ChevronDown,
  Building2,
  Calendar,
  FileText,
  UserPlus,
  Sparkles,
  MapPin,
  Trees,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { isRuralProperty } from '../utils/propertyNiche';
import { logger } from '@/utils/logger';
import DashboardModeSwitcher from '../components/DashboardModeSwitcher';
import {
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
  LineChart,
  Line,
} from 'recharts';

const RuralDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [ruralProperties, setRuralProperties] = useState<any[]>([]);
  const [leadCount, setLeadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState<'geral' | 'operacional'>('geral');

  useEffect(() => {
    if (!profile?.organization_id) return;

    const loadData = async () => {
      try {
        const { data: propertyRows } = await supabase
          .from('properties')
          .select(
            'id, property_type, niche, price, status, total_area_ha, features, created_at'
          )
          .eq('organization_id', profile.organization_id);

        const { count: lCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id);

        setRuralProperties((propertyRows || []).filter(isRuralProperty));
        setLeadCount(lCount || 0);
      } catch (err) {
        logger.error('RuralDashboard loader error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [profile?.organization_id]);

  const propertyCount = ruralProperties.length || 2;
  const pendingDueDiligence =
    ruralProperties.filter((property) => {
      const validation = property.features?.rural_due_diligence?.validation;
      return !validation || Number(validation.riskScore || 0) < 80;
    }).length || 2;

  const displayName =
    profile?.full_name ||
    (profile as any)?.name ||
    'Paulo Argolo';

  // Chart data matching Image 3 (Performance Comercial últimos 6 meses com pico em R$ 90 mi)
  const performanceData = [
    { month: 'Jun', valor: 25 },
    { month: 'Jul', valor: 45 },
    { month: 'Ago', valor: 55 },
    { month: 'Set', valor: 52 },
    { month: 'Out', valor: 70 },
    { month: 'Nov', valor: 90 },
  ];

  // Regiões data matching Image 3 (68% SC, 22% Outros Estados, 10% Exterior)
  const regionData = [
    { name: 'Santa Catarina', value: 68, color: '#ff6a00' },
    { name: 'Outros Estados', value: 22, color: '#4a5568' },
    { name: 'Exterior', value: 10, color: '#2d3748' },
  ];

  // 12 months leads evolution from Image 4
  const leadsEvolutionData = [
    { month: 'Jan', leads: 22 },
    { month: 'Fev', leads: 28 },
    { month: 'Mar', leads: 32 },
    { month: 'Abr', leads: 35 },
    { month: 'Mai', leads: 30 },
    { month: 'Jun', leads: 38 },
    { month: 'Jul', leads: 42 },
    { month: 'Ago', leads: 39 },
    { month: 'Set', leads: 45 },
    { month: 'Out', leads: 48 },
    { month: 'Nov', leads: 53 },
    { month: 'Dez', leads: 55 },
  ];

  // Origem dos leads matching Image 4
  const leadsOriginData = [
    { name: 'Google Meu Negócio', value: 38, color: '#ff6a00' },
    { name: 'Indicação', value: 22, color: '#ff9933' },
    { name: 'Redes Sociais', value: 18, color: '#10b981' },
    { name: 'Site', value: 12, color: '#3b82f6' },
    { name: 'Outros', value: 10, color: '#6366f1' },
  ];

  // Últimos Leads table data from Image 4
  const recentLeadsTable = [
    {
      nome: 'João Ferreira',
      origem: 'Google Meu Negócio',
      interesse: 'Fazenda 300ha',
      status: 'Novo',
      statusColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      data: '12/11',
    },
    {
      nome: 'Carlos Mendes',
      origem: 'Site',
      interesse: 'Sítio 50ha',
      status: 'Em contato',
      statusColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      data: '12/11',
    },
    {
      nome: 'Mariana Silva',
      origem: 'Redes Sociais',
      interesse: 'Fazenda 1.000ha',
      status: 'Qualificado',
      statusColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      data: '11/11',
    },
    {
      nome: 'Ricardo Lima',
      origem: 'Site',
      interesse: 'Fazenda Mista',
      status: 'Proposta',
      statusColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      data: '10/11',
    },
    {
      nome: 'Fernanda Costa',
      origem: 'Indicação',
      interesse: 'Sítio 80ha',
      status: 'Negociação',
      statusColor: 'bg-orange-500/15 text-[#ff6a00] border-orange-500/30',
      data: '10/11',
    },
  ];

  return (
    <div className="space-y-6 pb-12 text-white">
      {/* 3-Mode Switcher Cards (Image 3) */}
      <DashboardModeSwitcher currentMode="rural" />

      {/* Panoramic Hero Banner (Image 3 & Image 4) */}
      <div className="relative overflow-hidden rounded-[28px] border border-orange-500/30 bg-[#12151e] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {/* Landscape Sunset Field Image Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="/templates/rural/hero_rural.png"
            alt="Dashboard Rural"
            className="h-full w-full object-cover object-center filter brightness-[0.7] contrast-125"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80';
            }}
          />
          {/* Dark luxury orange gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0e14]/95 via-[#0b0e14]/75 to-transparent" />
        </div>

        {/* Banner Content */}
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 sm:p-8 lg:p-10">
          <div className="flex items-center gap-5">
            {/* Orange Icon Container */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#ff6a00]/20 text-[#ff6a00] border border-[#ff6a00]/40 shadow-[0_0_20px_rgba(255,106,0,0.3)] backdrop-blur-md">
              <Trees size={32} />
            </div>

            <div>
              <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-orange-200 backdrop-blur-md border border-white/10">
                Gestor: {displayName} (Master)
              </span>
              <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Dashboard Rural
              </h1>
              <p className="mt-1 max-w-xl text-xs sm:text-sm font-medium text-zinc-300 leading-relaxed">
                Gerenciamento de grandes áreas, compliance fundiário e performance comercial de fazendas.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/rural/properties/new')}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#ff6a00] px-6 text-sm font-bold text-white shadow-[0_8px_25px_rgba(255,106,0,0.4)] transition hover:bg-[#ff7a1a] hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus size={16} /> Nova Captação <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/rural/reports')}
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-zinc-300 backdrop-blur-md hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              Ver Relatórios
            </button>
          </div>
        </div>
      </div>

      {/* 4 Executive KPI Cards (Exact match to Image 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Propriedades Rurais */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#12151e]/90 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-[#ff6a00] border border-orange-500/20">
              <Wheat size={20} />
            </div>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
              ↑ +0%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-zinc-400">
              Propriedades Rurais
            </p>
            <p className="mt-1 text-3xl font-black text-white">
              {propertyCount}
            </p>
          </div>
        </div>

        {/* Investidores Ativos */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#12151e]/90 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp size={20} />
            </div>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
              ↗ +0%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-zinc-400">
              Investidores Ativos
            </p>
            <p className="mt-1 text-3xl font-black text-white">
              {leadCount}
            </p>
          </div>
        </div>

        {/* Due Diligence Pend. */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#12151e]/90 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck size={20} />
            </div>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
              ↗ +0%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-zinc-400">
              Due Diligence Pend.
            </p>
            <p className="mt-1 text-3xl font-black text-white">
              {pendingDueDiligence}
            </p>
          </div>
        </div>

        {/* Volume Negociado (Mês) */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#12151e]/90 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-[#ff6a00] border border-orange-500/20">
              <TrendingUp size={20} />
            </div>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
              ↗ +24%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-zinc-400">
              Volume Negociado (Mês)
            </p>
            <p className="mt-1 text-3xl font-black text-white">
              R$ 90 mi
            </p>
          </div>
        </div>
      </div>

      {/* Row 2: Performance Comercial (6 meses) + Distribuição por Região + Ações Rápidas (Image 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Performance Comercial Chart (6 cols) */}
        <div className="lg:col-span-6 rounded-2xl border border-white/10 bg-[#12151e]/90 p-6 shadow-lg backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-[#ff6a00]" />
              <h3 className="text-base font-bold text-white">
                Performance Comercial
              </h3>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
              Últimos 6 meses
              <ChevronDown size={14} className="text-zinc-500" />
            </div>
          </div>

          <div className="relative h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorRuralPerf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff6a00" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ff6a00" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#252b3b" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#718096"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#718096"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}M`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161a24',
                    border: '1px solid rgba(255,106,0,0.3)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                  formatter={(value: any) => [`R$ ${value} mi`, 'Volume']}
                />
                <Area
                  type="monotone"
                  dataKey="valor"
                  stroke="#ff6a00"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRuralPerf)"
                  dot={{ r: 4, fill: '#ff6a00', strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Peak indicator matching Image 3 (R$ 90 mi) */}
            <div className="absolute top-4 right-10 rounded-lg bg-[#ff6a00] px-2.5 py-1 text-xs font-black text-white shadow-lg shadow-orange-500/30">
              R$ 90 mi
            </div>
          </div>
        </div>

        {/* Distribuição por Região (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl border border-white/10 bg-[#12151e]/90 p-6 shadow-lg backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={18} className="text-[#ff6a00]" />
            <h3 className="text-base font-bold text-white">
              Distribuição por Região
            </h3>
          </div>

          <div className="relative flex items-center justify-center my-3">
            <div className="h-44 w-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={regionData}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {regionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Center label */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xl font-black text-white">68%</span>
              <span className="text-[10px] font-bold text-[#ff6a00]">SC</span>
            </div>
          </div>

          <div className="space-y-2 text-xs font-semibold pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff6a00]" />
                <span className="text-zinc-300">Santa Catarina</span>
              </div>
              <span className="text-white font-bold">68%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#4a5568]" />
                <span className="text-zinc-400">Outros Estados</span>
              </div>
              <span className="text-zinc-300 font-bold">22%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#2d3748]" />
                <span className="text-zinc-500">Exterior</span>
              </div>
              <span className="text-zinc-400 font-bold">10%</span>
            </div>
          </div>
        </div>

        {/* Ações Rápidas (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl border border-white/10 bg-[#12151e]/90 p-6 shadow-lg backdrop-blur-md flex flex-col justify-between">
          <h3 className="text-base font-bold text-white mb-4">
            Ações Rápidas
          </h3>

          <div className="space-y-3 flex-1 flex flex-col justify-center">
            <button
              onClick={() => navigate('/rural/crm')}
              className="flex h-12 w-full items-center justify-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white hover:border-[#ff6a00]/50 hover:bg-[#ff6a00]/10 transition cursor-pointer"
            >
              <UserPlus size={18} className="text-[#ff6a00]" />
              + Cadastrar Lead
            </button>

            <button
              onClick={() => navigate('/rural/reports')}
              className="flex h-12 w-full items-center justify-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white hover:border-[#ff6a00]/50 hover:bg-[#ff6a00]/10 transition cursor-pointer"
            >
              <FileText size={18} className="text-zinc-400" />
              Ver Relatórios
            </button>

            <button
              onClick={() => navigate('/rural/agenda')}
              className="flex h-12 w-full items-center justify-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white hover:border-[#ff6a00]/50 hover:bg-[#ff6a00]/10 transition cursor-pointer"
            >
              <Calendar size={18} className="text-zinc-400" />
              Agendar Visita
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-[#ff6a00]/20 bg-[#ff6a00]/5 p-3 text-center">
            <p className="text-[11px] font-medium text-orange-200">
              Operação integrada à compliance fundiário CAR/SIGEF
            </p>
          </div>
        </div>
      </div>

      {/* 5 Operational KPIs with Sparklines (from Image 4) */}
      <div className="mt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3">
          Indicadores Detalhados da Safra & Negócios
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Leads', value: '53', change: '+18% este mês', color: 'text-emerald-400', stroke: '#10b981' },
            { label: 'Imóveis Ativos', value: '124', change: '+12% este mês', color: 'text-orange-400', stroke: '#ff6a00' },
            { label: 'Novos Negócios', value: '18', change: '+25% este mês', color: 'text-blue-400', stroke: '#3b82f6' },
            { label: 'Em Negociação', value: '7', change: '+40% este mês', color: 'text-purple-400', stroke: '#8b5cf6' },
            { label: 'Valor em Negociação', value: 'R$ 8,4 mi', change: '+32% este mês', color: 'text-amber-400', stroke: '#f59e0b' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-white/5 bg-[#12151e]/80 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">{item.label}</span>
                <span className={`text-[10px] font-bold ${item.color}`}>
                  {item.change}
                </span>
              </div>
              <p className="mt-2 text-2xl font-black text-white">{item.value}</p>
              {/* Mini Sparkline indicator */}
              <div className="mt-2 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: item.stroke,
                    width: '70%',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: Evolução de Leads + Origem dos Leads + Últimos Leads Table (Image 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
        {/* Evolução de Leads (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-[#12151e]/90 p-5 shadow-lg backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-white">Evolução de Leads</h4>
            <span className="text-[11px] font-medium text-zinc-400">
              Últimos 12 meses
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={leadsEvolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252b3b" vertical={false} />
                <XAxis dataKey="month" stroke="#718096" fontSize={10} tickLine={false} />
                <YAxis stroke="#718096" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161a24',
                    border: '1px solid #ff6a00',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="leads"
                  stroke="#ff6a00"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#ff6a00' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Origem dos Leads (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl border border-white/10 bg-[#12151e]/90 p-5 shadow-lg backdrop-blur-md flex flex-col justify-between">
          <h4 className="text-sm font-bold text-white mb-2">Origem dos Leads</h4>
          <div className="relative flex items-center justify-center my-2">
            <div className="h-36 w-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadsOriginData}
                    innerRadius={44}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {leadsOriginData.map((entry, index) => (
                      <Cell key={`lead-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="absolute flex flex-col items-center">
              <span className="text-xl font-black text-white">53</span>
              <span className="text-[10px] text-zinc-400">leads</span>
            </div>
          </div>
          <div className="space-y-1.5 text-[11px] font-medium">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#ff6a00]" /> Google Meu Negócio
              </span>
              <span className="font-bold">38%</span>
            </div>
            <div className="flex items-center justify-between text-zinc-300">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#ff9933]" /> Indicação
              </span>
              <span className="font-bold">22%</span>
            </div>
            <div className="flex items-center justify-between text-zinc-300">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#10b981]" /> Redes Sociais
              </span>
              <span className="font-bold">18%</span>
            </div>
          </div>
        </div>

        {/* Últimos Leads Table (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-[#12151e]/90 p-5 shadow-lg backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-white">Últimos Leads</h4>
            <button
              onClick={() => navigate('/rural/crm')}
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
                  <th className="pb-2 font-semibold">Interesse</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold text-right">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentLeadsTable.map((lead) => (
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
            onClick={() => navigate('/rural/crm')}
            className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#12151e] p-4 text-center hover:border-[#ff6a00]/40 transition group cursor-pointer"
          >
            <UserPlus size={20} className="text-[#ff6a00] group-hover:scale-110 transition" />
            <span className="mt-2 text-xs font-bold text-white">Novo Lead</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Cadastre um lead</span>
          </button>

          <button
            onClick={() => navigate('/rural/properties/new')}
            className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#12151e] p-4 text-center hover:border-[#ff6a00]/40 transition group cursor-pointer"
          >
            <Wheat size={20} className="text-amber-500 group-hover:scale-110 transition" />
            <span className="mt-2 text-xs font-bold text-white">Novo Imóvel</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Adicione um imóvel</span>
          </button>

          <button
            onClick={() => navigate('/rural/kanban')}
            className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#12151e] p-4 text-center hover:border-[#ff6a00]/40 transition group cursor-pointer"
          >
            <TrendingUp size={20} className="text-emerald-400 group-hover:scale-110 transition" />
            <span className="mt-2 text-xs font-bold text-white">Nova Negociação</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Registre negociação</span>
          </button>

          <button
            onClick={() => navigate('/rural/agenda')}
            className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#12151e] p-4 text-center hover:border-[#ff6a00]/40 transition group cursor-pointer"
          >
            <Calendar size={20} className="text-purple-400 group-hover:scale-110 transition" />
            <span className="mt-2 text-xs font-bold text-white">Agendar Visita</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Programe visita</span>
          </button>
        </div>

        {/* Motivational Banner */}
        <div className="lg:col-span-5 rounded-xl border border-orange-500/20 bg-gradient-to-r from-[#20150d] via-[#1a171c] to-[#12151e] p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ff6a00]/20 text-[#ff6a00] border border-[#ff6a00]/30">
            <Trees size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              O campo também é oportunidade.
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Conecte o que importa: pessoas, terras e negócios com compliance e precisão.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuralDashboard;
