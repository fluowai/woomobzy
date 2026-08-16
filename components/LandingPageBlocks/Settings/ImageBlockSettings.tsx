import React from 'react';

interface ImageBlockSettingsProps {
  config: any;
  onUpdate: (config: any) => void;
}

const ImageBlockSettings: React.FC<ImageBlockSettingsProps> = ({
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
          URL da Imagem
        </label>
        <input
          type="url"
          value={config.src || ''}
          onChange={(e) => updateField('src', e.target.value)}
          placeholder="https://exemplo.com/imagem.jpg"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Texto Alternativo (alt)
        </label>
        <input
          type="text"
          value={config.alt || 'Imagem'}
          onChange={(e) => updateField('alt', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Largura
        </label>
        <input
          type="text"
          value={config.width || '100%'}
          onChange={(e) => updateField('width', e.target.value)}
          placeholder="100%"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Altura
        </label>
        <input
          type="text"
          value={config.height || 'auto'}
          onChange={(e) => updateField('height', e.target.value)}
          placeholder="auto"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Object Fit
        </label>
        <select
          value={config.objectFit || 'cover'}
          onChange={(e) => updateField('objectFit', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="fill">Fill</option>
          <option value="none">None</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Link (opcional)
        </label>
        <input
          type="url"
          value={config.link || ''}
          onChange={(e) => updateField('link', e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );
};

export default ImageBlockSettings;
