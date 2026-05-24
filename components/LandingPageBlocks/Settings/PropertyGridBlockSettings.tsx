import React, { useEffect, useMemo, useState } from 'react';
import {
  PropertyGridBlockConfig,
  LandingPage,
  PropertySelectionMode,
} from '../../../types/landingPage';
import { Property } from '../../../types';
import { propertyService } from '../../../services/properties';
import { Check, Loader2, Search, X } from 'lucide-react';

interface PropertyGridBlockSettingsProps {
  blockId: string;
  config: PropertyGridBlockConfig;
  onUpdate: (config: PropertyGridBlockConfig) => void;
  page: LandingPage;
  onUpdatePage: (page: LandingPage) => void;
}

const PropertyGridBlockSettings: React.FC<PropertyGridBlockSettingsProps> = ({
  blockId,
  config,
  onUpdate,
  page,
  onUpdatePage,
}) => {
  const [showPropertySelector, setShowPropertySelector] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    config.propertyIds || page.propertySelection?.propertyIds || []
  );
  const [search, setSearch] = useState('');
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIds(config.propertyIds || page.propertySelection?.propertyIds || []);
  }, [config.propertyIds, page.propertySelection?.propertyIds]);

  useEffect(() => {
    if (!showPropertySelector) return;

    let mounted = true;

    const loadProperties = async () => {
      try {
        setLoadingProperties(true);
        setLoadError(null);
        const data = await propertyService.list(1, 200);
        if (mounted) setProperties(data);
      } catch (error) {
        if (mounted) {
          setLoadError((error as Error).message || 'Erro ao carregar imoveis');
        }
      } finally {
        if (mounted) setLoadingProperties(false);
      }
    };

    loadProperties();

    return () => {
      mounted = false;
    };
  }, [showPropertySelector]);

  const filteredProperties = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return properties;

    return properties.filter((property) => {
      const location = property.location || ({} as any);
      return [
        property.title,
        property.type,
        property.status,
        location.city,
        location.state,
        location.neighborhood,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [properties, search]);

  const selectedCount =
    config.propertyIds?.length || page.propertySelection?.propertyIds?.length || 0;

  const updateField = (field: keyof PropertyGridBlockConfig, value: any) => {
    const nextConfig = { ...config, [field]: value };
    onUpdate(nextConfig);

    if (field === 'sortBy' || field === 'maxItems') {
      updatePageWithConfig(nextConfig, {
        ...(page.propertySelection || {}),
        mode: page.propertySelection?.mode || PropertySelectionMode.ALL,
        sortBy: nextConfig.sortBy,
        limit: nextConfig.maxItems,
      });
    }
  };

  const toggleProperty = (propertyId: string) => {
    setSelectedIds((current) =>
      current.includes(propertyId)
        ? current.filter((id) => id !== propertyId)
        : [...current, propertyId]
    );
  };

  const applySelection = () => {
    const selectedProperties = properties.filter((property) =>
      selectedIds.includes(property.id)
    );

    const nextConfig = {
      ...config,
      propertyIds: selectedIds,
      properties: selectedProperties,
    };

    const nextPropertySelection = {
      ...(page.propertySelection || {}),
      mode: PropertySelectionMode.MANUAL,
      propertyIds: selectedIds,
      sortBy: config.sortBy,
      limit: config.maxItems,
    };

    onUpdate(nextConfig);
    updatePageWithConfig(nextConfig, nextPropertySelection);

    setShowPropertySelector(false);
  };

  const updatePageWithConfig = (
    nextConfig: PropertyGridBlockConfig,
    propertySelection = page.propertySelection
  ) => {
    onUpdatePage({
      ...page,
      propertySelection,
      blocks: page.blocks.map((block) =>
        block.id === blockId ? { ...block, config: nextConfig } : block
      ),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Numero de Colunas
        </label>
        <select
          value={config.columns}
          onChange={(e) => updateField('columns', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value={1}>1 Coluna</option>
          <option value={2}>2 Colunas</option>
          <option value={3}>3 Colunas</option>
          <option value={4}>4 Colunas</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Espacamento (px)
        </label>
        <input
          type="number"
          value={config.gap}
          onChange={(e) => updateField('gap', parseInt(e.target.value))}
          min="0"
          max="100"
          step="4"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Maximo de Itens
        </label>
        <input
          type="number"
          value={config.maxItems}
          onChange={(e) => updateField('maxItems', parseInt(e.target.value))}
          min="1"
          max="50"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ordenar Por
        </label>
        <select
          value={config.sortBy}
          onChange={(e) => updateField('sortBy', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="price">Preco</option>
          <option value="date">Data</option>
          <option value="area">Area</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Estilo do Card
        </label>
        <select
          value={config.cardStyle}
          onChange={(e) => updateField('cardStyle', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="modern">Moderno</option>
          <option value="classic">Classico</option>
          <option value="minimal">Minimalista</option>
        </select>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="showFilters"
          checked={config.showFilters}
          onChange={(e) => updateField('showFilters', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label
          htmlFor="showFilters"
          className="ml-2 block text-sm text-gray-700"
        >
          Mostrar Filtros
        </label>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={() => setShowPropertySelector(true)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Selecionar Imoveis
        </button>
        <p className="text-xs text-gray-500 mt-2 text-center">
          {selectedCount > 0
            ? `${selectedCount} imoveis selecionados`
            : page.propertySelection?.mode === PropertySelectionMode.FILTER
              ? 'Selecao por filtros'
              : 'Todos os imoveis'}
        </p>
      </div>

      {showPropertySelector && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[82vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Selecionar imoveis
                </h3>
                <p className="text-sm text-gray-500">
                  Escolha os imoveis cadastrados para aparecerem neste bloco.
                </p>
              </div>
              <button
                onClick={() => setShowPropertySelector(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nome, cidade, tipo ou status..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingProperties && (
                <div className="py-12 flex items-center justify-center text-gray-500">
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Carregando imoveis...
                </div>
              )}

              {!loadingProperties && loadError && (
                <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm">
                  {loadError}
                </div>
              )}

              {!loadingProperties && !loadError && filteredProperties.length === 0 && (
                <div className="py-12 text-center text-gray-500">
                  Nenhum imovel cadastrado encontrado.
                </div>
              )}

              {!loadingProperties && !loadError && filteredProperties.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredProperties.map((property) => {
                    const checked = selectedIds.includes(property.id);
                    const location = property.location || ({} as any);
                    const image = property.images?.[0];

                    return (
                      <button
                        key={property.id}
                        type="button"
                        onClick={() => toggleProperty(property.id)}
                        className={`text-left border rounded-xl overflow-hidden transition-all ${
                          checked
                            ? 'border-blue-600 ring-2 ring-blue-100 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 bg-white'
                        }`}
                      >
                        <div className="flex gap-3 p-3">
                          <div className="w-24 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {image ? (
                              <img
                                src={image}
                                alt={property.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                                Sem foto
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold text-gray-900 line-clamp-2">
                                {property.title}
                              </h4>
                              <span
                                className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                  checked
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-gray-300 text-transparent'
                                }`}
                              >
                                <Check size={14} />
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {[location.city, location.state]
                                .filter(Boolean)
                                .join(', ') || 'Localizacao nao informada'}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs">
                              <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                {property.type || 'Imovel'}
                              </span>
                              <span className="font-semibold text-gray-900">
                                {formatCurrency(property.price)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedIds.length} imoveis selecionados
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Limpar
                </button>
                <button
                  onClick={applySelection}
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Aplicar selecao
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function formatCurrency(value?: number) {
  const amount = Number(value || 0);
  if (!amount) return 'Valor nao informado';

  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

export default PropertyGridBlockSettings;
