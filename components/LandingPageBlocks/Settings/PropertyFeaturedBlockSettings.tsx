import React from 'react';

interface PropertyFeaturedBlockSettingsProps {
  config: any;
  onUpdate: (config: any) => void;
}

const PropertyFeaturedBlockSettings: React.FC<
  PropertyFeaturedBlockSettingsProps
> = ({ config, onUpdate }) => {
  const updateField = (field: string, value: any) => {
    onUpdate({ ...config, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ID do Imóvel em Destaque
        </label>
        <input
          type="text"
          value={config.propertyId || ''}
          onChange={(e) => updateField('propertyId', e.target.value)}
          placeholder="Deixe vazio para usar o primeiro da lista"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          ID do imóvel para destacar. Vazio = primeiro imóvel disponível.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Layout
        </label>
        <select
          value={config.layout || 'image-left'}
          onChange={(e) => updateField('layout', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="image-left">Imagem à Esquerda</option>
          <option value="image-right">Imagem à Direita</option>
          <option value="image-top">Imagem no Topo</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Texto do CTA
        </label>
        <input
          type="text"
          value={config.ctaText || 'Ver Detalhes'}
          onChange={(e) => updateField('ctaText', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.showGallery !== false}
            onChange={(e) => updateField('showGallery', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Mostrar Galeria</span>
        </label>
      </div>
    </div>
  );
};

export default PropertyFeaturedBlockSettings;
