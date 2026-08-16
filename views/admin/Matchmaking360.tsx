import { logger } from '@/utils/logger';
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Zap,
  Target,
  TrendingUp,
  MapPin,
  Users,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Building2,
  SlidersHorizontal,
  Bot,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { Property, Lead } from '../../types';

interface Match {
  lead: Lead;
  property: Property;
  score: number;
  reasons: string[];
}

function MatchMetric({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ size?: number }>;
  value: string | number;
  label: string;
}) {
  return (
    <div className="wootech-status-card">
      <div>
        <span className="wootech-status-icon">
          <Icon size={19} />
        </span>
        <div>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}

const Matchmaking360: React.FC = () => {
  const { profile } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMatches = useCallback(async () => {
    try {
      setLoading(true);
      const organizationId = profile?.organization_id;
      if (!organizationId) return;
      // Simulação de algoritmo 360 (num sistema real, isso seria um script no backend)
      const { data: properties } = await supabase
        .from('properties')
        .select('*')
        .eq('organization_id', organizationId)
        .limit(20);
      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', organizationId)
        .limit(20);

      setProperties(properties || []);
      setLeads(leads || []);

      if (properties && leads) {
        const potentialMatches: Match[] = [];

        leads.forEach((lead) => {
          properties.forEach((prop) => {
            let score = 0;
            const reasons: string[] = [];

            // 1. Match por Nicho (Rural/Urbano)
            if (lead.niche === prop.property_type) {
              score += 40;
              reasons.push('Mesmo nicho de mercado');
            }

            // 2. Match por Preço (Margem de 20%)
            if (lead.budget && prop.price) {
              const diff = Math.abs(lead.budget - prop.price) / lead.budget;
              if (diff < 0.2) {
                score += 30;
                reasons.push('Preço dentro do orçamento');
              }
            }

            // 3. Match por Localização
            if (lead.region === prop.state) {
              score += 20;
              reasons.push('Região de preferência');
            }

            if (score > 50) {
              potentialMatches.push({ lead, property: prop, score, reasons });
            }
          });
        });

        setMatches(
          potentialMatches.sort((a, b) => b.score - a.score).slice(0, 10)
        );
      }
    } catch (err) {
      logger.error('Error in matchmaking:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id]);

  useEffect(() => {
    if (!profile?.organization_id) return;
    loadMatches();
  }, [profile?.organization_id, loadMatches]);

  const matchRate =
    leads.length && properties.length
      ? Math.round((matches.length / (leads.length * properties.length)) * 100)
      : 0;

  const vgvMatchmaking = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
  }).format(
    matches.reduce((sum, match) => sum + Number(match.property.price || 0), 0)
  );

  const regionCounts: Record<string, number> = {};
  leads.forEach((l) => {
    const key = l.region || 'Indefinido';
    regionCounts[key] = (regionCounts[key] || 0) + 1;
  });
  const topRegion = Object.keys(regionCounts).sort(
    (a, b) => regionCounts[b] - regionCounts[a]
  )[0];

  const stateCounts: Record<string, number> = {};
  properties.forEach((p) => {
    const state = (p as any).state || p.location?.state || 'Indefinido';
    stateCounts[state] = (stateCounts[state] || 0) + 1;
  });
  const topState = Object.keys(stateCounts).sort(
    (a, b) => stateCounts[b] - stateCounts[a]
  )[0];

  return (
    <div className="wootech-reference-screen space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="wootech-page-heading">
        <div>
          <div className="wootech-breadcrumb">
            <strong>Inteligência</strong>
            <span>/</span>
            <span>Matchmaking 360</span>
          </div>
          <h1>Matchmaking 360</h1>
          <p>
            Cruze leads, imóveis e intenção de compra com IA para gerar próximas
            ações.
          </p>
        </div>
        <div className="wootech-action-row">
          <span className="wootech-secondary-action text-emerald-700">
            <i className="h-2 w-2 rounded-full bg-emerald-500" /> IA ativa
          </span>
          <button
            className="wootech-secondary-action"
            onClick={() =>
              toast.info(
                'Os critérios de match podem ser ajustados na seção abaixo.'
              )
            }
          >
            <SlidersHorizontal size={17} /> Configurar critérios
          </button>
          <button className="wootech-primary-action" onClick={loadMatches}>
            <Sparkles size={17} /> Gerar sugestões
          </button>
        </div>
      </div>

      <div className="wootech-status-grid">
        <MatchMetric
          icon={Target}
          value={matches.length}
          label="Matches encontrados"
        />
        <MatchMetric
          icon={Building2}
          value={new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            notation: 'compact',
          }).format(
            matches.reduce(
              (sum, match) => sum + Number(match.property.price || 0),
              0
            )
          )}
          label="VGV recomendado"
        />
        <MatchMetric
          icon={Users}
          value={new Set(matches.map((match) => match.lead.id)).size}
          label="Leads com imóvel ideal"
        />
        <MatchMetric
          icon={Zap}
          value={matches.filter((match) => match.score >= 80).length}
          label="Oportunidades quentes"
        />
        <MatchMetric
          icon={Bot}
          value={
            matches.length
              ? `${Math.round(matches.reduce((sum, match) => sum + match.score, 0) / matches.length)}%`
              : '—'
          }
          label="Eficácia média"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Feed */}
        <div className="xl:col-span-2 space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-black/40 px-2">
            Top Sugestões de Hoje
          </h2>

          {loading ? (
            <div className="py-20 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : matches.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] p-20 text-center border border-dashed border-slate-200">
              <Target size={48} className="text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-medium italic">
                Nenhum match encontrado para os leads atuais.
              </p>
            </div>
          ) : (
            matches.map((match, idx) => (
              <div
                key={idx}
                className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-all group"
              >
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  {/* Lead Info */}
                  <div className="w-full lg:w-1/3 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-indigo-600 font-bold text-xl">
                      {match.lead.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-black uppercase tracking-tight">
                        {match.lead.name}
                      </h4>
                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                        {match.lead.niche}
                      </p>
                    </div>
                  </div>

                  {/* Match Score */}
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full border-4 border-indigo-50 flex items-center justify-center relative">
                      <svg className="w-full h-full transform -rotate-90 absolute">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="transparent"
                          className="text-slate-50"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="#4f46e5"
                          strokeWidth="4"
                          fill="transparent"
                          strokeDasharray={`${(match.score / 100) * 175} 175`}
                        />
                      </svg>
                      <span className="text-sm font-bold text-indigo-600">
                        {match.score}%
                      </span>
                    </div>
                    <Zap size={14} className="text-amber-500 mt-2" />
                  </div>

                  {/* Property Info */}
                  <div className="flex-1 flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden">
                      {match.property.images?.[0] ? (
                        <img
                          src={match.property.images[0]}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <MapPin size={24} />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-black text-sm truncate max-w-[200px]">
                        {match.property.title}
                      </h4>
                      <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(match.property.price || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Action */}
                  <button
                    onClick={() =>
                      toast.info('Funcionalidade de contato em breve')
                    }
                    className="p-4 bg-black text-white rounded-2xl hover:scale-110 transition-all"
                  >
                    <MessageSquare size={20} />
                  </button>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-50 flex flex-wrap gap-2">
                  {match.reasons.map((r, i) => (
                    <span
                      key={i}
                      className="text-[9px] font-bold uppercase tracking-widest px-3 py-1 bg-slate-50 text-slate-400 rounded-full"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Intelligence */}
        <div className="space-y-8">
          <div className="bg-black rounded-[3rem] p-10 text-white shadow-2xl shadow-indigo-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 blur-[60px] rounded-full pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl">
                  <TrendingUp size={24} className="text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold uppercase italic tracking-tighter">
                  Tendências 360
                </h3>
              </div>

              <p className="text-xs text-white/60 leading-relaxed italic">
                O cruzamento de <strong>{leads.length} leads</strong> e{' '}
                <strong>{properties.length} imóveis</strong> mostra maior
                demanda em <strong>{topRegion || 'regiões diversas'}</strong>{' '}
                para imóveis em{' '}
                <strong>{topState || 'diversas localidades'}</strong>.
              </p>

              <div className="space-y-4">
                {[
                  { label: 'Oportunidades Ativas', value: matches.length },
                  { label: 'Eficácia de Match', value: `${matchRate}%` },
                  { label: 'VGV Recomendado', value: vgvMatchmaking },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center pb-4 border-b border-white/5"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                      {stat.label}
                    </span>
                    <span className="text-sm font-bold">{stat.value}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() =>
                  toast.info('Exportação estará disponível em breve')
                }
                className="w-full py-4 bg-indigo-600 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:brightness-110 transition-all flex items-center justify-center gap-3"
              >
                Exportar Sugestões <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-6">
              Configurações de Filtro
            </h3>
            <div className="space-y-4">
              {[
                'Precisão do Match',
                'Priorizar Novas Captações',
                'Notificar via WhatsApp',
              ].map((opt, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl"
                >
                  <span className="text-xs font-bold text-black">{opt}</span>
                  <div className="w-10 h-6 bg-indigo-600 rounded-full flex items-center px-1">
                    <div className="w-4 h-4 bg-white rounded-full ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Matchmaking360;
