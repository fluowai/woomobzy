/**
 * Dashboard Premium — KPIs e Métricas Estilo SaaS Enterprise
 * Stripe + Linear vibes com dados escaneáveis em 3 segundos
 */

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  MessageCircle,
  Building2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  MousePointerClick,
  FileText,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react';

interface DashboardProps {
  period?: 'today' | 'week' | 'month';
}

const DashboardPremium: React.FC<DashboardProps> = ({ period = 'week' }) => {
  const metrics = {
    today: {
      leads: { value: 24, change: 12, trend: 'up' },
      messages: { value: 156, change: 8, trend: 'up' },
      meetings: { value: 8, change: -2, trend: 'down' },
      revenue: { value: 45000, change: 15, trend: 'up' },
    },
    week: {
      leads: { value: 156, change: 23, trend: 'up' },
      messages: { value: 892, change: 12, trend: 'up' },
      meetings: { value: 42, change: 5, trend: 'up' },
      revenue: { value: 280000, change: 8, trend: 'up' },
    },
    month: {
      leads: { value: 648, change: 18, trend: 'up' },
      messages: { value: 3420, change: -5, trend: 'down' },
      meetings: { value: 156, change: 12, trend: 'up' },
      revenue: { value: 1250000, change: 25, trend: 'up' },
    },
  };

  const current = metrics[period];

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const kpis = [
    {
      label: 'Leads Novos',
      value: current.leads.value,
      change: current.leads.change,
      trend: current.leads.trend,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Mensagens',
      value: current.messages.value,
      change: current.messages.change,
      trend: current.messages.trend,
      icon: MessageCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Visitas Agendadas',
      value: current.meetings.value,
      change: current.meetings.change,
      trend: current.meetings.trend,
      icon: Building2,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Receita',
      value: current.revenue.value,
      change: current.revenue.change,
      trend: current.revenue.trend,
      icon: DollarSign,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      isCurrency: true,
    },
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'lead',
      title: 'Novo lead: Maria Silva',
      description: 'Interessada na Fazenda Boa Vista',
      time: 'há 5 min',
      avatar: 'M',
      color: 'bg-blue-500',
    },
    {
      id: 2,
      type: 'message',
      title: 'Mensagem recebida',
      description: 'João perguntou sobre área total',
      time: 'há 12 min',
      avatar: 'J',
      color: 'bg-emerald-500',
    },
    {
      id: 3,
      type: 'visit',
      title: 'Visita confirmado',
      description: 'Sítio Horizontina - 15h',
      time: 'há 1h',
      avatar: 'A',
      color: 'bg-orange-500',
    },
    {
      id: 4,
      type: 'deal',
      title: 'Proposta enviada',
      description: 'Fazenda Recanto dos Pássaros',
      time: 'há 2h',
      avatar: 'P',
      color: 'bg-purple-500',
    },
  ];

  const channels = [
    {
      name: 'WhatsApp',
      value: 45,
      change: 12,
      color: 'bg-emerald-500',
    },
    {
      name: 'Site',
      value: 28,
      change: 5,
      color: 'bg-blue-500',
    },
    {
      name: 'Indicação',
      value: 15,
      change: -3,
      color: 'bg-purple-500',
    },
    {
      name: 'Outros',
      value: 12,
      change: 2,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary">Visão geral do seu negócio</p>
        </div>
        <div className="flex gap-2 bg-bg-card rounded-lg p-1 border border-border-subtle">
          {(['today', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {p === 'today' ? 'Hoje' : p === 'week' ? '7 dias' : '30 dias'}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <div
            key={index}
            className="bg-bg-card border border-border-subtle rounded-xl p-5 hover:border-primary/30 transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${kpi.bgColor}`}>
                <kpi.icon size={20} className={kpi.color} />
              </div>
              <div
                className={`flex items-center gap-1 text-sm font-medium ${
                  kpi.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {kpi.trend === 'up' ? (
                  <ArrowUpRight size={16} />
                ) : (
                  <ArrowDownRight size={16} />
                )}
                <span>{Math.abs(kpi.change)}%</span>
              </div>
            </div>
            <p className="text-text-secondary text-sm mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold text-text-primary">
              {kpi.isCurrency
                ? formatCurrency(kpi.value)
                : formatNumber(kpi.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads Chart */}
        <div className="lg:col-span-2 bg-bg-card border border-border-subtle rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-text-primary">Leads por dia</h3>
            <select className="bg-bg-input border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-secondary focus:outline-none">
              <option>Últimos 7 dias</option>
              <option>Últimos 30 dias</option>
            </select>
          </div>
          {/* Simple Bar Chart Visual */}
          <div className="flex items-end justify-between gap-2 h-40">
            {[35, 45, 28, 52, 68, 42, 55].map((value, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-primary/80 rounded-t-md hover:bg-primary transition-colors"
                  style={{ height: `${value}%` }}
                />
                <span className="text-xs text-text-tertiary">
                  {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Channels */}
        <div className="bg-bg-card border border-border-subtle rounded-xl p-5">
          <h3 className="font-semibold text-text-primary mb-4">Canais</h3>
          <div className="space-y-4">
            {channels.map((channel, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-text-secondary">
                    {channel.name}
                  </span>
                  <span className="text-sm font-medium text-text-primary">
                    {channel.value}%
                  </span>
                </div>
                <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                  <div
                    className={`h-full ${channel.color} rounded-full transition-all`}
                    style={{ width: `${channel.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-bg-card border border-border-subtle rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary">
              Atividades Recentes
            </h3>
            <button className="text-sm text-primary hover:text-primary-light transition-colors">
              Ver todas
            </button>
          </div>
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-bg-hover transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-full ${activity.color} flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}
                >
                  {activity.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {activity.title}
                  </p>
                  <p className="text-xs text-text-secondary truncate">
                    {activity.description}
                  </p>
                </div>
                <span className="text-xs text-text-tertiary flex-shrink-0">
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance */}
        <div className="bg-bg-card border border-border-subtle rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary">Performance</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-bg-hover rounded-lg">
              <Eye size={20} className="text-text-secondary mb-2" />
              <p className="text-2xl font-bold text-text-primary">2.4K</p>
              <p className="text-xs text-text-secondary">Visualizações</p>
            </div>
            <div className="p-4 bg-bg-hover rounded-lg">
              <MousePointerClick
                size={20}
                className="text-text-secondary mb-2"
              />
              <p className="text-2xl font-bold text-text-primary">156</p>
              <p className="text-xs text-text-secondary">Cliques</p>
            </div>
            <div className="p-4 bg-bg-hover rounded-lg">
              <FileText size={20} className="text-text-secondary mb-2" />
              <p className="text-2xl font-bold text-text-primary">42</p>
              <p className="text-xs text-text-secondary">Propostas</p>
            </div>
            <div className="p-4 bg-bg-hover rounded-lg">
              <CheckCircle2 size={20} className="text-text-secondary mb-2" />
              <p className="text-2xl font-bold text-text-primary">68%</p>
              <p className="text-xs text-text-secondary">Conversão</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPremium;
