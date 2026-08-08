import React from 'react';

interface PropertySearchBlockSettingsProps {
  config: any;
  onUpdate: (config: any) => void;
}

const PropertySearchBlockSettings: React.FC<
  PropertySearchBlockSettingsProps
> = ({ config, onUpdate }) => {
  const updateField = (field: string, value: any) => {
    onUpdate({ ...config, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Colunas nos Resultados
        </label>
        <select
          value={config.columns || 3}
          onChange={(e) => updateField('columns', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value={2}>2 Colunas</option>
          <option value={3}>3 Colunas</option>
          <option value={4}>4 Colunas</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Resultados por Página
        </label>
        <input
          type="number"
          value={config.resultsPerPage || 12}
          onChange={(e) =>
            updateField('resultsPerPage', parseInt(e.target.value))
          }
          min="1"
          max="50"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );
};

export default PropertySearchBlockSettings;
