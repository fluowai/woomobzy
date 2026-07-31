import React from 'react';
import { Brain, Star, Target, TrendingUp, Loader2 } from 'lucide-react';
import type { AgentMetrics } from '../../services/aiAgents';

interface AgentMetricsCardProps {
  metrics: AgentMetrics | null;
  loading: boolean;
}

export const AgentMetricsCard: React.FC<AgentMetricsCardProps> = ({
  metrics,
  loading,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Loader2 className="animate-spin text-emerald-600" size={22} />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
          Métricas do cérebro neural
        </div>
        <div className="mt-6 flex flex-col items-center justify-center text-center">
          <Brain size={28} className="text-slate-300" />
          <p className="mt-2 text-sm font-bold text-slate-400">
            Nenhuma métrica disponível
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
        Métricas do cérebro neural
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <Brain size={18} className="text-slate-700" />
          <div className="mt-2 text-2xl font-bold text-slate-950">
            {metrics.total_conversations}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Conversas
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <Star size={18} className="text-amber-500" />
          <div className="mt-2 text-2xl font-bold text-slate-950">
            {metrics.average_rating ? metrics.average_rating.toFixed(1) : '-'}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Média avaliações
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <Target size={18} className="text-emerald-600" />
          <div className="mt-2 text-2xl font-bold text-slate-950">
            {metrics.total_qualifications}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Qualificações
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <TrendingUp size={18} className="text-blue-600" />
          <div className="mt-2 text-2xl font-bold text-slate-950">
            {metrics.rating_distribution?.[5] || 0}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Notas 5
          </div>
        </div>
      </div>
      {metrics.total_qualifications > 0 && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Distribuição de notas
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const count = metrics.rating_distribution?.[star] || 0;
              const pct = (count / (metrics.total_qualifications || 1)) * 100;
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="w-4 text-xs font-bold text-slate-600">
                    {star}
                  </span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-bold text-slate-500">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
