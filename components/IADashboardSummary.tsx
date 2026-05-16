import React from 'react';
import { Sparkles, ArrowRight, MessageCircle, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Insight {
  type: 'success' | 'warning' | 'info';
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

const IADashboardSummary: React.FC = () => {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] || profile?.name?.split(' ')[0] || 'Corretor';

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
    <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 shadow-2xl overflow-hidden relative group">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all duration-500"></div>
      
      <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="p-4 bg-primary rounded-2xl shadow-lg shadow-primary/20 animate-pulse-subtle">
          <Sparkles className="text-white" size={28} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">IA Insights • Premium</span>
            <div className="h-1 w-1 bg-slate-700 rounded-full"></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Atualizado agora</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight mb-2">
            Olá, <span className="text-primary">{firstName}</span>. Aqui está o que preparei para o seu dia:
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {insights.map((insight, idx) => (
              <div 
                key={idx} 
                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all cursor-default group/item"
              >
                <div className="flex items-start gap-3">
                  {insight.type === 'warning' && <AlertCircle className="text-amber-500 shrink-0" size={18} />}
                  {insight.type === 'success' && <TrendingUp className="text-emerald-500 shrink-0" size={18} />}
                  {insight.type === 'info' && <MessageCircle className="text-blue-500 shrink-0" size={18} />}
                  
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-300 leading-relaxed mb-3">
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
