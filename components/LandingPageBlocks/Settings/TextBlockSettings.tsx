import React from 'react';
import { TextBlockConfig } from '../../../types/landingPage';

interface TextBlockSettingsProps {
  config: TextBlockConfig;
  onUpdate: (config: TextBlockConfig) => void;
}

const TextBlockSettings: React.FC<TextBlockSettingsProps> = ({ config, onUpdate }) => {
  const updateField = (field: keyof TextBlockConfig, value: any) => {
    onUpdate({ ...config, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Conteúdo
        </label>
        <textarea
          value={config.content.replace(/<[^>]*>/g, '')}
          onChange={(e) => updateField('content', `<p>${e.target.value}</p>`)}
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          placeholder="Digite seu texto aqui..."
        />
        <p className="text-xs text-gray-500 mt-1">
          Suporte básico a HTML
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tamanho da Fonte (px)
        </label>
        <input
          type="number"
          value={config.fontSize}
          onChange={(e) => updateField('fontSize', parseInt(e.target.value))}
          min="12"
          max="72"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Peso da Fonte
        </label>
        <select
          value={config.fontWeight}
          onChange={(e) => updateField('fontWeight', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value={300}>Leve (300)</option>
          <option value={400}>Normal (400)</option>
          <option value={500}>Médio (500)</option>
          <option value={600}>Semi-Negrito (600)</option>
          <option value={700}>Negrito (700)</option>
          <option value={800}>Extra-Negrito (800)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cor do Texto
        </label>
        <div className="flex gap-2">
          <input
            type="color"
            value={config.color}
            onChange={(e) => updateField('color', e.target.value)}
            className="h-10 w-20 rounded border border-gray-300"
          />
          <input
            type="text"
            value={config.color}
            onChange={(e) => updateField('color', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Alinhamento
        </label>
        <div className="grid grid-cols-4 gap-2">
          {['left', 'center', 'right', 'justify'].map((align) => (
            <button
              key={align}
              onClick={() => updateField('alignment', align)}
              className={`px-3 py-2 border rounded-lg text-sm capitalize transition-colors ${
                config.alignment === align
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
              }`}
            >
              {align === 'left' ? '←' : align === 'center' ? '↔' : align === 'right' ? '→' : '⇔'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TextBlockSettings;
