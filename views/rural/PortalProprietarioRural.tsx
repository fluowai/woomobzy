import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Clock, DollarSign, Eye, FileText, Home, MapPin, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { isRuralProperty } from '../../utils/propertyNiche';

type RuralProperty = {
  id: string;
  title: string;
  price?: number;
  status?: string;
  city?: string;
  state?: string;
  total_area_ha?: number;
  features?: Record<string, any>;
  niche?: string;
  property_type?: string;
  created_at?: string;
};

type RuralDocument = {
  id: string;
  property_id: string;
  original_name: string;
  document_type?: string;
  status?: string;
  validation_status?: string;
  created_at: string;
};

const money = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

const PortalProprietarioRural: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'docs' | 'financeiro'>('overview');
  const [properties, setProperties] = useState<RuralProperty[]>([]);
  const [documents, setDocuments] = useState<RuralDocument[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.organization_id) return;
    const load = async () => {
      setLoading(true);
      const [propertyResult, documentResult, leadResult] = await Promise.all([
        supabase
          .from('properties')
          .select('id,title,price,status,city,state,total_area_ha,features,niche,property_type,created_at')
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('documents')
          .select('id,property_id,original_name,document_type,status,validation_status,created_at')
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('leads')
          .select('id,property_id,status,created_at,match_profile,preferences')
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false }),
      ]);
      if (propertyResult.error) toast.error('Não foi possível carregar as propriedades rurais.');
      const ruralProperties = ((propertyResult.data || []) as RuralProperty[]).filter(isRuralProperty);
      const ruralIds = new Set(ruralProperties.map((property) => property.id));
      setProperties(ruralProperties);
      setDocuments(((documentResult.data || []) as RuralDocument[]).filter((document) => ruralIds.has(document.property_id)));
      setLeads(
        (leadResult.data || []).filter(
          (lead) =>
            ruralIds.has(lead.property_id) ||
            lead.match_profile === 'rural' ||
            lead.preferences?.niche === 'rural',
        ),
      );
      setLoading(false);
    };
    load();
  }, [profile?.organization_id]);

  const totalValue = properties.reduce((sum, property) => sum + Number(property.price || 0), 0);
  const proposals = leads.filter((lead) => ['Proposta', 'Negociação'].includes(lead.status)).length;
  const documentMap = useMemo(() => {
    const map = new Map<string, RuralDocument[]>();
    documents.forEach((document) => {
      map.set(document.property_id, [...(map.get(document.property_id) || []), document]);
    });
    return map;
  }, [documents]);

  if (loading) return <div className="py-16 text-center text-slate-400">Carregando portal rural...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-black uppercase italic tracking-tighter text-black">
          <Home className="text-emerald-600" size={32} />
          Portal do Proprietário Rural
        </h1>
        <p className="font-medium text-black/60">Acompanhamento real da carteira, documentação e oportunidades rurais.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['overview', 'Visão geral'],
          ['docs', `Documentação (${documents.length})`],
          ['financeiro', 'Financeiro'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`rounded-xl px-6 py-3 text-sm font-bold transition-all ${
              activeTab === key ? 'bg-emerald-600 text-white shadow-lg' : 'border border-slate-200 bg-white text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {properties.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-400">
              Nenhuma propriedade rural cadastrada.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {properties.map((property) => {
                const propertyDocs = documentMap.get(property.id) || [];
                const propertyLeads = leads.filter((lead) => lead.property_id === property.id);
                const score = Number(property.features?.rural_due_diligence?.validation?.riskScore || 0);
                return (
                  <article key={property.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-black text-slate-900">{property.title}</h2>
                        <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                          <MapPin size={14} /> {[property.city, property.state].filter(Boolean).join(' / ') || 'Localização não informada'}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">
                        {property.status || 'Sem status'}
                      </span>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3 text-center">
                        <Eye className="mx-auto mb-1 text-blue-500" size={16} />
                        <p className="font-black text-slate-900">{score || '—'}</p>
                        <p className="text-[10px] font-bold uppercase text-slate-400">Score</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 text-center">
                        <TrendingUp className="mx-auto mb-1 text-emerald-500" size={16} />
                        <p className="font-black text-slate-900">{propertyLeads.length}</p>
                        <p className="text-[10px] font-bold uppercase text-slate-400">Leads</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 text-center">
                        <FileText className="mx-auto mb-1 text-amber-500" size={16} />
                        <p className="font-black text-slate-900">{propertyDocs.length}</p>
                        <p className="text-[10px] font-bold uppercase text-slate-400">Docs</p>
                      </div>
                    </div>
                    <div className="mt-5 flex items-end justify-between">
                      <span className="text-sm text-slate-500">{Number(property.total_area_ha || property.features?.areaHectares || 0).toLocaleString('pt-BR')} ha</span>
                      <strong className="text-lg text-emerald-600">{money(property.price || 0)}</strong>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'docs' && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
          {documents.length === 0 ? (
            <p className="py-10 text-center text-slate-400">Nenhum documento rural enviado.</p>
          ) : (
            documents.map((document) => {
              const validated = document.status === 'validated' || document.validation_status === 'valid';
              const property = properties.find((item) => item.id === document.property_id);
              return (
                <div key={document.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {validated ? <CheckCircle className="shrink-0 text-emerald-500" size={20} /> : <Clock className="shrink-0 text-amber-500" size={20} />}
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-800">{document.document_type || document.original_name}</p>
                      <p className="text-xs text-slate-500">{property?.title || 'Propriedade rural'} · {new Date(document.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${validated ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {validated ? 'Validado' : document.status || 'Pendente'}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'financeiro' && (
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ['Valor total em carteira', money(totalValue), DollarSign, 'text-emerald-600'],
            ['Propostas em andamento', String(proposals), TrendingUp, 'text-blue-600'],
            ['Imóveis rurais', String(properties.length), Home, 'text-amber-600'],
          ].map(([label, value, Icon, color]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-6">
              <Icon className={String(color)} size={24} />
              <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">{label as string}</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{value as string}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortalProprietarioRural;
