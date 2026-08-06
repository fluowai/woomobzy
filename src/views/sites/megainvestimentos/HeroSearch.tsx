import React from 'react';
import {
  Search,
  ChevronDown,
  MapPin,
  BedDouble,
  Building,
  Home,
} from 'lucide-react';

export default function HeroSearch() {
  return (
    <section className="relative min-h-[600px] flex items-center justify-center pt-24 pb-12">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://cdn.imobisoft.com.br/megainvestimentos/layout/capa_1779904550.webp"
          alt="Mega Investimentos Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 w-full max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 drop-shadow-lg">
            Tornando sonhos em realidade!
          </h1>
        </div>

        {/* Search Box */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row items-stretch">
          <div className="flex-1 flex items-center gap-3 p-4 border-b md:border-b-0 md:border-r border-gray-200 cursor-pointer hover:bg-gray-50/50">
            <Building className="text-[#3b82f6]" size={20} />
            <div className="flex-1">
              <input
                type="text"
                readOnly
                placeholder="Tipo"
                className="w-full bg-transparent outline-none cursor-pointer text-gray-800 font-medium"
              />
            </div>
            <ChevronDown className="text-gray-400" size={16} />
          </div>

          <div className="flex-1 flex items-center gap-3 p-4 border-b md:border-b-0 md:border-r border-gray-200 cursor-pointer hover:bg-gray-50/50">
            <BedDouble className="text-[#3b82f6]" size={20} />
            <div className="flex-1">
              <input
                type="text"
                readOnly
                placeholder="Dorms"
                className="w-full bg-transparent outline-none cursor-pointer text-gray-800 font-medium"
              />
            </div>
            <ChevronDown className="text-gray-400" size={16} />
          </div>

          <div className="flex-[2] flex items-center gap-3 p-4 cursor-text">
            <MapPin className="text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Pesquise código, cidade, bairro..."
              className="w-full bg-transparent outline-none text-gray-800 placeholder-gray-500 font-medium"
            />
          </div>

          <button className="bg-[#226aa6] hover:bg-[#00325c] text-white font-bold px-8 py-4 md:py-0 transition-colors flex items-center justify-center gap-2 uppercase tracking-wide">
            Pesquisar <Search size={18} />
          </button>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {[
            { icon: Building, label: 'Lançamentos' },
            { icon: Home, label: 'Prontos pra Morar' },
            { icon: Building, label: 'Apartamentos' },
            { icon: Home, label: 'Casas' },
            { icon: MapPin, label: 'Terrenos' },
            { icon: Building, label: 'Coberturas' },
          ].map((item, idx) => (
            <a
              key={idx}
              href="#"
              className="flex items-center gap-2 px-5 py-2.5 bg-white/15 backdrop-blur-md border border-white/30 rounded-full text-white text-sm font-medium hover:bg-white/25 hover:-translate-y-0.5 transition-all"
            >
              <item.icon size={16} className="opacity-80" />
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
