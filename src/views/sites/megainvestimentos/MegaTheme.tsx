import React, { useState, useEffect } from 'react';
import { Search, MapPin, BedDouble, Home } from 'lucide-react';
import Header from './Header';
import HeroSearch from './HeroSearch';

export default function MegaTheme() {
  const [properties, setProperties] = useState([]);

  // Fetch properties (mocked or you can fetch from backend in a real scenario)
  useEffect(() => {
    // In a real app, you would fetch from /api/properties?organization_id=...
    setProperties([
      {
        id: '1',
        title: 'Apartamento 2 Quartos no Spetacollo Residencial - Laranjeira',
        price: 'R$ 250.000',
        image: 'https://cdn.imobisoft.com.br/megainvestimentos/layout/capa_1779904550.webp',
        type: 'Apartamento',
        bedrooms: 2,
        area: 50,
      }
    ]);
  }, []);

  return (
    <div className="font-['Inter',sans-serif] bg-[#f8fafc] min-h-screen">
      <Header />
      <HeroSearch />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-[#00325c]">Imóveis em Destaque</h2>
          <a href="#" className="text-[#226aa6] font-semibold hover:underline">Ver todos</a>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {properties.map((prop) => (
            <div key={prop.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="relative h-64 overflow-hidden">
                <img src={prop.image} alt={prop.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" />
                <div className="absolute top-4 left-4">
                  <span className="bg-[#226aa6] text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                    {prop.type}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{prop.title}</h3>
                <p className="text-2xl font-bold text-[#059669] mb-4">{prop.price}</p>
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
          <img src="https://megainvestimoveis.com.br/assets/layout/megainvestimentos/logo_branca.png?v=11a4075f" alt="Mega Investimentos" className="h-16 object-contain" />
          <div className="text-center md:text-right">
            <p className="text-gray-300">Rua Reinaldo Porchat, 342 - Jardim Prof° Francisco Morato</p>
            <p className="text-gray-300">Francisco Morato/SP</p>
            <p className="mt-4 font-bold text-lg">(11) 95606-9703</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
