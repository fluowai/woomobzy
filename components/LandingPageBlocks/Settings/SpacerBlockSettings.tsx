import React from 'react';
import { SpacerBlockConfig } from '../../../types/landingPage';

interface SpacerBlockSettingsProps {
  config: SpacerBlockConfig;
  onUpdate: (config: SpacerBlockConfig) => void;
}

const SpacerBlockSettings: React.FC<SpacerBlockSettingsProps> = ({ config, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Altura (px): {config.height}px
        </label>
        <input
          type="range"
          min="20"
          max="200"
          step="10"
          value={config.height}
          onChange={(e) => onUpdate({ height: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>20px</span>
          <span>200px</span>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-600 text-center">
          Preview do espaçamento
        </p>
        <div
          className="bg-blue-100 border-2 border-dashed border-blue-300 mt-2"
          style={{ height: `${Math.min(config.height, 100)}px` }}
        />
      </div>
    </div>
  );
};

export default SpacerBlockSettings;
