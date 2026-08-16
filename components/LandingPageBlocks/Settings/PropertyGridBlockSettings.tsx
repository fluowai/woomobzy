import React, { useState } from 'react';
import {
  PropertyGridBlockConfig,
  LandingPage,
  PropertySelectionMode,
} from '../../../types/landingPage';
import { PropertySelectorModal } from '../../LayoutEditor/PropertySelectorModal';

interface PropertyGridBlockSettingsProps {
  config: PropertyGridBlockConfig;
  onUpdate: (config: PropertyGridBlockConfig) => void;
  page: LandingPage;
  onUpdatePage: (page: LandingPage) => void;
}

const PropertyGridBlockSettings: React.FC<PropertyGridBlockSettingsProps> = ({
  config,
  onUpdate,
  page,
  onUpdatePage,
}) => {
  const [showPropertySelector, setShowPropertySelector] = useState(false);

  const updateField = (field: keyof PropertyGridBlockConfig, value: any) => {
    onUpdate({ ...config, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Número de Colunas
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
          Espaçamento (px)
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
          Máximo de Itens
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
          <option value="price">Preço</option>
          <option value="date">Data</option>
          <option value="area">Área</option>
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
          <option value="classic">Clássico</option>
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

      <div className="border-t border-gray-200 pt-4 space-y-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seleção Automática de Imóveis
        </label>

        <button
          onClick={() =>
            onUpdatePage({
              ...page,
              propertySelection: {
                ...page.propertySelection,
                mode: PropertySelectionMode.ALL,
                sortBy: 'date',
              },
            })
          }
          className="w-full px-4 py-2 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-lg transition-colors text-sm text-left flex items-center gap-2"
        >
          <span className="flex-1">Últimos Lançamentos</span>
          {page.propertySelection?.mode === 'all' &&
            page.propertySelection?.sortBy === 'date' && (
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            )}
        </button>

        <button
          onClick={() =>
            onUpdatePage({
              ...page,
              propertySelection: {
                ...page.propertySelection,
                mode: PropertySelectionMode.ALL,
                sortBy: 'price',
              },
            })
          }
          className="w-full px-4 py-2 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-lg transition-colors text-sm text-left flex items-center gap-2"
        >
          <span className="flex-1">Destaques (Maior Valor)</span>
          {page.propertySelection?.mode === 'all' &&
            page.propertySelection?.sortBy === 'price' && (
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            )}
        </button>

        <button
          onClick={() =>
            onUpdatePage({
              ...page,
              propertySelection: {
                ...page.propertySelection,
                mode: PropertySelectionMode.ALL,
                sortBy: 'area',
              },
            })
          }
          className="w-full px-4 py-2 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-lg transition-colors text-sm text-left flex items-center gap-2"
        >
          <span className="flex-1">Por Maior Área</span>
          {page.propertySelection?.mode === 'all' &&
            page.propertySelection?.sortBy === 'area' && (
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            )}
        </button>

        <div className="pt-4 mt-4 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleção Manual
          </label>
          <button
            onClick={() => setShowPropertySelector(true)}
            className="w-full px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            Selecionar Imóveis Manualmente
          </button>
        </div>
      </div>

      <PropertySelectorModal
        isOpen={showPropertySelector}
        onClose={() => setShowPropertySelector(false)}
        selectedIds={
          page.propertySelection?.mode === 'manual'
            ? page.propertySelection.propertyIds || []
            : []
        }
        onSave={(ids) => {
          onUpdatePage({
            ...page,
            propertySelection: {
              ...page.propertySelection,
              mode: PropertySelectionMode.MANUAL,
              propertyIds: ids,
            },
          });
        }}
      />
    </div>
  );
};

export default PropertyGridBlockSettings;
