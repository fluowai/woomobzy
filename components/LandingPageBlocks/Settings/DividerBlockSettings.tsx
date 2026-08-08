import React from 'react';

interface DividerBlockSettingsProps {
  config: any;
  onUpdate: (config: any) => void;
}

const DividerBlockSettings: React.FC<DividerBlockSettingsProps> = ({
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
          Estilo
        </label>
        <select
          value={config.style || 'solid'}
          onChange={(e) => updateField('style', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="solid">Sólida</option>
          <option value="dashed">Tracejada</option>
          <option value="dotted">Pontilhada</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cor
        </label>
        <div className="flex gap-2">
          <input
            type="color"
            value={config.color || '#e5e7eb'}
            onChange={(e) => updateField('color', e.target.value)}
            className="h-10 w-20 rounded border border-gray-300"
          />
          <input
            type="text"
            value={config.color || '#e5e7eb'}
            onChange={(e) => updateField('color', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Espessura (px): {config.thickness || 1}
        </label>
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          value={config.thickness || 1}
          onChange={(e) => updateField('thickness', parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Largura
        </label>
        <select
          value={config.width || '100%'}
          onChange={(e) => updateField('width', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="100%">100%</option>
          <option value="75%">75%</option>
          <option value="50%">50%</option>
          <option value="25%">25%</option>
        </select>
      </div>
    </div>
  );
};

export default DividerBlockSettings;
