import React, { useState, useEffect } from 'react';
import { MapPin, BedDouble } from 'lucide-react';
import Header from './Header';
import HeroSearch from './HeroSearch';
import { supabase } from '../../../../services/supabase';

interface Property {
  id: string;
  title: string;
  price: string;
  image: string;
  type: string;
  bedrooms: number;
  area: number;
}

const formatPrice = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value || 0);

export default function MegaTheme() {
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadProperties = async () => {
      try {
        const { data: tenant } = await supabase.rpc('get_tenant_public', {
          slug_input: 'megainvestimentos',
        });
        const orgId = tenant?.[0]?.id;
        if (!orgId) return;

        const { data, error } = await supabase
          .from('public_available_properties')
          .select(
            'id,title,price,city,state,property_type,images,thumbnail,features,total_area_ha'
          )
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(24);

        if (error) throw error;
        if (cancelled) return;

        setProperties(
          (data || []).map((property: any) => {
            const features = property.features || {};
            const images = Array.isArray(property.images)
              ? property.images
              : [];
            return {
              id: property.id,
              title: property.title || 'Imóvel',
              price: formatPrice(Number(property.price || 0)),
              image: property.thumbnail || images[0] || '',
              type: property.property_type || 'Imóvel',
              bedrooms: features.bedrooms || features.suites || 0,
              area:
                features.areaM2 ||
                features.built_area ||
                Math.round(Number(property.total_area_ha || 0) * 10000) ||
                0,
            };
          })
        );
      } catch (err) {
        console.error('Erro ao carregar imóveis:', err);
      }
    };

    loadProperties();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="font-['Inter',sans-serif] bg-[#f8fafc] min-h-screen">
      <Header />
      <HeroSearch />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-[#00325c]">
            Imóveis em Destaque
          </h2>
          <a href="#" className="text-[#226aa6] font-semibold hover:underline">
            Ver todos
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {properties.map((prop) => (
            <div
              key={prop.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={prop.image}
                  alt={prop.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-[#226aa6] text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                    {prop.type}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                  {prop.title}
                </h3>
                <p className="text-2xl font-bold text-[#059669] mb-4">
                  {prop.price}
                </p>
                <div className="flex items-center gap-4 text-gray-600 text-sm">
                  <div className="flex items-center gap-1">
                    <BedDouble size={18} />
                    <span>{prop.bedrooms} Quartos</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin size={18} />
                    <span>{prop.area}m²</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="bg-[#00325c] text-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <img
            src="https://megainvestimoveis.com.br/assets/layout/megainvestimentos/logo_branca.png?v=11a4075f"
            alt="Mega Investimentos"
            className="h-16 object-contain"
          />
          <div className="text-center md:text-right">
            <p className="text-gray-300">
              Rua Reinaldo Porchat, 342 - Jardim Prof° Francisco Morato
            </p>
            <p className="text-gray-300">Francisco Morato/SP</p>
            <p className="mt-4 font-bold text-lg">(11) 95606-9703</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
