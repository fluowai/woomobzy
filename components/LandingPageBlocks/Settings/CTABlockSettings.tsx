import React from 'react';
import { CTABlockConfig } from '../../../types/landingPage';

interface CTABlockSettingsProps {
  config: CTABlockConfig;
  onUpdate: (config: CTABlockConfig) => void;
}

const CTABlockSettings: React.FC<CTABlockSettingsProps> = ({ config, onUpdate }) => {
  const updateField = (field: keyof CTABlockConfig, value: any) => {
    onUpdate({ ...config, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Título
        </label>
        <input
          type="text"
          value={config.title}
          onChange={(e) => updateField('title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Descrição
        </label>
        <textarea
          value={config.description || ''}
          onChange={(e) => updateField('description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Texto do Botão
        </label>
        <input
          type="text"
          value={config.buttonText}
          onChange={(e) => updateField('buttonText', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Link do Botão
        </label>
        <input
          type="text"
          value={config.buttonLink}
          onChange={(e) => updateField('buttonLink', e.target.value)}
          placeholder="#contato"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cor de Fundo
        </label>
        <div className="flex gap-2">
          <input
            type="color"
            value={config.backgroundColor}
            onChange={(e) => updateField('backgroundColor', e.target.value)}
            className="h-10 w-20 rounded border border-gray-300"
          />
          <input
            type="text"
            value={config.backgroundColor}
            onChange={(e) => updateField('backgroundColor', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cor do Texto
        </label>
        <div className="flex gap-2">
          <input
            type="color"
            value={config.textColor}
            onChange={(e) => updateField('textColor', e.target.value)}
            className="h-10 w-20 rounded border border-gray-300"
          />
          <input
            type="text"
            value={config.textColor}
            onChange={(e) => updateField('textColor', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
};

export default CTABlockSettings;
