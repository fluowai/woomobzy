import React, { useState, useEffect } from 'react';
import { Site, DevelopmentSelectionConfig } from '../../types/site';
import {
  PropertySelectionConfig,
  PropertySelectionMode,
  PropertyFilters,
} from '../../types/landingPage';
import { PropertySelectorModal } from '../LayoutEditor/PropertySelectorModal';
import {
  Search,
  Check,
  X,
  Building2,
  Home,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../services/supabase';

interface PropertySelectionPanelProps {
  site: Site;
  onUpdate: (updates: Partial<Site>) => void;
  saving: boolean;
}

type TabType = 'properties' | 'developments';

const PropertySelectionPanel: React.FC<PropertySelectionPanelProps> = ({
  site,
  onUpdate,
  saving,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('properties');
  const [showManualSelector, setShowManualSelector] = useState(false);
  const [propertyCount, setPropertyCount] = useState<number | null>(null);
  const [developmentCount, setDevelopmentCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  const propConfig = site.propertySelection || {
    mode: PropertySelectionMode.ALL,
    propertyIds: [],
    filters: {},
    sortBy: 'price' as const,
    sortOrder: 'desc' as const,
    limit: 20,
  };

  const devConfig = site.developmentSelection || {
    mode: 'all' as const,
    developmentIds: [],
    filters: {},
    sortBy: 'date' as const,
    sortOrder: 'desc' as const,
    limit: 20,
  };

  useEffect(() => {
    loadCounts();
  }, [propConfig, devConfig]);

  const loadCounts = async () => {
    setLoadingCount(true);
    try {
      if (activeTab === 'properties') {
        const q = supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', site.organizationId)
          .eq('show_on_site', true);

        if (propConfig.mode === 'manual' && propConfig.propertyIds?.length) {
          q.in('id', propConfig.propertyIds);
        } else if (propConfig.mode === 'filter' && propConfig.filters) {
          const f = propConfig.filters;
          if (f.type?.length) q.in('property_type', f.type);
          if (f.status?.length) q.in('status', f.status);
          if (f.city?.length) q.in('city', f.city);
          if (f.state?.length) q.in('state', f.state);
          if (f.minPrice !== undefined) q.gte('price', f.minPrice);
          if (f.maxPrice !== undefined) q.lte('price', f.maxPrice);
        } else {
          q.eq('status', 'Disponível');
        }

        const { count } = await q;
        setPropertyCount(count);
      } else {
        const q = supabase
          .from('developments')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', site.organizationId)
          .eq('show_on_site', true);

        if (devConfig.mode === 'manual' && devConfig.developmentIds?.length) {
          q.in('id', devConfig.developmentIds);
        } else if (devConfig.mode === 'filter' && devConfig.filters) {
          const f = devConfig.filters;
          if (f.status?.length) q.in('status', f.status);
          if (f.city?.length) q.in('city', f.city);
          if (f.state?.length) q.in('state', f.state);
        }

        const { count } = await q;
        setDevelopmentCount(count);
      }
    } catch {
      // Silently fail count
    } finally {
      setLoadingCount(false);
    }
  };

  const updatePropConfig = (updates: Partial<PropertySelectionConfig>) => {
    onUpdate({
      propertySelection: { ...propConfig, ...updates },
    });
  };

  const updateDevConfig = (updates: Partial<DevelopmentSelectionConfig>) => {
    onUpdate({
      developmentSelection: { ...devConfig, ...updates },
    });
  };

  return (
    <div className="space-y-6">
      {/* Tab selector */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1 border border-gray-700">
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
            activeTab === 'properties'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          <Home size={16} /> Imóveis
        </button>
        <button
          onClick={() => setActiveTab('developments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
            activeTab === 'developments'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          <Building2 size={16} /> Lançamentos
        </button>
      </div>

      {activeTab === 'properties' ? (
        <PropertyTabContent
          config={propConfig}
          onChange={updatePropConfig}
          count={propertyCount}
          loadingCount={loadingCount}
          showManualSelector={showManualSelector}
          setShowManualSelector={setShowManualSelector}
          site={site}
        />
      ) : (
        <DevelopmentTabContent
          config={devConfig}
          onChange={updateDevConfig}
          count={developmentCount}
          loadingCount={loadingCount}
          site={site}
        />
      )}
    </div>
  );
};

// ============================================
// PROPERTY TAB
// ============================================

interface PropertyTabContentProps {
  config: PropertySelectionConfig;
  onChange: (updates: Partial<PropertySelectionConfig>) => void;
  count: number | null;
  loadingCount: boolean;
  showManualSelector: boolean;
  setShowManualSelector: (v: boolean) => void;
  site: Site;
}

const PropertyTabContent: React.FC<PropertyTabContentProps> = ({
  config,
  onChange,
  count,
  loadingCount,
  showManualSelector,
  setShowManualSelector,
  site,
}) => {
  const modeButtons = [
    { mode: PropertySelectionMode.ALL, label: 'Todos Disponíveis', desc: 'Exibe todos os imóveis com status Disponível' },
    { mode: PropertySelectionMode.FILTER, label: 'Por Filtro', desc: 'Filtrar por tipo, cidade, preço...' },
    { mode: PropertySelectionMode.MANUAL, label: 'Seleção Manual', desc: 'Escolher imóveis um por um' },
  ];

  return (
    <div className="space-y-6">
      {/* Mode selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Modo de Seleção
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {modeButtons.map((btn) => (
            <button
              key={btn.mode}
              onClick={() => onChange({ mode: btn.mode })}
              className={`p-4 rounded-xl border text-left transition-all ${
                config.mode === btn.mode
                  ? 'bg-indigo-600/10 border-indigo-500 text-indigo-300'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  config.mode === btn.mode ? 'border-indigo-400' : 'border-gray-600'
                }`}>
                  {config.mode === btn.mode && <div className="w-2 h-2 rounded-full bg-indigo-400" />}
                </div>
                <span className="font-medium text-sm">{btn.label}</span>
              </div>
              <p className="text-xs text-gray-500 ml-6">{btn.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Filter mode */}
      {config.mode === PropertySelectionMode.FILTER && (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-5 space-y-4">
          <h4 className="text-sm font-semibold text-gray-300">Filtros</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tipo</label>
              <input
                type="text"
                placeholder="Ex: Casa, Apartamento"
                value={(config.filters?.type || []).join(', ')}
                onChange={(e) =>
                  onChange({
                    filters: {
                      ...config.filters,
                      type: e.target.value ? e.target.value.split(',').map((s) => s.trim()) : undefined,
                    } as PropertyFilters,
                  })
                }
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Finalidade</label>
              <input
                type="text"
                placeholder="Ex: Venda, Aluguel"
                value={(config.filters?.purpose || []).join(', ')}
                onChange={(e) =>
                  onChange({
                    filters: {
                      ...config.filters,
                      purpose: e.target.value ? e.target.value.split(',').map((s) => s.trim()) : undefined,
                    } as PropertyFilters,
                  })
                }
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Cidade</label>
              <input
                type="text"
                placeholder="Ex: São Paulo"
                value={(config.filters?.city || []).join(', ')}
                onChange={(e) =>
                  onChange({
                    filters: {
                      ...config.filters,
                      city: e.target.value ? e.target.value.split(',').map((s) => s.trim()) : undefined,
                    } as PropertyFilters,
                  })
                }
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Estado</label>
              <input
                type="text"
                placeholder="Ex: SP"
                value={(config.filters?.state || []).join(', ')}
                onChange={(e) =>
                  onChange({
                    filters: {
                      ...config.filters,
                      state: e.target.value ? e.target.value.split(',').map((s) => s.trim()) : undefined,
                    } as PropertyFilters,
                  })
                }
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Preço Mínimo (R$)</label>
              <input
                type="number"
                placeholder="0"
                value={config.filters?.minPrice ?? ''}
                onChange={(e) =>
                  onChange({
                    filters: {
                      ...config.filters,
                      minPrice: e.target.value ? Number(e.target.value) : undefined,
                    } as PropertyFilters,
                  })
                }
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Preço Máximo (R$)</label>
              <input
                type="number"
                placeholder="0"
                value={config.filters?.maxPrice ?? ''}
                onChange={(e) =>
                  onChange({
                    filters: {
                      ...config.filters,
                      maxPrice: e.target.value ? Number(e.target.value) : undefined,
                    } as PropertyFilters,
                  })
                }
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Manual mode */}
      {config.mode === PropertySelectionMode.MANUAL && (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-300">
              Imóveis Selecionados
              {config.propertyIds && config.propertyIds.length > 0 && (
                <span className="ml-2 text-indigo-400">
                  ({config.propertyIds.length})
                </span>
              )}
            </h4>
            <button
              onClick={() => setShowManualSelector(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Selecionar Imóveis
            </button>
          </div>
          {(!config.propertyIds || config.propertyIds.length === 0) && (
            <p className="text-sm text-gray-500">
              Nenhum imóvel selecionado. Clique em "Selecionar Imóveis" para escolher.
            </p>
          )}
        </div>
      )}

      {/* Sort & Limit */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Ordenar por
          </label>
          <select
            value={config.sortBy || 'price'}
            onChange={(e) => onChange({ sortBy: e.target.value as any })}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-indigo-500 outline-none"
          >
            <option value="price">Preço</option>
            <option value="date">Data</option>
            <option value="area">Área</option>
            <option value="random">Aleatório</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Limite de Imóveis
          </label>
          <input
            type="number"
            value={config.limit || 20}
            onChange={(e) => onChange({ limit: parseInt(e.target.value) || 20 })}
            min={1}
            max={100}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* Preview count */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex items-center justify-between">
        <span className="text-sm text-gray-400">
          {config.mode === PropertySelectionMode.MANUAL
            ? 'Imóveis selecionados manualmente'
            : 'Imóveis que serão exibidos no site'}
        </span>
        <span className="text-lg font-bold text-indigo-400">
          {loadingCount ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            `${count ?? '...'} imóvel(is)`
          )}
        </span>
      </div>

      <PropertySelectorModal
        isOpen={showManualSelector}
        onClose={() => setShowManualSelector(false)}
        selectedIds={config.propertyIds || []}
        onSave={(ids) => {
          onChange({ propertyIds: ids });
          setShowManualSelector(false);
        }}
      />
    </div>
  );
};

// ============================================
// DEVELOPMENT TAB
// ============================================

interface DevelopmentTabContentProps {
  config: DevelopmentSelectionConfig;
  onChange: (updates: Partial<DevelopmentSelectionConfig>) => void;
  count: number | null;
  loadingCount: boolean;
  site: Site;
}

const DevelopmentTabContent: React.FC<DevelopmentTabContentProps> = ({
  config,
  onChange,
  count,
  loadingCount,
}) => {
  const modeButtons = [
    { mode: 'all' as const, label: 'Todos Ativos', desc: 'Exibe todos os lançamentos ativos' },
    { mode: 'filter' as const, label: 'Por Filtro', desc: 'Filtrar por cidade, status...' },
    { mode: 'manual' as const, label: 'Seleção Manual', desc: 'Escolher lançamentos um por um' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Modo de Seleção
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {modeButtons.map((btn) => (
            <button
              key={btn.mode}
              onClick={() => onChange({ mode: btn.mode })}
              className={`p-4 rounded-xl border text-left transition-all ${
                config.mode === btn.mode
                  ? 'bg-indigo-600/10 border-indigo-500 text-indigo-300'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  config.mode === btn.mode ? 'border-indigo-400' : 'border-gray-600'
                }`}>
                  {config.mode === btn.mode && <div className="w-2 h-2 rounded-full bg-indigo-400" />}
                </div>
                <span className="font-medium text-sm">{btn.label}</span>
              </div>
              <p className="text-xs text-gray-500 ml-6">{btn.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {config.mode === 'filter' && (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-5 space-y-4">
          <h4 className="text-sm font-semibold text-gray-300">Filtros</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Status</label>
              <input
                type="text"
                placeholder="Ex: Em Vendas, Obras"
                value={(config.filters?.status || []).join(', ')}
                onChange={(e) =>
                  onChange({
                    filters: {
                      ...config.filters,
                      status: e.target.value ? e.target.value.split(',').map((s) => s.trim()) : undefined,
                    },
                  })
                }
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Cidade</label>
              <input
                type="text"
                placeholder="Ex: São Paulo"
                value={(config.filters?.city || []).join(', ')}
                onChange={(e) =>
                  onChange({
                    filters: {
                      ...config.filters,
                      city: e.target.value ? e.target.value.split(',').map((s) => s.trim()) : undefined,
                    },
                  })
                }
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {config.mode === 'manual' && (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-5">
          <h4 className="text-sm font-semibold text-gray-300">
            Lançamentos Selecionados
            {config.developmentIds && config.developmentIds.length > 0 && (
              <span className="ml-2 text-indigo-400">
                ({config.developmentIds.length})
              </span>
            )}
          </h4>
          {(!config.developmentIds || config.developmentIds.length === 0) && (
            <p className="text-sm text-gray-500 mt-2">
              Nenhum lançamento selecionado. Use o modo "Todos Ativos" ou "Por Filtro" para exibir lançamentos.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Ordenar por
          </label>
          <select
            value={config.sortBy || 'date'}
            onChange={(e) => onChange({ sortBy: e.target.value as any })}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-indigo-500 outline-none"
          >
            <option value="date">Data</option>
            <option value="name">Nome</option>
            <option value="units">Unidades</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Limite
          </label>
          <input
            type="number"
            value={config.limit || 20}
            onChange={(e) => onChange({ limit: parseInt(e.target.value) || 20 })}
            min={1}
            max={100}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-indigo-500 outline-none"
          />
        </div>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex items-center justify-between">
        <span className="text-sm text-gray-400">Lançamentos que serão exibidos</span>
        <span className="text-lg font-bold text-indigo-400">
          {loadingCount ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            `${count ?? '...'} lançamento(s)`
          )}
        </span>
      </div>
    </div>
  );
};

export default PropertySelectionPanel;
