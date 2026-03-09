import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, Filter, MapPin, ChevronDown, Check, X, 
  ArrowRight, Heart, Share2, Grid, List as ListIcon 
} from 'lucide-react';
import { Property, PropertyType, PropertyPurpose, PropertyAptitude } from '../types';
import { propertyService } from '../services/properties';
import SiteHeader from '../components/SiteHeader';

const PropertyListing: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  
  // Filtros
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState({
    purpose: (searchParams.get('purpose') as PropertyPurpose) || 'Todos',
    type: (searchParams.get('type') as PropertyType) || 'Todos',
    aptitude: searchParams.get('aptitude') ? [searchParams.get('aptitude') as PropertyAptitude] : [],
    city: searchParams.get('city') || '',
    minArea: searchParams.get('minArea') || '',
    maxArea: searchParams.get('maxArea') || '',
    minPrice: '',
    maxPrice: ''
  });

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, properties]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const data = await propertyService.list();
      // Filtrar apenas imóveis disponíveis
      // const available = data.filter(p => p.status === 'Disponível'); // Se houver enum
      setProperties(data);
    } catch (error) {
      console.error("Erro ao carregar imóveis", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...properties];

    // Finalidade
    if (filters.purpose !== 'Todos') {
      result = result.filter(p => p.purpose === filters.purpose);
    }

    // Tipo
    if (filters.type !== 'Todos') {
      result = result.filter(p => p.type === filters.type);
    }

    // Cidade
    if (filters.city) {
      result = result.filter(p => 
        p.location.city.toLowerCase().includes(filters.city.toLowerCase()) ||
        p.location.state.toLowerCase().includes(filters.city.toLowerCase())
      );
    }

    // Aptidão (Se tiver alguma selecionada, o imóvel deve ter pelo menos uma delas ou todas? 
    // Geralmente ANY match is good, ou ALL. Vamos de ANY match por enquanto)
    if (filters.aptitude.length > 0) {
      result = result.filter(p => 
        p.aptitude && p.aptitude.some(apt => filters.aptitude.includes(apt))
      );
    }

    // Área
    if (filters.minArea) {
      result = result.filter(p => (p.features.areaHectares || 0) >= Number(filters.minArea));
    }
    if (filters.maxArea) {
      result = result.filter(p => (p.features.areaHectares || 0) <= Number(filters.maxArea));
    }

    // Preço
    if (filters.minPrice) {
      result = result.filter(p => p.price >= Number(filters.minPrice));
    }
    if (filters.maxPrice) {
      result = result.filter(p => p.price <= Number(filters.maxPrice));
    }

    setFilteredProperties(result);
  };

  const toggleAptitude = (apt: PropertyAptitude) => {
    setFilters(prev => {
      const current = prev.aptitude;
      if (current.includes(apt)) {
        return { ...prev, aptitude: current.filter(a => a !== apt) };
      } else {
        return { ...prev, aptitude: [...current, apt] };
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <SiteHeader />
      
      {/* Header Compacto */}
      <div className="bg-slate-900 pt-32 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
            Encontre sua Propriedade Rural
          </h1>
          <p className="text-slate-400 max-w-2xl">
            Utilize os filtros avançados para encontrar fazendas, sítios e áreas rurais com a aptidão ideal para seu negócio.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar de Filtros */}
        <div className="w-full md:w-80 flex-shrink-0 space-y-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Filter size={20} className="text-indigo-600" /> Filtros
              </h2>
              <button 
                onClick={() => setFilters({
                  purpose: 'Todos', type: 'Todos', aptitude: [], city: '', 
                  minArea: '', maxArea: '', minPrice: '', maxPrice: ''
                })}
                className="text-xs font-bold text-slate-500 hover:text-indigo-600"
              >
                LIMPAR
              </button>
            </div>

            {/* Localização */}
            <div className="mb-6">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Localização</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Cidade ou Estado"
                  value={filters.city}
                  onChange={e => setFilters({...filters, city: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Finalidade */}
            <div className="mb-6">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Finalidade</label>
              <div className="flex gap-2">
                {['Todos', 'Venda', 'Aluguel'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setFilters({...filters, purpose: opt as any})}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                      filters.purpose === opt 
                      ? 'bg-indigo-600 text-white border-indigo-600' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Aptidão */}
            <div className="mb-6">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Aptidão / Vocação</label>
              <div className="space-y-2">
                {Object.values(PropertyAptitude).map(apt => (
                  <label key={apt} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`
                      w-5 h-5 rounded border flex items-center justify-center transition-colors
                      ${filters.aptitude.includes(apt) 
                        ? 'bg-indigo-600 border-indigo-600' 
                        : 'bg-white border-slate-300 group-hover:border-indigo-400'}
                    `}>
                      {filters.aptitude.includes(apt) && <Check size={12} className="text-white" />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={filters.aptitude.includes(apt)}
                      onChange={() => toggleAptitude(apt)}
                    />
                    <span className={`text-sm ${filters.aptitude.includes(apt) ? 'text-indigo-900 font-semibold' : 'text-slate-600'}`}>{apt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Área */}
            <div className="mb-6">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Área (Hectares)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  placeholder="Mín"
                  value={filters.minArea}
                  onChange={e => setFilters({...filters, minArea: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <span className="text-slate-400">-</span>
                <input 
                  type="number" 
                  placeholder="Máx"
                  value={filters.maxArea}
                  onChange={e => setFilters({...filters, maxArea: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

             {/* Preço */}
             <div className="mb-6">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Valor (R$)</label>
              <div className="space-y-2">
                 <input 
                  type="number" 
                  placeholder="Mínimo"
                  value={filters.minPrice}
                  onChange={e => setFilters({...filters, minPrice: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <input 
                  type="number" 
                  placeholder="Máximo"
                  value={filters.maxPrice}
                  onChange={e => setFilters({...filters, maxPrice: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Lista de Resultados */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-slate-600 font-medium">
              Mostrando <span className="font-bold text-slate-900">{filteredProperties.length}</span> imóveis
            </h2>
            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200">
               <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 <Grid size={20} />
               </button>
               <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 <ListIcon size={20} />
               </button>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
             <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
             </div>
          ) : filteredProperties.length === 0 ? (
             <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                <Search size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Nenhum imóvel encontrado</h3>
                <p className="text-slate-500">Tente ajustar os filtros para encontrar o que procura.</p>
                <button 
                  onClick={() => setFilters({
                    purpose: 'Todos', type: 'Todos', aptitude: [], city: '', 
                    minArea: '', maxArea: '', minPrice: '', maxPrice: ''
                  })}
                  className="mt-6 text-indigo-600 font-bold hover:underline"
                >
                  Limpar todos os filtros
                </button>
             </div>
          ) : (
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
              {filteredProperties.map(property => (
                <div key={property.id} className={`group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-100 flex ${viewMode === 'list' ? 'flex-col md:flex-row' : 'flex-col'}`}>
                  {/* Image */}
                  <div className={`relative overflow-hidden ${viewMode === 'list' ? 'w-full md:w-72 h-64 md:h-auto' : 'h-64'}`}>
                    <img 
                      src={property.images[0] || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2832&auto=format&fit=crop'} 
                      alt={property.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute top-4 left-4 flex gap-2">
                       <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-slate-900 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm">
                         {property.type}
                       </span>
                       {property.purpose === PropertyPurpose.RENT && (
                         <span className="px-3 py-1 bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm">
                           Aluguel
                         </span>
                       )}
                    </div>
                    <button className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-all opacity-0 group-hover:opacity-100">
                      <Heart size={18} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-2">
                         <h3 className="font-bold text-slate-900 text-lg leading-tight group-hover:text-indigo-600 transition-colors">
                           {property.title}
                         </h3>
                      </div>
                      <p className="text-slate-500 text-sm mb-4 line-clamp-2">
                        {property.description}
                      </p>

                      {/* Specs Tags */}
                      <div className="flex flex-wrap gap-2 mb-6">
                         {property.features.areaHectares > 0 && (
                           <span className="px-3 py-1 bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg border border-slate-100">
                             {property.features.areaHectares} ha
                           </span>
                         )}
                         {property.aptitude && property.aptitude.slice(0, 2).map(apt => (
                           <span key={apt} className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-lg border border-indigo-100">
                             {apt}
                           </span>
                         ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-auto">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Valor</p>
                        <p className="text-xl font-black text-slate-900">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.price)}
                        </p>
                      </div>
                      <button 
                        onClick={() => navigate(`/property/${property.id}`)}
                        className="p-3 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-slate-200 hover:shadow-indigo-200"
                      >
                        <ArrowRight size={20} />
                      </button>
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

export default PropertyListing;
