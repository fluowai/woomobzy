import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  Filter,
  Search,
  Grid,
  List,
  ChevronDown,
  Loader2,
  DownloadCloud,
  RefreshCw,
  Building2,
  Trees
} from 'lucide-react';
import { propertyService } from '../services/properties';
import { oruloService } from '../services/orulo';
import { portalService } from '../services/portals';
import { Property } from '../types';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { isRuralProperty, isUrbanProperty } from '../utils/propertyNiche';
import OruloFiltersPanel from './PropertyManagement/OruloFiltersPanel';
import PropertyCard from './PropertyManagement/PropertyCard';
import PropertyMobileCard from './PropertyManagement/PropertyMobileCard';
import PropertyTableRow from './PropertyManagement/PropertyTableRow';
import InstagramPostGenerator from './PropertyManagement/InstagramPostGenerator';

const INITIAL_ORULO_FILTERS = {
  state: '',
  city: '',
  areas: '',
  minPrice: '',
  maxPrice: '',
  bedrooms: '',
  parking: '',
  status: '',
  portfolio: '',
  maxBuildings: '25',
};

const PropertyManagement: React.FC = () => {
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [oruloSyncing, setOruloSyncing] = useState(false);
  const [showOruloFilters, setShowOruloFilters] = useState(false);
  const [oruloFilters, setOruloFilters] = useState(INITIAL_ORULO_FILTERS);
  const [instagramProperty, setInstagramProperty] = useState<Property | null>(
    null
  );
  const navigate = useNavigate();
  const location = useLocation();
  const isRural = location.pathname.startsWith('/rural');
  const currentNiche = isRural ? 'rural' : 'urbano';

  const { profile } = useAuth();

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const data = await propertyService.list(1, 100, currentNiche);
      logger.debug('[PropertyManagement] Imoveis carregados', {
        total: data.length,
        currentNiche,
      });
      setProperties(data);
    } catch (error: any) {
      logger.error('Erro ao carregar imóveis:', error);
      toast.error('Erro ao carregar imóveis: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este imóvel?')) return;
    try {
      await propertyService.delete(id);
      setProperties((prev) => prev.filter((p) => p.id !== id));
      toast.success('Imóvel excluído com sucesso');
    } catch (error: any) {
      toast.error('Erro ao excluir imóvel: ' + error.message);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const property = properties.find((item) => item.id === id);
      await propertyService.update(id, {
        status: 'Disponível' as any,
        published_at: new Date().toISOString(),
      } as any);
      toast.success('Imóvel publicado com sucesso!');
      const buildingId = (property?.features as any)?.orulo?.building_id;
      if ((property as any)?.source === 'orulo' && buildingId) {
        oruloService
          .updatePublicationLinks(buildingId, [
            { url: `${window.location.origin}/property/${id}`, active: true },
          ])
          .catch((error) =>
            logger.warn('Falha ao atualizar link de publicacao Orulo', error)
          );
      }
      loadProperties();
    } catch (error: any) {
      toast.error('Erro ao publicar imóvel: ' + error.message);
    }
  };

  const handleOruloSync = async () => {
    if (currentNiche !== 'urbano') {
      toast.info('A integração da Órulo está disponível apenas no urbano.');
      return;
    }
    try {
      setOruloSyncing(true);
      const filters: Record<string, any> = {};
      const areaList = oruloFilters.areas
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      if (oruloFilters.state.trim())
        filters.state = oruloFilters.state.trim().toUpperCase();
      if (oruloFilters.city.trim()) filters.city = oruloFilters.city.trim();
      if (areaList.length) filters.area = areaList;
      if (oruloFilters.minPrice)
        filters.min_price = Number(oruloFilters.minPrice);
      if (oruloFilters.maxPrice)
        filters.max_price = Number(oruloFilters.maxPrice);
      if (oruloFilters.bedrooms) filters.bedrooms = [oruloFilters.bedrooms];
      if (oruloFilters.parking) filters.parking = [oruloFilters.parking];
      if (oruloFilters.status) filters.status = [oruloFilters.status];
      if (oruloFilters.portfolio) filters.portfolio = [oruloFilters.portfolio];
      const result = await oruloService.sync({
        max_buildings: Math.min(Number(oruloFilters.maxBuildings || 25), 100),
        filters,
      });
      toast.success(
        `Órulo sincronizada: ${result.imported || 0} fichas para revisão.`
      );
      await loadProperties();
    } catch (error: any) {
      toast.error('Erro ao sincronizar Órulo: ' + error.message);
    } finally {
      setOruloSyncing(false);
    }
  };

  const [portalPublishing, setPortalPublishing] = useState<{
    propertyId: string;
    portal: string;
  } | null>(null);

  const handlePortalPublish = async (propertyId: string, portal: string) => {
    try {
      setPortalPublishing({ propertyId, portal });
      await portalService.publish(portal, propertyId);
      toast.success(
        `Publicado no ${portal === 'vivareal' ? 'VivaReal' : 'Zap Imóveis'} com sucesso!`
      );
      loadProperties();
    } catch (error: any) {
      toast.error(`Erro ao publicar: ${error.message}`);
    } finally {
      setPortalPublishing(null);
    }
  };

  const handlePortalUnpublish = async (propertyId: string, portal: string) => {
    if (
      !confirm(
        `Remover anúncio do ${portal === 'vivareal' ? 'VivaReal' : 'Zap Imóveis'}?`
      )
    )
      return;
    try {
      await portalService.unpublish(portal, propertyId);
      toast.success(
        `Removido do ${portal === 'vivareal' ? 'VivaReal' : 'Zap Imóveis'}.`
      );
      loadProperties();
    } catch (error: any) {
      toast.error(`Erro ao remover: ${error.message}`);
    }
  };

  const getPortalPublishes = (property: Property) =>
    (property as any).portal_publishes || {};

  const filteredProperties = properties.filter((p) => {
    const matchesNiche = isRural ? isRuralProperty(p) : isUrbanProperty(p);
    if (!matchesNiche) return false;
    if (activeTab === 'pending') return p.status === 'Pendente';
    return p.status !== 'Pendente';
  });

  const getUrbanFeatureSummary = (property: Property) => {
    const features: any = property.features || {};
    const area =
      features.areaM2 ||
      features.area_m2 ||
      features.physical?.area ||
      features.physical?.builtArea;
    const bedrooms = features.dormitorios || features.bedrooms;
    const bathrooms = features.banheiros || features.bathrooms;
    const parking =
      features.vagas || features.parking_spaces || features.parking;
    const items = [
      area ? `${Number(area).toLocaleString('pt-BR')} m²` : null,
      bedrooms ? `${bedrooms} dorm.` : null,
      bathrooms ? `${bathrooms} banh.` : null,
      parking ? `${parking} vagas` : null,
    ].filter(Boolean);
    return items.length ? items : ['Ficha urbana pendente'];
  };

  const getPropertySummary = (property: Property) => {
    if (!isRural) return getUrbanFeatureSummary(property);
    return [
      `${property.features?.areaHectares || 0} ha`,
      property.features?.tipoSolo || 'Solo N/A',
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
           <Loader2 className="animate-spin text-indigo-600" size={32} />
           <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Carregando Inventário...</p>
        </div>
      </div>
    );
  }

  const HeaderIcon = isRural ? Trees : Building2;

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 pb-12 font-sans text-gray-900">
      
      {/* Header Premium */}
      <div className={`relative overflow-hidden rounded-2xl p-8 shadow-lg ${isRural ? 'bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 shadow-emerald-900/20' : 'bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 shadow-indigo-900/20'}`}>
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute left-0 bottom-0 w-48 h-48 bg-white/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold tracking-wider uppercase backdrop-blur-sm border border-white/10">
                Inventário
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
              <HeaderIcon className={isRural ? 'text-emerald-400' : 'text-indigo-400'} size={36} />
              Gestão de {isRural ? 'Fazendas' : 'Imóveis'}
            </h1>
            <p className="text-white/70 mt-2 text-sm md:text-base max-w-xl">
              Gerencie todo o seu portfólio, anúncios públicos, privados e integrações com portais.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('new')}
              className={`px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg ${isRural ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/30' : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30'}`}
            >
              <Plus size={18} /> Novo {isRural ? 'Ativo' : 'Imóvel'}
            </button>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
         <div className="flex items-center">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'all' ? (isRural ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700') : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              Meus Imóveis
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'pending' ? (isRural ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700') : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              Pendentes / Revisão
              {properties.filter((p) => p.status === 'Pendente').length > 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === 'pending' ? 'bg-white shadow-sm' : 'bg-gray-200'}`}>
                  {properties.filter((p) => p.status === 'Pendente').length}
                </span>
              )}
            </button>
         </div>

         <div className="flex items-center gap-2 pr-2">
            {!isRural && (
               <>
                 <button
                  onClick={() => setShowOruloFilters((v) => !v)}
                  className="px-3 py-2 text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Filter size={16} /> <span className="hidden sm:inline">Orulo</span>
                </button>
                <button
                  onClick={handleOruloSync}
                  disabled={oruloSyncing}
                  className="px-3 py-2 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {oruloSyncing ? <RefreshCw size={16} className="animate-spin" /> : <DownloadCloud size={16} />}
                  <span className="hidden sm:inline">Importar</span>
                </button>
               </>
            )}

            <div className="w-px h-6 bg-gray-200 mx-2"></div>

            <div className="flex bg-gray-50 border border-gray-200 rounded-lg p-0.5">
              <button
                onClick={() => setViewType('grid')}
                className={`p-1.5 rounded-md transition-all ${viewType === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewType('list')}
                className={`p-1.5 rounded-md transition-all ${viewType === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List size={16} />
              </button>
            </div>
         </div>
      </div>

      {!isRural && showOruloFilters && (
        <OruloFiltersPanel
          filters={oruloFilters}
          onUpdate={(key, value) =>
            setOruloFilters((prev) => ({ ...prev, [key]: value }))
          }
          onReset={() => setOruloFilters(INITIAL_ORULO_FILTERS)}
        />
      )}

      {/* Warning message if all properties are in wrong niche */}
      {properties.length > 0 && filteredProperties.length === 0 && (
         <div className="px-6 py-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800 font-medium flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></div>
          Atenção: Você tem {properties.length} imóveis cadastrados, mas todos são do nicho {isRural ? 'Urbano' : 'Rural'}. Alterna o módulo para visualizá-los.
        </div>
      )}

      {/* Filters & Search Row */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por título, ID ou localização..."
            className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button onClick={() => toast.info('Filtro por tipo em breve!')} className="flex-1 lg:flex-none px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors">
            Tipo <ChevronDown size={16} className="text-gray-400" />
          </button>
          <button onClick={() => toast.info('Filtro por status em breve!')} className="flex-1 lg:flex-none px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors">
            Status <ChevronDown size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {filteredProperties.length === 0 ? (
        <div className="text-center py-24 bg-white border border-dashed border-gray-200 rounded-3xl shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 size={32} className="text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Nenhum imóvel encontrado
          </h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto px-4 mb-6">
            {activeTab === 'pending'
              ? 'Você não possui imóveis aguardando revisão no momento.'
              : 'Comece a montar seu portfólio cadastrando o primeiro imóvel.'}
          </p>
          <button
             onClick={() => navigate('new')}
             className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
             Cadastrar Imóvel
          </button>
        </div>
      ) : (
        <>
          {viewType === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  isRural={isRural}
                  isPending={property.status === 'Pendente'}
                  portalPublishing={portalPublishing}
                  getPropertySummary={getPropertySummary}
                  getPortalPublishes={getPortalPublishes}
                  onApprove={handleApprove}
                  onDelete={handleDelete}
                  onPortalPublish={handlePortalPublish}
                  onPortalUnpublish={handlePortalUnpublish}
                  onInstagram={setInstagramProperty}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="divide-y divide-gray-100 md:hidden">
                {filteredProperties.map((property) => (
                  <PropertyMobileCard
                    key={property.id}
                    property={property}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
              <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto hidden md:block">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-gray-50/80 border-b border-gray-100">
                    <tr>
                      {[
                        'Imóvel',
                        'Localização',
                        'Valor',
                        'Status',
                        'Ações',
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredProperties.map((property) => (
                      <PropertyTableRow
                        key={property.id}
                        property={property}
                        isRural={isRural}
                        portalPublishing={portalPublishing}
                        getPropertySummary={getPropertySummary}
                        getPortalPublishes={getPortalPublishes}
                        onDelete={handleDelete}
                        onPortalPublish={handlePortalPublish}
                        onPortalUnpublish={handlePortalUnpublish}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {instagramProperty && (
        <InstagramPostGenerator
          property={instagramProperty}
          isOpen={!!instagramProperty}
          onClose={() => setInstagramProperty(null)}
        />
      )}
    </div>
  );
};

export default PropertyManagement;
