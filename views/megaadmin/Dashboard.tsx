import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crown,
  Building2,
  Users,
  Settings,
  TrendingUp,
  CreditCard,
  Headset,
  FileText,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { logger } from '@/utils/logger';
import DashboardModeSwitcher from '../../components/DashboardModeSwitcher';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const MegaAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalResellers: 24,
    activeResellers: 24,
    totalTenants: 12480,
    activeTenants: 8732,
    monthlyRevenue: 245890,
    activeUsers: 126,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [
        { count: totalResellers },
        { count: totalTenants },
      ] = await Promise.all([
        supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true })
          .eq('is_reseller', true),
        supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true })
          .eq('is_reseller', false),
      ]);

      if (totalResellers || totalTenants) {
        setStats((prev) => ({
          ...prev,
          totalResellers: totalResellers || prev.totalResellers,
          totalTenants: totalTenants || prev.totalTenants,
        }));
      }
    } catch (error) {
      logger.error('Error fetching mega admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // 5 KPI Cards (Exact match to Image 4)
  const kpis = [
    {
      label: 'Total de Clientes',
      value: stats.totalTenants.toLocaleString('pt-BR'),
      change: '+18% este mês',
      color: 'text-emerald-400',
      barColor: '#10b981',
    },
    {
      label: 'Revendas Ativas',
      value: String(stats.totalResellers),
      change: '+12% este mês',
      color: 'text-orange-400',
      barColor: '#ff6a00',
    },
    {
      label: 'Imóveis Cadastrados',
      value: stats.activeTenants.toLocaleString('pt-BR'),
      change: '+20% este mês',
      color: 'text-blue-400',
      barColor: '#3b82f6',
    },
    {
      label: 'Receita Mensal',
      value: `R$ ${stats.monthlyRevenue.toLocaleString('pt-BR')}`,
      change: '+15% este mês',
      color: 'text-purple-400',
      barColor: '#8b5cf6',
    },
    {
      label: 'Usuários Ativos',
      value: String(stats.activeUsers),
      change: '+14% este mês',
      color: 'text-teal-400',
      barColor: '#14b8a6',
    },
  ];

  // Consumo da Plataforma (Gauge data)
  const platformConsumption = [
    { name: 'Imóveis', value: 32, color: '#ff6a00' },
    { name: 'Leads', value: 26, color: '#ffaa33' },
    { name: 'Clientes', value: 24, color: '#10b981' },
    { name: 'Outros', value: 18, color: '#64748b' },
  ];

  // Revendas por Região (Bar chart data)
  const regionResellers = [
    { region: 'Sul', total: 9 },
    { region: 'Sudeste', total: 7 },
    { region: 'Centro-Oeste', total: 4 },
    { region: 'Nordeste', total: 3 },
    { region: 'Norte', total: 1 },
  ];

  // Últimas Atividades feed
  const recentActivities = [
    {
      title: 'Novo cliente cadastrado',
      detail: 'Imobiliária Bela Vista',
      time: '12/11 15:34',
      badge: 'Cliente',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    {
      title: 'Revenda ativada',
      detail: 'Imóveis & Cia',
      time: '12/11 09:12',
      badge: 'Revenda',
      badgeColor: 'bg-orange-500/10 text-[#ff6a00] border-orange-500/20',
    },
    {
      title: 'Novo imóvel publicado',
      detail: 'Apartamento Central',
      time: '11/11 18:07',
      badge: 'Imóvel',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    {
      title: 'Pagamento recebido',
      detail: 'Fatura #2891',
      time: '10/11 14:22',
      badge: 'Fatura',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
  ];

  return (
    <div className="space-y-6 pb-12 text-white">
      {/* 3-Mode Switcher */}
      <DashboardModeSwitcher currentMode="megaadmin" />

      {/* Panoramic Banner for Mega Admin (Image 4) */}
      <div className="relative overflow-hidden rounded-[28px] border border-orange-500/30 bg-[#12151e] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {/* Subtle Luxury Golden Texture Background */}
        <div className="absolute inset-0 z-0 opacity-40 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-600/30 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0e14]/95 via-[#0b0e14]/80 to-transparent" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 sm:p-8 lg:p-10">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.3)] backdrop-blur-md">
              <Crown size={32} />
            </div>

            <div>
              <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-amber-200 backdrop-blur-md border border-white/10">
                Mega Admin • Visão Geral do Sistema
              </span>
              <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Olá, Paulo!
              </h1>
              <p className="mt-1 max-w-xl text-xs sm:text-sm font-medium text-zinc-300 leading-relaxed">
                Tudo sob controle. Sua plataforma, seu negócio.
              </p>
            </div>
          </div>

          <div>
            <button
              onClick={() => navigate('/megaadmin/settings')}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#ff6a00] px-6 text-sm font-bold text-white shadow-[0_8px_25px_rgba(255,106,0,0.4)] transition hover:bg-[#ff7a1a] hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Settings size={17} /> Configurações
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

      {/* Middle Row: Consumo da Plataforma + Revendas por Região + Últimas Atividades (Image 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Consumo da Plataforma (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-[#12151e]/90 p-5 shadow-lg backdrop-blur-md flex flex-col justify-between">
          <h3 className="text-sm font-bold text-white mb-2">Consumo da Plataforma</h3>

          <div className="relative flex items-center justify-center my-3">
            <div className="h-40 w-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformConsumption}
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {platformConsumption.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-white">78%</span>
              <span className="text-[10px] font-semibold text-emerald-400">otimizado</span>
            </div>
          </div>

          <div className="space-y-1.5 text-[11px] font-medium pt-2 border-t border-white/5">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#ff6a00]" /> Imóveis
              </span>
              <span className="font-bold">32%</span>
            </div>
            <div className="flex items-center justify-between text-zinc-300">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#ffaa33]" /> Leads
              </span>
              <span className="font-bold">26%</span>
            </div>
            <div className="flex items-center justify-between text-zinc-300">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#10b981]" /> Clientes
              </span>
              <span className="font-bold">24%</span>
            </div>
            <div className="flex items-center justify-between text-zinc-300">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#64748b]" /> Outros
              </span>
              <span className="font-bold">18%</span>
            </div>
          </div>
        </div>

        {/* Revendas por Região (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-[#12151e]/90 p-5 shadow-lg backdrop-blur-md flex flex-col justify-between">
          <h3 className="text-sm font-bold text-white mb-2">Revendas por Região</h3>

          <div className="h-56 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionResellers}>
                <XAxis dataKey="region" stroke="#718096" fontSize={10} tickLine={false} />
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
                <Bar dataKey="total" fill="#ff6a00" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Últimas Atividades (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-[#12151e]/90 p-5 shadow-lg backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Últimas Atividades</h3>
            <span className="text-xs font-semibold text-[#ff6a00] hover:underline cursor-pointer">
              Ver todas
            </span>
          </div>

          <div className="space-y-3">
            {recentActivities.map((act) => (
              <div
                key={act.detail}
                className="rounded-xl border border-white/5 bg-white/5 p-3 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${act.badgeColor}`}
                    >
                      {act.badge}
                    </span>
                    <p className="text-xs font-bold text-white">{act.title}</p>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">{act.detail}</p>
                </div>
                <span className="text-[10px] font-medium text-zinc-500">
                  {act.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Quick Action Cards + Motivational Banner (Image 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-6">
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/megaadmin/resellers')}
            className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#12151e] p-4 text-center hover:border-[#ff6a00]/40 transition group cursor-pointer"
          >
            <Building2 size={20} className="text-[#ff6a00] group-hover:scale-110 transition" />
            <span className="mt-2 text-xs font-bold text-white">Operações Revendas</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Acesse os parceiros</span>
          </button>

          <button
            onClick={() => navigate('/megaadmin/direct-clients')}
            className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#12151e] p-4 text-center hover:border-[#ff6a00]/40 transition group cursor-pointer"
          >
            <Users size={20} className="text-amber-500 group-hover:scale-110 transition" />
            <span className="mt-2 text-xs font-bold text-white">Gerenciar Usuários</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Permissões e acessos</span>
          </button>

          <button
            onClick={() => navigate('/megaadmin/analytics')}
            className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#12151e] p-4 text-center hover:border-[#ff6a00]/40 transition group cursor-pointer"
          >
            <FileText size={20} className="text-emerald-400 group-hover:scale-110 transition" />
            <span className="mt-2 text-xs font-bold text-white">Relatórios Completos</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Dados e performances</span>
          </button>

          <button
            onClick={() => navigate('/megaadmin/settings')}
            className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#12151e] p-4 text-center hover:border-[#ff6a00]/40 transition group cursor-pointer"
          >
            <Headset size={20} className="text-purple-400 group-hover:scale-110 transition" />
            <span className="mt-2 text-xs font-bold text-white">Suporte</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Central de atendimento</span>
          </button>
        </div>

        {/* Motivational Banner */}
        <div className="lg:col-span-5 rounded-xl border border-amber-500/20 bg-gradient-to-r from-[#22170b] via-[#1a171c] to-[#12151e] p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Crown size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              Mais que um sistema, um ecossistema para o seu crescimento.
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Escalabilidade, segurança e controle total de todas as operações e instâncias ativas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MegaAdminDashboard;
