import React, { useState } from 'react';
import { PropertyGridBlockConfig, LandingPage, PropertySelectionMode } from '../../../types/landingPage';
import { Property } from '../../../types';

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
  onUpdatePage
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
        <label htmlFor="showFilters" className="ml-2 block text-sm text-gray-700">
          Mostrar Filtros
        </label>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={() => setShowPropertySelector(true)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Selecionar Imóveis
        </button>
        <p className="text-xs text-gray-500 mt-2 text-center">
          {page.propertySelection.mode === 'manual' && page.propertySelection.propertyIds
            ? `${page.propertySelection.propertyIds.length} imóveis selecionados`
            : page.propertySelection.mode === 'filter'
            ? 'Seleção por filtros'
            : 'Todos os imóveis'}
        </p>
      </div>
    </div>
  );
};

export default PropertyGridBlockSettings;
