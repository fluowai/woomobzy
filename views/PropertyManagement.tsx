import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  Filter,
  Search,
  Edit3,
  Trash2,
  Eye,
  Grid,
  List,
  ChevronDown,
  Loader2,
  Circle,
  Clock,
  MapPin,
  Map,
  Check,
  DownloadCloud,
  RefreshCw,
  Brain,
  Megaphone,
  UserCheck,
  Globe,
  Share2,
  X,
} from 'lucide-react';
import { propertyService } from '../services/properties';
import { oruloService } from '../services/orulo';
import { portalService } from '../services/portals';
import { Property } from '../types';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { isRuralProperty, isUrbanProperty } from '../utils/propertyNiche';

const PropertyManagement: React.FC = () => {
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [oruloSyncing, setOruloSyncing] = useState(false);
  const [showOruloFilters, setShowOruloFilters] = useState(false);
  const [oruloFilters, setOruloFilters] = useState({
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
  });
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
      await propertyService.update(id, {
        status: 'Disponível' as any,
        published_at: new Date().toISOString(),
      } as any);
      toast.success('Imóvel publicado com sucesso!');
      const buildingId = (property?.features as any)?.orulo?.building_id;
      if ((property as any)?.source === 'orulo' && buildingId) {
        oruloService.updatePublicationLinks(buildingId, [
          { url: `${window.location.origin}/property/${id}`, active: true },
        ]).catch((error) => logger.warn('Falha ao atualizar link de publicacao Orulo', error));
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

      if (oruloFilters.state.trim()) filters.state = oruloFilters.state.trim().toUpperCase();
      if (oruloFilters.city.trim()) filters.city = oruloFilters.city.trim();
      if (areaList.length) filters.area = areaList;
      if (oruloFilters.minPrice) filters.min_price = Number(oruloFilters.minPrice);
      if (oruloFilters.maxPrice) filters.max_price = Number(oruloFilters.maxPrice);
      if (oruloFilters.bedrooms) filters.bedrooms = [oruloFilters.bedrooms];
      if (oruloFilters.parking) filters.parking = [oruloFilters.parking];
      if (oruloFilters.status) filters.status = [oruloFilters.status];
      if (oruloFilters.portfolio) filters.portfolio = [oruloFilters.portfolio];

      const result = await oruloService.sync({
        max_buildings: Math.min(Number(oruloFilters.maxBuildings || 25), 100),
        filters,
      });
      toast.success(`Órulo sincronizada: ${result.imported || 0} fichas para revisão.`);
      await loadProperties();
    } catch (error: any) {
      toast.error('Erro ao sincronizar Órulo: ' + error.message);
    } finally {
      setOruloSyncing(false);
    }
  };

  const [portalPublishing, setPortalPublishing] = useState<{ propertyId: string; portal: string } | null>(null);
  const [portalPublishResult, setPortalPublishResult] = useState<Record<string, any>>({});

  const handlePortalPublish = async (propertyId: string, portal: string) => {
    try {
      setPortalPublishing({ propertyId, portal });
      const result = await portalService.publish(portal, propertyId);
      setPortalPublishResult((prev) => ({
        ...prev,
        [`${propertyId}-${portal}`]: { status: 'published', url: result.url },
      }));
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
      setPortalPublishResult((prev) => ({
        ...prev,
        [`${propertyId}-${portal}`]: { status: 'unpublished' },
      }));
      toast.success(`Removido do ${portal === 'vivareal' ? 'VivaReal' : 'Zap Imóveis'}.`);
      loadProperties();
    } catch (error: any) {
      toast.error(`Erro ao remover: ${error.message}`);
    }
  };

  const getPortalPublishes = (property: Property) => {
    return (property as any).portal_publishes || {};
  };

  const filteredProperties = properties.filter((p) => {
    const matchesNiche = isRural ? isRuralProperty(p) : isUrbanProperty(p);
    if (!matchesNiche) return false;

    if (activeTab === 'pending') return p.status === 'Pendente';
    return p.status !== 'Pendente';
  });

  const getAcp = (property: Property) => (property.features as any)?.acp;

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

    return [
      `${property.features?.areaHectares || 0} ha`,
      property.features?.tipoSolo || 'Solo N/A',
    ];
  };

  const updateOruloFilter = (key: keyof typeof oruloFilters, value: string) => {
    setOruloFilters((prev) => ({ ...prev, [key]: value }));
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
          <p className="text-sm text-slate-500">
            Gerencie todos os seus anúncios públicos e privados.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setViewType('grid')}
              className={`p-2 rounded-lg transition-all ${viewType === 'grid' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewType('list')}
              className={`p-2 rounded-lg transition-all ${viewType === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List size={18} />
            </button>
          </div>
          <button
            onClick={() => navigate('new')}
            className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all font-bold text-sm shadow-lg shadow-indigo-500/20"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Cadastrar Imóvel</span>
            <span className="sm:hidden">Novo</span>
          </button>
          {!isRural && (
            <button
              onClick={() => setShowOruloFilters((value) => !value)}
              className="bg-white text-slate-700 border border-slate-200 px-3 py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-all font-bold text-sm shadow-sm"
              title="Filtros Orulo"
            >
              <Filter size={18} />
              <span className="hidden sm:inline">Filtros Orulo</span>
            </button>
          )}
          {!isRural && (
            <button
              onClick={handleOruloSync}
              disabled={oruloSyncing}
              className="bg-slate-900 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-800 transition-all font-bold text-sm shadow-lg disabled:opacity-60"
              title="Importar catálogo urbano da Órulo para revisão"
            >
              {oruloSyncing ? <RefreshCw size={18} className="animate-spin" /> : <DownloadCloud size={18} />}
              <span className="hidden sm:inline">Importar Órulo</span>
              <span className="sm:hidden">Órulo</span>
            </button>
          )}
        </div>
      </div>

      {!isRural && showOruloFilters && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800">
                Importacao Orulo por regiao
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                UF e cidade filtram o catalogo antes de trazer as fichas para revisao.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setOruloFilters({
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
                })
              }
              className="text-xs font-bold text-slate-500 hover:text-slate-900"
            >
              Limpar
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            <input
              value={oruloFilters.state}
              onChange={(e) => updateOruloFilter('state', e.target.value)}
              placeholder="UF ex: SP"
              maxLength={2}
              className="input-field"
            />
            <input
              value={oruloFilters.city}
              onChange={(e) => updateOruloFilter('city', e.target.value)}
              placeholder="Cidade"
              className="input-field"
            />
            <input
              value={oruloFilters.areas}
              onChange={(e) => updateOruloFilter('areas', e.target.value)}
              placeholder="Bairros separados por virgula"
              className="input-field sm:col-span-2 xl:col-span-1"
            />
            <input
              type="number"
              value={oruloFilters.minPrice}
              onChange={(e) => updateOruloFilter('minPrice', e.target.value)}
              placeholder="Valor minimo"
              className="input-field"
            />
            <input
              type="number"
              value={oruloFilters.maxPrice}
              onChange={(e) => updateOruloFilter('maxPrice', e.target.value)}
              placeholder="Valor maximo"
              className="input-field"
            />
            <select
              value={oruloFilters.bedrooms}
              onChange={(e) => updateOruloFilter('bedrooms', e.target.value)}
              className="input-field"
            >
              <option value="">Dormitorios</option>
              <option value="1">1 dorm.</option>
              <option value="2">2 dorm.</option>
              <option value="3">3 dorm.</option>
              <option value="4+">4+ dorm.</option>
            </select>
            <select
              value={oruloFilters.parking}
              onChange={(e) => updateOruloFilter('parking', e.target.value)}
              className="input-field"
            >
              <option value="">Vagas</option>
              <option value="1">1 vaga</option>
              <option value="2">2 vagas</option>
              <option value="3+">3+ vagas</option>
            </select>
            <select
              value={oruloFilters.status}
              onChange={(e) => updateOruloFilter('status', e.target.value)}
              className="input-field"
            >
              <option value="">Status obra</option>
              <option value="under_construction">Em construcao</option>
              <option value="ready">Pronto novo</option>
              <option value="used">Usado</option>
            </select>
            <select
              value={oruloFilters.portfolio}
              onChange={(e) => updateOruloFilter('portfolio', e.target.value)}
              className="input-field"
            >
              <option value="">Carteira</option>
              <option value="new_development">Lancamento</option>
              <option value="exchange">Dacao</option>
              <option value="exclusivity">Exclusividade</option>
            </select>
            <input
              type="number"
              min={1}
              max={100}
              value={oruloFilters.maxBuildings}
              onChange={(e) => updateOruloFilter('maxBuildings', e.target.value)}
              placeholder="Limite"
              className="input-field"
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border-subtle items-center justify-between">
        <div className="flex">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-8 py-4 text-sm font-bold border-b-2 transition-all tracking-wide ${activeTab === 'all' ? 'border-primary text-primary' : 'border-transparent text-text-tertiary hover:text-text-primary'}`}
          >
            Meus Imóveis
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-8 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-3 tracking-wide ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-text-tertiary hover:text-text-primary'}`}
          >
            Solicitações Externas
            {properties.filter((p) => p.status === 'Pendente').length > 0 && (
              <span className="bg-accent text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-accent/20">
                {properties.filter((p) => p.status === 'Pendente').length}
              </span>
            )}
          </button>
        </div>
        
        {properties.length > 0 && filteredProperties.length === 0 && (
          <div className="px-6 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium mr-4 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Atenção: Você tem {properties.length} imóveis cadastrados, mas todos são do nicho {isRural ? 'Urbano' : 'Rural'}.
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="card p-4 flex flex-col lg:flex-row gap-4 items-center bg-bg-card/50 backdrop-blur-md">
        <div className="flex-1 relative w-full group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-primary transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar por título, bairro ou ID..."
            className="input-field pl-12"
          />
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button className="btn btn-secondary flex-1 lg:flex-none h-11 px-4 text-xs uppercase tracking-widest font-bold">
            Tipo <ChevronDown size={14} />
          </button>
          <button className="btn btn-secondary flex-1 lg:flex-none h-11 px-4 text-xs uppercase tracking-widest font-bold">
            Status <ChevronDown size={14} />
          </button>
          <button className="btn btn-secondary flex-1 lg:flex-none h-11 px-4 text-xs uppercase tracking-widest font-bold">
            <Filter size={14} />
            Filtros
          </button>
        </div>
      </div>

       {filteredProperties.length === 0 ? (
        <div className="text-center py-16 sm:py-24 border-2 border-dashed border-slate-200 rounded-2xl">
          <h3 className="text-lg sm:text-xl font-bold text-slate-400 mb-2">
            Nenhum imóvel encontrado
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto px-4">
            {activeTab === 'pending'
              ? 'Não há solicitações pendentes no momento.'
              : 'Comece cadastrando seu primeiro imóvel.'}
          </p>
        </div>
      ) : (
        <>
          {/* Grid View */}
          {viewType === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {filteredProperties.map((property) => (
                <div
                  key={property.id}
                  className="card card-hover overflow-hidden group animate-slide-up"
                >
                  {(() => {
                    const acp = getAcp(property);

                    return (
                      <>
                  <div className="relative h-56 -mx-6 -mt-6 mb-6 overflow-hidden">
                    <img
                      src={
                        property.images?.[0] ||
                        'https://images.unsplash.com/photo-1500382017468-9049fee74a62?auto=format&fit=crop&q=80&w=800'
                      }
                      alt={property.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div
                      className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg ${
                        property.status === 'Disponível'
                          ? 'bg-emerald-500 text-white'
                          : property.status === 'Pendente'
                            ? 'bg-accent text-black'
                            : 'bg-text-tertiary text-white'
                      }`}
                    >
                      {property.status}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="space-y-4">
                      <div>
                        <span className="badge badge-primary mb-2">
                          {property.type}
                        </span>
                        {(property as any).source === 'orulo' && (
                          <span className="badge mb-2 ml-2 bg-slate-900 text-white">
                            Órulo
                          </span>
                        )}
                        <h3 className="text-lg font-bold text-text-primary truncate mb-1">
                          {property.title}
                        </h3>
                        <p className="text-sm text-text-tertiary truncate flex items-center gap-1">
                          <MapPin size={12} /> {property.location?.neighborhood || 'Bairro não informado'},{' '}
                          {property.location?.city || 'Cidade'}
                        </p>
                      </div>
                      {acp && (
                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-indigo-700">
                              <Brain size={16} />
                              <span className="text-xs font-bold uppercase tracking-widest">
                                ACP Comercial
                              </span>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-700 shadow-sm">
                              ICP {acp.icp?.fit_score || acp.score || 0}%
                            </span>
                          </div>
                          <div className="space-y-2 text-xs text-slate-600">
                            <p className="flex items-start gap-2">
                              <UserCheck size={14} className="mt-0.5 shrink-0 text-indigo-500" />
                              <span>
                                <strong className="text-slate-800">Persona:</strong>{' '}
                                {acp.persona?.name || acp.icp?.name || 'Comprador qualificado'}
                              </span>
                            </p>
                            <p>
                              <strong className="text-slate-800">Oferta:</strong>{' '}
                              {acp.offer?.positioning || acp.diagnosis?.best_angle}
                            </p>
                            {acp.meta_ads?.campaigns?.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {acp.meta_ads.campaigns.slice(0, 2).map((campaign: any, index: number) => (
                                  <span
                                    key={`${campaign.name || 'meta'}-${index}`}
                                    className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600"
                                  >
                                    <Megaphone size={11} />
                                    {campaign.angle || campaign.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold text-primary">
                          {(property.price || 0).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </span>
                        <div className="flex flex-wrap items-center justify-end gap-2 text-text-tertiary text-xs font-bold uppercase tracking-wider">
                          {getPropertySummary(property).map((item, index) => (
                            <React.Fragment key={`${property.id}-summary-${item}`}>
                              {index > 0 && <span className="w-1 h-1 bg-text-tertiary rounded-full" />}
                              <span>{item}</span>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 border-t border-border-subtle pt-6 mt-2">
                        {property.status === 'Pendente' ? (
                          <>
                            <button
                              onClick={() => navigate(`${property.id}`)}
                              className="btn-primary flex-1 h-10 text-xs uppercase tracking-widest"
                            >
                              <Edit3 size={14} /> Revisar Copy
                            </button>
                            <button
                              onClick={() => handleApprove(property.id)}
                              className="btn-secondary flex-1 h-10 text-xs uppercase tracking-widest"
                            >
                              <Check size={14} /> Publicar
                            </button>
                            <button
                              onClick={() => handleDelete(property.id!)}
                              className="p-2 text-text-tertiary hover:text-red-500 transition-colors bg-bg-hover rounded-lg"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => navigate(`${property.id}`)}
                              className="btn btn-secondary flex-1 h-10 text-xs uppercase tracking-widest font-bold"
                            >
                              <Edit3 size={14} /> Editar
                            </button>
                            <button
                              onClick={() =>
                                navigate(`/property/${property.id}`)
                              }
                              className="p-2 text-text-tertiary hover:text-primary transition-colors bg-bg-hover rounded-lg"
                              title="Ver página pública"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(property.id!)}
                              className="p-2 text-text-tertiary hover:text-red-500 transition-colors bg-bg-hover rounded-lg"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                      {property.status !== 'Pendente' && !isRural && (
                        <div className="flex items-center gap-2 pt-2 border-t border-border-subtle mt-4">
                          <Globe size={12} className="text-text-tertiary shrink-0" />
                          {['vivareal', 'zap'].map((portal) => {
                            const publishes = getPortalPublishes(property);
                            const entry = publishes[portal];
                            const isPublished = entry?.status === 'published';
                            const isLoading = portalPublishing?.propertyId === property.id && portalPublishing?.portal === portal;
                            return (
                              <button
                                key={portal}
                                onClick={() =>
                                  isPublished
                                    ? handlePortalUnpublish(property.id!, portal)
                                    : handlePortalPublish(property.id!, portal)
                                }
                                disabled={isLoading}
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg transition-all ${
                                  isPublished
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                } disabled:opacity-50`}
                              >
                                {isLoading ? '...' : isPublished ? `✔ ${portal === 'vivareal' ? 'VivaReal' : 'Zap'}` : portal === 'vivareal' ? 'VivaReal' : 'Zap'}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          ) : (
            /* List View (Simplified) */
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="divide-y divide-slate-100 md:hidden">
                {filteredProperties.map((property) => (
                  <article key={property.id} className="p-4">
                    <div className="flex gap-3">
                      <img
                        src={
                          property.images?.[0] ||
                          'https://via.placeholder.com/400x300?text=Sem+Foto'
                        }
                        className="h-20 w-24 rounded-xl object-cover shrink-0"
                        alt={property.title}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                            {property.title}
                          </h3>
                          <span
                            className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${
                              property.status === 'DisponÃ­vel'
                                ? 'bg-emerald-100 text-emerald-700'
                                : property.status === 'Pendente'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {property.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {property.location?.neighborhood || 'S/ Bairro'}, {property.location?.city || 'S/ Cidade'}
                        </p>
                        <p className="mt-2 text-base font-bold text-primary">
                          {(property.price || 0).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <button
                        onClick={() => navigate(`${property.id}`)}
                        className="h-10 rounded-xl bg-slate-50 text-xs font-bold text-slate-600 flex items-center justify-center gap-1"
                      >
                        <Edit3 size={14} /> Editar
                      </button>
                      <button
                        onClick={() => navigate(`/property/${property.id}`)}
                        className="h-10 rounded-xl bg-slate-50 text-xs font-bold text-slate-600 flex items-center justify-center gap-1"
                      >
                        <Eye size={14} /> Ver
                      </button>
                      <button
                        onClick={() => handleDelete(property.id!)}
                        className="h-10 rounded-xl bg-red-50 text-xs font-bold text-red-600 flex items-center justify-center gap-1"
                      >
                        <Trash2 size={14} /> Excluir
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto hidden md:block">
              <table className="w-full text-left min-w-[640px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Imóvel
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Localização
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProperties.map((property) => (
                    <tr
                      key={property.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              property.images?.[0] ||
                              'https://via.placeholder.com/400x300?text=Sem+Foto'
                            }
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {property.title}
                            </p>
                            <p className="text-xs text-slate-400">
                              ID: {property.id?.slice(0, 8)} • {(property as any).source === 'orulo' ? 'Órulo' : getPropertySummary(property).join(' • ')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-slate-500 whitespace-nowrap">
                        {property.location?.neighborhood || 'S/ Bairro'},{' '}
                        {property.location?.city || 'S/ Cidade'}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm font-bold text-slate-900 whitespace-nowrap">
                        {(property.price || 0).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${
                            property.status === 'Disponível'
                              ? 'bg-emerald-100 text-emerald-700'
                              : property.status === 'Pendente'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {property.status}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <button
                            onClick={() =>
                              navigate(`${property.id}`)
                            }
                            className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Editar"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(property.id!)}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                          {property.status !== 'Pendente' && !isRural && (
                            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-200">
                              {['vivareal', 'zap'].map((portal) => {
                                const publishes = getPortalPublishes(property);
                                const entry = publishes[portal];
                                const isPublished = entry?.status === 'published';
                                const isLoading = portalPublishing?.propertyId === property.id && portalPublishing?.portal === portal;
                                return (
                                  <button
                                    key={portal}
                                    onClick={() =>
                                      isPublished
                                        ? handlePortalUnpublish(property.id!, portal)
                                        : handlePortalPublish(property.id!, portal)
                                    }
                                    disabled={isLoading}
                                    className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded transition-all ${
                                      isPublished
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'text-slate-400 hover:text-slate-600'
                                    } disabled:opacity-50`}
                                    title={`${isPublished ? 'Remover do' : 'Publicar no'} ${portal === 'vivareal' ? 'VivaReal' : 'Zap'}`}
                                  >
                                    {isLoading ? '...' : isPublished ? '✔' : <Globe size={12} />}
                                    <span className="ml-0.5">{portal === 'vivareal' ? 'VR' : 'Zap'}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
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
