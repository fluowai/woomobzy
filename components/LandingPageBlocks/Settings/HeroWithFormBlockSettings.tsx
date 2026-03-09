import React from 'react';
import { HeroWithFormBlockConfig } from '../../../types/landingPage';

interface HeroWithFormBlockSettingsProps {
  config: HeroWithFormBlockConfig;
  onUpdate: (config: HeroWithFormBlockConfig) => void;
}

const HeroWithFormBlockSettings: React.FC<HeroWithFormBlockSettingsProps> = ({ config, onUpdate }) => {
  const updateField = (field: keyof HeroWithFormBlockConfig, value: any) => {
    onUpdate({ ...config, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Título Hero
        </label>
        <input
          type="text"
          value={config.title}
          onChange={(e) => updateField('title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subtítulo Hero
        </label>
        <textarea
          value={config.subtitle || ''}
          onChange={(e) => updateField('subtitle', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Imagem de Fundo (URL)
        </label>
        <input
          type="url"
          value={config.backgroundImage}
          onChange={(e) => updateField('backgroundImage', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Título do Formulário
        </label>
        <input
          type="text"
          value={config.formTitle}
          onChange={(e) => updateField('formTitle', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Texto do Botão
        </label>
        <input
          type="text"
          value={config.submitText}
          onChange={(e) => updateField('submitText', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Imagem do Guia/Especialista (URL)
        </label>
        <input
          type="url"
          value={config.guideImageUrl || ''}
          onChange={(e) => updateField('guideImageUrl', e.target.value)}
          placeholder="https://exemplo.com/guia.png"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showBadges"
          checked={config.showBadges}
          onChange={(e) => updateField('showBadges', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="showBadges" className="text-sm font-medium text-gray-700">
          Mostrar Selos de Confiança
        </label>
      </div>
    </div>
  );
};

export default HeroWithFormBlockSettings;
