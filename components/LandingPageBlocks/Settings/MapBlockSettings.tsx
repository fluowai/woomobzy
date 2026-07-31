import React from 'react';

interface MapBlockSettingsProps {
  config: any;
  onUpdate: (config: any) => void;
}

const MapBlockSettings: React.FC<MapBlockSettingsProps> = ({
  config,
  onUpdate,
}) => {
  const updateField = (field: string, value: any) => {
    onUpdate({ ...config, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Endereço
        </label>
        <input
          type="text"
          value={config.address || ''}
          onChange={(e) => updateField('address', e.target.value)}
          placeholder="Av. Paulista, 1000 - São Paulo, SP"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Título (card sobreposto)
        </label>
        <input
          type="text"
          value={config.title || ''}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="Título do card"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Descrição (card sobreposto)
        </label>
        <textarea
          value={config.description || ''}
          onChange={(e) => updateField('description', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Zoom: {config.zoom || 15}
        </label>
        <input
          type="range"
          min="1"
          max="20"
          step="1"
          value={config.zoom || 15}
          onChange={(e) => updateField('zoom', parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Altura (px): {config.height || 400}
        </label>
        <input
          type="range"
          min="200"
          max="800"
          step="50"
          value={config.height || 400}
          onChange={(e) => updateField('height', parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="map-show-card"
          checked={config.showCard !== false}
          onChange={(e) => updateField('showCard', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="map-show-card" className="ml-2 text-sm text-gray-700">
          Mostrar Card Sobreposto
        </label>
      </div>
    </div>
  );
};

export default MapBlockSettings;
