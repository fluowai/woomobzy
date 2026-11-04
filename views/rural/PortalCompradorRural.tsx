import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Heart,
  MapPin,
  Search,
  Wheat,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { isRuralProperty } from '../../utils/propertyNiche';

type RuralProperty = {
  id: string;
  title: string;
  property_type?: string;
  price?: number;
  city?: string;
  state?: string;
  images?: string[];
  features?: Record<string, any>;
  total_area_ha?: number;
  niche?: string;
};

type RuralVisit = {
  id: string;
  property_id: string;
  scheduled_at: string;
  status: string;
  properties?: { title?: string } | null;
};

const money = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

const PortalCompradorRural: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    'buscar' | 'favoritos' | 'visitas'
  >('buscar');
  const [properties, setProperties] = useState<RuralProperty[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [visits, setVisits] = useState<RuralVisit[]>([]);
  const [search, setSearch] = useState('');
  const [areaMin, setAreaMin] = useState('');
  const [areaMax, setAreaMax] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!profile?.organization_id || !profile.id) return;
    setLoading(true);
    const [propertyResult, favoriteResult, visitResult] = await Promise.all([
      supabase
        .from('properties')
        .select(
          'id,title,property_type,price,city,state,images,features,total_area_ha,niche'
        )
        .eq('organization_id', profile.organization_id)
        .neq('status', 'Pendente')
        .order('created_at', { ascending: false }),
      supabase
        .from('rural_property_favorites')
        .select('property_id')
        .eq('organization_id', profile.organization_id)
        .eq('profile_id', profile.id),
      supabase
        .from('rural_property_visits')
        .select('id,property_id,scheduled_at,status,properties(title)')
        .eq('organization_id', profile.organization_id)
        .eq('profile_id', profile.id)
        .order('scheduled_at', { ascending: true }),
    ]);

    if (propertyResult.error)
      toast.error('Não foi possível carregar os imóveis rurais.');
    setProperties(
      ((propertyResult.data || []) as RuralProperty[]).filter(isRuralProperty)
    );
    setFavoriteIds(
      new Set((favoriteResult.data || []).map((item) => item.property_id))
    );
    setVisits((visitResult.data || []) as unknown as RuralVisit[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [profile?.organization_id, profile?.id]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    const min = Number(areaMin || 0);
    const max = Number(areaMax || 0);
    return properties.filter((property) => {
      if (activeTab === 'favoritos' && !favoriteIds.has(property.id))
        return false;
      const area = Number(
        property.total_area_ha || property.features?.areaHectares || 0
      );
      if (min > 0 && area < min) return false;
      if (max > 0 && area > max) return false;
      return (
        !term ||
        `${property.title} ${property.city || ''} ${property.state || ''} ${property.property_type || ''}`
          .toLowerCase()
          .includes(term)
      );
    });
  }, [activeTab, areaMax, areaMin, favoriteIds, properties, search]);

  const toggleFavorite = async (propertyId: string) => {
    if (!profile?.organization_id || !profile.id) return;
    const isFavorite = favoriteIds.has(propertyId);
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (isFavorite) {
        next.delete(propertyId);
      } else {
        next.add(propertyId);
      }
      return next;
    });
    const result = isFavorite
      ? await supabase
          .from('rural_property_favorites')
          .delete()
          .eq('profile_id', profile.id)
          .eq('property_id', propertyId)
      : await supabase.from('rural_property_favorites').insert({
          organization_id: profile.organization_id,
          profile_id: profile.id,
          property_id: propertyId,
        });
    if (result.error) {
      toast.error('Não foi possível atualizar o favorito.');
      await load();
    }
  };

  const scheduleVisit = async (property: RuralProperty) => {
    if (!profile?.organization_id || !profile.id) return;
    const scheduledAt = window.prompt(
      'Informe a data e hora da visita (AAAA-MM-DD HH:MM):',
      ''
    );
    if (!scheduledAt) return;
    const parsed = new Date(scheduledAt.replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) {
      toast.error('Data da visita inválida.');
      return;
    }
    const { error } = await supabase.from('rural_property_visits').insert({
      organization_id: profile.organization_id,
      profile_id: profile.id,
      property_id: property.id,
      scheduled_at: parsed.toISOString(),
      status: 'pending',
    });
    if (error) toast.error('Não foi possível agendar a visita.');
    else {
      toast.success('Visita técnica agendada.');
      await load();
      setActiveTab('visitas');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold uppercase italic tracking-tighter text-black">
          <Wheat className="text-emerald-600" size={32} />
          Portal do Investidor Rural
        </h1>
        <p className="font-medium text-black/60">
          Estoque rural, favoritos e visitas técnicas em um só fluxo.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['buscar', 'Buscar propriedades'],
          ['favoritos', `Favoritos (${favoriteIds.size})`],
          ['visitas', `Visitas (${visits.length})`],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`rounded-xl px-6 py-3 text-sm font-bold transition-all ${
              activeTab === key
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'border border-slate-200 bg-white text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab !== 'visitas' && (
        <>
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-6 md:grid-cols-[1fr_180px_180px]">
            <label className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, cidade, UF ou tipo"
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-emerald-500"
              />
            </label>
            <input
              type="number"
              min="0"
              value={areaMin}
              onChange={(event) => setAreaMin(event.target.value)}
              placeholder="Área mínima (ha)"
              className="rounded-xl border border-slate-200 px-4 outline-none"
            />
            <input
              type="number"
              min="0"
              value={areaMax}
              onChange={(event) => setAreaMax(event.target.value)}
              placeholder="Área máxima (ha)"
              className="rounded-xl border border-slate-200 px-4 outline-none"
            />
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400">
              Carregando propriedades rurais...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-400">
              Nenhuma propriedade rural encontrada.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((property) => {
                const area = Number(
                  property.total_area_ha || property.features?.areaHectares || 0
                );
                const score = Number(
                  property.features?.rural_due_diligence?.validation
                    ?.riskScore || 0
                );
                return (
                  <article
                    key={property.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="relative h-44 bg-emerald-50">
                      {property.images?.[0] ? (
                        <img
                          src={property.images[0]}
                          alt={property.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Wheat size={48} className="text-emerald-300" />
                        </div>
                      )}
                      <button
                        onClick={() => toggleFavorite(property.id)}
                        aria-label="Favoritar propriedade"
                        className={`absolute right-3 top-3 rounded-full p-2 ${favoriteIds.has(property.id) ? 'bg-red-500 text-white' : 'bg-white text-slate-500'}`}
                      >
                        <Heart
                          size={17}
                          fill={
                            favoriteIds.has(property.id)
                              ? 'currentColor'
                              : 'none'
                          }
                        />
                      </button>
                    </div>
                    <div className="p-5">
                      <p className="text-xs font-bold uppercase text-emerald-600">
                        {property.property_type || 'Imóvel rural'}
                      </p>
                      <h2 className="mt-1 text-lg font-bold text-slate-900">
                        {property.title}
                      </h2>
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <MapPin size={14} />{' '}
                        {[property.city, property.state]
                          .filter(Boolean)
                          .join(' / ') || 'Localização não informada'}
                      </p>
                      <div className="mt-4 flex gap-2 text-xs font-bold">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                          {area.toLocaleString('pt-BR')} ha
                        </span>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                          Score {score || 'pendente'}
                        </span>
                      </div>
                      <p className="mt-5 text-xl font-bold text-emerald-600">
                        {money(property.price || 0)}
                      </p>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => scheduleVisit(property)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700"
                        >
                          <Calendar size={15} /> Agendar
                        </button>
                        <button
                          onClick={() =>
                            navigate(
                              `/rural/territorio/dossie?property=${property.id}`
                            )
                          }
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white"
                        >
                          Dossiê <ArrowRight size={15} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'visitas' && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
          {visits.length === 0 ? (
            <p className="py-10 text-center text-slate-400">
              Nenhuma visita técnica agendada.
            </p>
          ) : (
            visits.map((visit) => (
              <div
                key={visit.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="text-emerald-600" size={20} />
                  <div>
                    <p className="font-bold text-slate-900">
                      {visit.properties?.title || 'Propriedade rural'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(visit.scheduled_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold uppercase text-amber-700">
                  {visit.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PortalCompradorRural;
