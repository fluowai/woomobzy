import { logger } from '@/utils/logger';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

interface Insight {
  type: 'success' | 'warning' | 'info';
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

const HOT_STAGES = ['Visita', 'Simulação', 'Documentação'];

const IADashboardSummary: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const organizationId = profile.organization_id;

        const [leadsRes, propsRes] = await Promise.all([
          supabase
            .from('leads')
            .select(
              'id, name, status, lead_score, last_contacted_at, created_at'
            )
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
            .limit(100),
          supabase
            .from('properties')
            .select(
              'id, title, city, state, price, status, views_count, updated_at, created_at'
            )
            .eq('organization_id', organizationId)
            .order('updated_at', { ascending: false })
            .limit(100),
        ]);

        if (cancelled) return;

        const leads = (leadsRes.data || []) as any[];
        const props = (propsRes.data || []) as any[];

        const next: Insight[] = [];

        const hotLeads = leads.filter((lead) => {
          const status = lead.status || '';
          if (!HOT_STAGES.includes(status)) return false;
          const lastContact = lead.last_contacted_at
            ? new Date(lead.last_contacted_at)
            : null;
          if (lastContact) {
            const hours = (Date.now() - lastContact.getTime()) / 3_600_000;
            if (hours < 4) return false;
          }
          return true;
        });

        if (hotLeads.length > 0) {
          next.push({
            type: 'warning',
            text: `${hotLeads.length} ${hotLeads.length === 1 ? 'lead quente' : 'leads quentes'} em ${HOT_STAGES.slice(0, 2).join(' / ').toLowerCase()} aguardando contato.`,
            actionLabel: 'Responder agora',
            onAction: () => navigate('/crm'),
          });
        }

        const recentlyUpdated = props.find((property) => {
          if (!property.updated_at) return false;
          const days = (Date.now() - new Date(property.updated_at).getTime()) / 86_400_000;
          return days <= 7 && (property.views_count || 0) > 0;
        });

        if (recentlyUpdated) {
          const growth = (recentlyUpdated.views_count || 0) > 10;
          next.push({
            type: 'success',
            text: `"${recentlyUpdated.title}" recebeu ${recentlyUpdated.views_count} ${
              recentlyUpdated.views_count === 1 ? 'visualização' : 'visualizações'
            }${growth ? ' esta semana' : ''} após a última atualização.`,
            actionLabel: 'Ver relatório',
            onAction: () => navigate('/reports'),
          });
        }

        const recentProps = props.filter((property) => {
          if (!property.created_at) return false;
          const days = (Date.now() - new Date(property.created_at).getTime()) / 86_400_000;
          return days <= 30;
        });

        if (recentProps.length > 0) {
          next.push({
            type: 'info',
            text: `${recentProps.length} ${recentProps.length === 1 ? 'imóvel foi adicionado' : 'imóveis foram adicionados'} ao portfólio nos últimos 30 dias.`,
            actionLabel: 'Ver portfólio',
            onAction: () => navigate('/portfolio'),
          });
        }

        if (next.length === 0) {
          next.push({
            type: 'info',
            text: 'Nenhum dado recente para sugerir insights. Adicione leads e imóveis para destravar recomendações da IA.',
            actionLabel: 'Ir para CRM',
            onAction: () => navigate('/crm'),
          });
        }

        setInsights(next);
      } catch (err) {
        logger.error('Erro ao carregar IA Insights:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [profile?.organization_id, navigate]);

  return (
    <div className="bg-bg-card rounded-2xl p-5 border border-border-subtle shadow-sm overflow-hidden relative group animate-in fade-in slide-in-from-top duration-700">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500"></div>

      <div className="relative space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full">
              <span className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
                IA Insights • Ativo
              </span>
            </div>
            <div className="h-1 w-1 bg-border rounded-full"></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {loading ? 'Carregando' : 'Dados reais'}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-bg-subtle border border-border-subtle rounded-xl p-4 animate-pulse"
                >
                  <div className="h-3 w-2/3 bg-border rounded mb-3" />
                  <div className="h-3 w-full bg-border rounded mb-2" />
                  <div className="h-3 w-1/2 bg-border rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="bg-bg-subtle border border-border-subtle rounded-xl p-4 hover:bg-bg-hover transition-all cursor-default group/item"
                >
                  <div className="flex items-start gap-3">
                    {insight.type === 'warning' && (
                      <AlertCircle
                        className="text-amber-500 shrink-0"
                        size={18}
                      />
                    )}
                    {insight.type === 'success' && (
                      <TrendingUp
                        className="text-emerald-500 shrink-0"
                        size={18}
                      />
                    )}
                    {insight.type === 'info' && (
                      <Sparkles
                        className="text-blue-500 shrink-0"
                        size={18}
                      />
                    )}

                    <div className="flex-1">
                      <p className="text-xs font-medium text-text-secondary leading-relaxed mb-3">
                        {insight.text}
                      </p>
                      {insight.actionLabel && (
                        <button
                          onClick={() => {
                            if (insight.onAction) insight.onAction();
                            else {
                              const href =
                                {
                                  'Responder agora': '/crm',
                                  'Ver relatório': '/reports',
                                  'Ver Matchmaking': '/matchmaking',
                                  'Ver portfólio': '/portfolio',
                                  'Ir para CRM': '/crm',
                                }[insight.actionLabel] || null;
                              if (href) navigate(href);
                            }
                          }}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-widest group-hover/item:gap-2 transition-all"
                        >
                          {insight.actionLabel} <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IADashboardSummary;
