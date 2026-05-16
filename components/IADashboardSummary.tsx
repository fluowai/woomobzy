import React from 'react';
import { ArrowRight, MessageCircle, TrendingUp, AlertCircle } from 'lucide-react';

interface Insight {
  type: 'success' | 'warning' | 'info';
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

const IADashboardSummary: React.FC = () => {
  const insights: Insight[] = [
    {
      type: 'warning',
      text: 'Você tem 3 leads quentes aguardando resposta há mais de 4 horas.',
      actionLabel: 'Responder agora',
    },
    {
      type: 'success',
      text: 'A Fazenda Sol Nascente teve um aumento de 45% nas visualizações após a última atualização.',
      actionLabel: 'Ver relatório',
    },
    {
      type: 'info',
      text: 'Baseado no seu perfil, 2 novos imóveis no Mato Grosso combinam com seus investidores ativos.',
      actionLabel: 'Ver Matchmaking',
    },
  ];

  return (
    <div className="bg-bg-card rounded-2xl p-5 border border-border-subtle shadow-sm overflow-hidden relative group animate-in fade-in slide-in-from-top duration-700">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500"></div>
      
      <div className="relative space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full">
              <span className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">IA Insights • Ativo</span>
            </div>
            <div className="h-1 w-1 bg-border rounded-full"></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sincronizado</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {insights.map((insight, idx) => (
              <div 
                key={idx} 
                className="bg-bg-subtle border border-border-subtle rounded-xl p-4 hover:bg-bg-hover transition-all cursor-default group/item"
              >
                <div className="flex items-start gap-3">
                  {insight.type === 'warning' && <AlertCircle className="text-amber-500 shrink-0" size={18} />}
                  {insight.type === 'success' && <TrendingUp className="text-emerald-500 shrink-0" size={18} />}
                  {insight.type === 'info' && <MessageCircle className="text-blue-500 shrink-0" size={18} />}
                  
                  <div className="flex-1">
                    <p className="text-xs font-medium text-text-secondary leading-relaxed mb-3">
                      {insight.text}
                    </p>
                    {insight.actionLabel && (
                      <button className="flex items-center gap-1.5 text-[10px] font-black text-primary uppercase tracking-widest group-hover/item:gap-2 transition-all">
                        {insight.actionLabel} <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IADashboardSummary;
