import React, { useEffect, useMemo, useState } from 'react';
import {
  Bath,
  Bed,
  Building2,
  Car,
  Heart,
  MapPin,
  Maximize,
  Search,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { isUrbanProperty } from '../../utils/propertyNiche';

type UrbanProperty = {
  id: string;
  title: string;
  property_type?: string;
  price?: number;
  purpose?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  images?: string[];
  features?: Record<string, any>;
  niche?: string;
};

const money = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

export default function PortalCompradorUrbano() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'buscar' | 'favoritos'>('buscar');
  const [properties, setProperties] = useState<UrbanProperty[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!profile?.organization_id || !profile.id) return;
    setLoading(true);
    const [{ data: propertyData }, { data: favoriteData }] = await Promise.all([
      supabase
        .from('properties')
        .select('id,title,property_type,price,purpose,city,state,neighborhood,images,features,niche')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('urban_property_favorites')
        .select('property_id')
        .eq('organization_id', profile.organization_id)
        .eq('profile_id', profile.id),
    ]);

    setProperties(((propertyData || []) as UrbanProperty[]).filter(isUrbanProperty));
    setFavoriteIds(new Set((favoriteData || []).map((item) => item.property_id)));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [profile?.organization_id, profile?.id]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return properties.filter((property) => {
      if (activeTab === 'favoritos' && !favoriteIds.has(property.id)) return false;
      if (type && property.property_type !== type) return false;
      return !term || `${property.title} ${property.city || ''} ${property.neighborhood || ''}`
        .toLowerCase()
        .includes(term);
    });
  }, [activeTab, favoriteIds, properties, search, type]);

  const propertyTypes = useMemo(
    () => Array.from(new Set(properties.map((property) => property.property_type).filter(Boolean))),
    [properties]
  );

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

    if (isFavorite) {
      await supabase
        .from('urban_property_favorites')
        .delete()
        .eq('profile_id', profile.id)
        .eq('property_id', propertyId);
    } else {
      await supabase.from('urban_property_favorites').insert({
        organization_id: profile.organization_id,
        profile_id: profile.id,
        property_id: propertyId,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-black uppercase italic tracking-tighter text-slate-900">
          <Building2 className="text-blue-600" size={32} />
          Portal do Comprador
        </h1>
        <p className="font-medium text-slate-500">Consulte o estoque urbano publicado pela imobiliaria.</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setActiveTab('buscar')} className={`rounded-xl px-5 py-3 text-sm font-bold ${activeTab === 'buscar' ? 'bg-blue-600 text-white' : 'border bg-white text-slate-500'}`}>Buscar imoveis</button>
        <button onClick={() => setActiveTab('favoritos')} className={`rounded-xl px-5 py-3 text-sm font-bold ${activeTab === 'favoritos' ? 'bg-blue-600 text-white' : 'border bg-white text-slate-500'}`}>Favoritos ({favoriteIds.size})</button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[1fr_220px]">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, bairro ou cidade" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-blue-500" />
        </label>
        <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-xl border border-slate-200 px-4 outline-none">
          <option value="">Todos os tipos</option>
          {propertyTypes.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">Carregando imoveis...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-400">
          Nenhum imovel urbano encontrado para estes filtros.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((property) => {
            const features = property.features || {};
            const image = property.images?.[0];
            const area = Number(features.areaM2 || features.areaConstruida || 0);
            return (
              <article key={property.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="relative h-44 bg-slate-100">
                  {image ? <img src={image} alt={property.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Building2 className="text-slate-300" size={48} /></div>}
                  <button onClick={() => toggleFavorite(property.id)} aria-label="Favoritar imovel" className={`absolute right-3 top-3 rounded-full p-2 ${favoriteIds.has(property.id) ? 'bg-red-500 text-white' : 'bg-white text-slate-500'}`}>
                    <Heart size={17} fill={favoriteIds.has(property.id) ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <div className="p-5">
                  <p className="text-xs font-bold uppercase text-blue-600">{property.property_type} - {property.purpose}</p>
                  <h2 className="mt-1 font-black text-slate-900">{property.title}</h2>
                  <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} /> {[property.neighborhood, property.city, property.state].filter(Boolean).join(', ')}</p>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                    {features.dormitorios > 0 && <span className="flex items-center gap-1"><Bed size={15} /> {features.dormitorios}</span>}
                    {features.banheiros > 0 && <span className="flex items-center gap-1"><Bath size={15} /> {features.banheiros}</span>}
                    {features.vagas > 0 && <span className="flex items-center gap-1"><Car size={15} /> {features.vagas}</span>}
                    {area > 0 && <span className="flex items-center gap-1"><Maximize size={15} /> {area} m2</span>}
                  </div>
                  <p className="mt-5 text-xl font-black text-blue-600">{money(property.price || 0)}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
