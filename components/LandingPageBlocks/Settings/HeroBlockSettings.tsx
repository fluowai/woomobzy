import React from 'react';
import { HeroBlockConfig } from '../../../types/landingPage';
import { Upload } from 'lucide-react';

interface HeroBlockSettingsProps {
  config: HeroBlockConfig;
  onUpdate: (config: HeroBlockConfig) => void;
}

const HeroBlockSettings: React.FC<HeroBlockSettingsProps> = ({ config, onUpdate }) => {
  const updateField = (field: keyof HeroBlockConfig, value: any) => {
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
          Subtítulo
        </label>
        <textarea
          value={config.subtitle || ''}
          onChange={(e) => updateField('subtitle', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          placeholder="https://exemplo.com/imagem.jpg"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Opacidade do Overlay: {(config.overlayOpacity * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={config.overlayOpacity}
          onChange={(e) => updateField('overlayOpacity', parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Altura (px)
        </label>
        <input
          type="number"
          value={config.height}
          onChange={(e) => updateField('height', parseInt(e.target.value))}
          min="300"
          max="1000"
          step="50"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Alinhamento
        </label>
        <select
          value={config.alignment}
          onChange={(e) => updateField('alignment', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="left">Esquerda</option>
          <option value="center">Centro</option>
          <option value="right">Direita</option>
        </select>
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

      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Call to Action</h4>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Texto do Botão
            </label>
            <input
              type="text"
              value={config.ctaText || ''}
              onChange={(e) => updateField('ctaText', e.target.value)}
              placeholder="Saiba Mais"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link do Botão
            </label>
            <input
              type="text"
              value={config.ctaLink || ''}
              onChange={(e) => updateField('ctaLink', e.target.value)}
              placeholder="#contato"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroBlockSettings;
