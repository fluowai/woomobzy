import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus, Filter, Search, Grid, List, ChevronDown, Loader2, DownloadCloud, RefreshCw,
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

const INITIAL_ORULO_FILTERS = {
  state: '', city: '', areas: '', minPrice: '', maxPrice: '',
  bedrooms: '', parking: '', status: '', portfolio: '', maxBuildings: '25',
};

const PropertyManagement: React.FC = () => {
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [oruloSyncing, setOruloSyncing] = useState(false);
  const [showOruloFilters, setShowOruloFilters] = useState(false);
  const [oruloFilters, setOruloFilters] = useState(INITIAL_ORULO_FILTERS);
  const navigate = useNavigate();
  const location = useLocation();
  const isRural = location.pathname.startsWith('/rural');
  const currentNiche = isRural ? 'rural' : 'urbano';

  const { profile } = useAuth();

  useEffect(() => { loadProperties(); }, []);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const data = await propertyService.list(1, 100, currentNiche);
      logger.debug('[PropertyManagement] Imoveis carregados', { total: data.length, currentNiche });
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
      await propertyService.update(id, { status: 'Disponível' as any, published_at: new Date().toISOString() } as any);
      toast.success('Imóvel publicado com sucesso!');
      const buildingId = (property?.features as any)?.orulo?.building_id;
      if ((property as any)?.source === 'orulo' && buildingId) {
        oruloService.updatePublicationLinks(buildingId, [{ url: `${window.location.origin}/property/${id}`, active: true }])
          .catch((error) => logger.warn('Falha ao atualizar link de publicacao Orulo', error));
      }
      loadProperties();
    } catch (error: any) {
      toast.error('Erro ao publicar imóvel: ' + error.message);
    }
  };

  const handleOruloSync = async () => {
    if (currentNiche !== 'urbano') { toast.info('A integração da Órulo está disponível apenas no urbano.'); return; }
    try {
      setOruloSyncing(true);
      const filters: Record<string, any> = {};
      const areaList = oruloFilters.areas.split(',').map((item) => item.trim()).filter(Boolean);
      if (oruloFilters.state.trim()) filters.state = oruloFilters.state.trim().toUpperCase();
      if (oruloFilters.city.trim()) filters.city = oruloFilters.city.trim();
      if (areaList.length) filters.area = areaList;
      if (oruloFilters.minPrice) filters.min_price = Number(oruloFilters.minPrice);
      if (oruloFilters.maxPrice) filters.max_price = Number(oruloFilters.maxPrice);
      if (oruloFilters.bedrooms) filters.bedrooms = [oruloFilters.bedrooms];
      if (oruloFilters.parking) filters.parking = [oruloFilters.parking];
      if (oruloFilters.status) filters.status = [oruloFilters.status];
      if (oruloFilters.portfolio) filters.portfolio = [oruloFilters.portfolio];
      const result = await oruloService.sync({ max_buildings: Math.min(Number(oruloFilters.maxBuildings || 25), 100), filters });
      toast.success(`Órulo sincronizada: ${result.imported || 0} fichas para revisão.`);
      await loadProperties();
    } catch (error: any) {
      toast.error('Erro ao sincronizar Órulo: ' + error.message);
    } finally {
      setOruloSyncing(false);
    }
  };

  const [portalPublishing, setPortalPublishing] = useState<{ propertyId: string; portal: string } | null>(null);

  const handlePortalPublish = async (propertyId: string, portal: string) => {
    try {
      setPortalPublishing({ propertyId, portal });
      await portalService.publish(portal, propertyId);
      toast.success(`Publicado no ${portal === 'vivareal' ? 'VivaReal' : 'Zap Imóveis'} com sucesso!`);
      loadProperties();
    } catch (error: any) {
      toast.error(`Erro ao publicar: ${error.message}`);
    } finally {
      setPortalPublishing(null);
    }
  };

  const handlePortalUnpublish = async (propertyId: string, portal: string) => {
    if (!confirm(`Remover anúncio do ${portal === 'vivareal' ? 'VivaReal' : 'Zap Imóveis'}?`)) return;
    try {
      await portalService.unpublish(portal, propertyId);
      toast.success(`Removido do ${portal === 'vivareal' ? 'VivaReal' : 'Zap Imóveis'}.`);
      loadProperties();
    } catch (error: any) {
      toast.error(`Erro ao remover: ${error.message}`);
    }
  };

  const getPortalPublishes = (property: Property) => (property as any).portal_publishes || {};

  const filteredProperties = properties.filter((p) => {
    const matchesNiche = isRural ? isRuralProperty(p) : isUrbanProperty(p);
    if (!matchesNiche) return false;
    if (activeTab === 'pending') return p.status === 'Pendente';
    return p.status !== 'Pendente';
  });

  const getUrbanFeatureSummary = (property: Property) => {
    const features: any = property.features || {};
    const area = features.areaM2 || features.area_m2 || features.physical?.area || features.physical?.builtArea;
    const bedrooms = features.dormitorios || features.bedrooms;
    const bathrooms = features.banheiros || features.bathrooms;
    const parking = features.vagas || features.parking_spaces || features.parking;
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
    return [`${property.features?.areaHectares || 0} ha`, property.features?.tipoSolo || 'Solo N/A'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 animate-fade-in">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold mb-1">Gerenciamento de Imóveis</h1>
          <p className="text-sm text-slate-500">Gerencie todos os seus anúncios públicos e privados.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button onClick={() => setViewType('grid')} className={`p-2 rounded-lg transition-all ${viewType === 'grid' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><Grid size={18} /></button>
            <button onClick={() => setViewType('list')} className={`p-2 rounded-lg transition-all ${viewType === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><List size={18} /></button>
          </div>
          <button onClick={() => navigate('new')} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all font-bold text-sm shadow-lg shadow-indigo-500/20">
            <Plus size={18} /><span className="hidden sm:inline">Cadastrar Imóvel</span><span className="sm:hidden">Novo</span>
          </button>
          {!isRural && (
            <>
              <button onClick={() => setShowOruloFilters((v) => !v)} className="bg-white text-slate-700 border border-slate-200 px-3 py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-all font-bold text-sm shadow-sm" title="Filtros Orulo">
                <Filter size={18} /><span className="hidden sm:inline">Filtros Orulo</span>
              </button>
              <button onClick={handleOruloSync} disabled={oruloSyncing} className="bg-slate-900 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-800 transition-all font-bold text-sm shadow-lg disabled:opacity-60" title="Importar catálogo urbano da Órulo para revisão">
                {oruloSyncing ? <RefreshCw size={18} className="animate-spin" /> : <DownloadCloud size={18} />}
                <span className="hidden sm:inline">Importar Órulo</span><span className="sm:hidden">Órulo</span>
              </button>
            </>
          )}
        </div>
      </div>

      {!isRural && showOruloFilters && (
        <OruloFiltersPanel
          filters={oruloFilters}
          onUpdate={(key, value) => setOruloFilters((prev) => ({ ...prev, [key]: value }))}
          onReset={() => setOruloFilters(INITIAL_ORULO_FILTERS)}
        />
      )}

      {/* Tabs */}
      <div className="flex border-b border-border-subtle items-center justify-between">
        <div className="flex">
          <button onClick={() => setActiveTab('all')} className={`px-8 py-4 text-sm font-bold border-b-2 transition-all tracking-wide ${activeTab === 'all' ? 'border-primary text-primary' : 'border-transparent text-text-tertiary hover:text-text-primary'}`}>Meus Imóveis</button>
          <button onClick={() => setActiveTab('pending')} className={`px-8 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-3 tracking-wide ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-text-tertiary hover:text-text-primary'}`}>
            Solicitações Externas
            {properties.filter((p) => p.status === 'Pendente').length > 0 && (
              <span className="bg-accent text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-accent/20">{properties.filter((p) => p.status === 'Pendente').length}</span>
            )}
          </button>
        </div>
        {properties.length > 0 && filteredProperties.length === 0 && (
          <div className="px-6 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium mr-4 flex items-center gap-2">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span>
            Atenção: Você tem {properties.length} imóveis cadastrados, mas todos são do nicho {isRural ? 'Urbano' : 'Rural'}.
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="card p-4 flex flex-col lg:flex-row gap-4 items-center bg-bg-card/50 backdrop-blur-md">
        <div className="flex-1 relative w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-primary transition-colors" size={18} />
          <input type="text" placeholder="Buscar por título, bairro ou ID..." className="input-field pl-12" />
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button className="btn btn-secondary flex-1 lg:flex-none h-11 px-4 text-xs uppercase tracking-widest font-bold">Tipo <ChevronDown size={14} /></button>
          <button className="btn btn-secondary flex-1 lg:flex-none h-11 px-4 text-xs uppercase tracking-widest font-bold">Status <ChevronDown size={14} /></button>
          <button className="btn btn-secondary flex-1 lg:flex-none h-11 px-4 text-xs uppercase tracking-widest font-bold"><Filter size={14} /> Filtros</button>
        </div>
      </div>

      {filteredProperties.length === 0 ? (
        <div className="text-center py-16 sm:py-24 border-2 border-dashed border-slate-200 rounded-2xl">
          <h3 className="text-lg sm:text-xl font-bold text-slate-400 mb-2">Nenhum imóvel encontrado</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto px-4">{activeTab === 'pending' ? 'Não há solicitações pendentes no momento.' : 'Comece cadastrando seu primeiro imóvel.'}</p>
        </div>
      ) : (
        <>
          {viewType === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="divide-y divide-slate-100 md:hidden">
                {filteredProperties.map((property) => (
                  <PropertyMobileCard key={property.id} property={property} onDelete={handleDelete} />
                ))}
              </div>
              <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto hidden md:block">
                <table className="w-full text-left min-w-[640px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Imóvel', 'Localização', 'Valor', 'Status', 'Ações'].map((h) => (
                        <th key={h} className="px-4 sm:px-6 py-3 sm:py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
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
    </div>
  );
};

export default PropertyManagement;
