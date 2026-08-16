import React from 'react';
import { FeaturesBlockConfig, Feature } from '../../../types/landingPage';
import { Plus, Trash2 } from 'lucide-react';

interface FeaturesBlockSettingsProps {
  config: FeaturesBlockConfig;
  onUpdate: (config: FeaturesBlockConfig) => void;
}

const FeaturesBlockSettings: React.FC<FeaturesBlockSettingsProps> = ({
  config,
  onUpdate,
}) => {
  const handleChange = (key: keyof FeaturesBlockConfig, value: any) => {
    onUpdate({ ...config, [key]: value });
  };

  const handleAddFeature = () => {
    const newFeatures = [
      ...(config.features || []),
      {
        title: 'Nova Funcionalidade',
        description: 'Descrição da funcionalidade',
        icon: '✨',
      },
    ];
    handleChange('features', newFeatures);
  };

  const handleUpdateFeature = (
    index: number,
    key: keyof Feature,
    value: string
  ) => {
    const newFeatures = [...(config.features || [])];
    newFeatures[index] = { ...newFeatures[index], [key]: value };
    handleChange('features', newFeatures);
  };

  const handleRemoveFeature = (index: number) => {
    const newFeatures = [...(config.features || [])];
    newFeatures.splice(index, 1);
    handleChange('features', newFeatures);
  };

  return (
    <div className="space-y-6">
      {/* Colunas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Colunas (1 a 4)
        </label>
        <input
          type="number"
          min="1"
          max="4"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={config.columns || 3}
          onChange={(e) =>
            handleChange('columns', parseInt(e.target.value) || 3)
          }
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Layout
        </label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={config.layout || 'grid'}
          onChange={(e) => handleChange('layout', e.target.value)}
        >
          <option value="grid">Grade</option>
          <option value="list">Lista</option>
        </select>
      </div>

      {/* Lista de Features */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            Funcionalidades
          </label>
          <button
            onClick={handleAddFeature}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus size={16} /> Adicionar
          </button>
        </div>

        <div className="space-y-4">
          {(config.features || []).map((feature, index) => (
            <div
              key={index}
              className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3 relative group"
            >
              <button
                onClick={() => handleRemoveFeature(index)}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={16} />
              </button>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Ícone (Emoji)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={feature.icon || ''}
                  onChange={(e) =>
                    handleUpdateFeature(index, 'icon', e.target.value)
                  }
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Título
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium"
                  value={feature.title}
                  onChange={(e) =>
                    handleUpdateFeature(index, 'title', e.target.value)
                  }
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Descrição
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  rows={2}
                  value={feature.description}
                  onChange={(e) =>
                    handleUpdateFeature(index, 'description', e.target.value)
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturesBlockSettings;
