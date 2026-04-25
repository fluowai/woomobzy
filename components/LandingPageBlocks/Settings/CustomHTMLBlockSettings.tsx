import React from 'react';
import { CustomHTMLBlockConfig } from '../../../types/landingPage';

interface CustomHTMLBlockSettingsProps {
  config: CustomHTMLBlockConfig;
  onUpdate: (config: CustomHTMLBlockConfig) => void;
}

const CustomHTMLBlockSettings: React.FC<CustomHTMLBlockSettingsProps> = ({ config, onUpdate }) => {
  const handleChange = (key: keyof CustomHTMLBlockConfig, value: string) => {
    onUpdate({ ...config, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">HTML Content</label>
        <textarea
          value={config.html || ''}
          onChange={(e) => handleChange('html', e.target.value)}
          rows={10}
          className="w-full p-3 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="<div>Seu HTML aqui...</div>"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Internal CSS (Opcional)</label>
        <textarea
          value={config.css || ''}
          onChange={(e) => handleChange('css', e.target.value)}
          rows={5}
          className="w-full p-3 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder=".minha-classe { color: red; }"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Scripts JS (Opcional)</label>
        <textarea
          value={config.js || ''}
          onChange={(e) => handleChange('js', e.target.value)}
          rows={5}
          className="w-full p-3 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="console.log('Hello from JS');"
        />
        <p className="text-[10px] text-amber-600 mt-1 font-medium">⚠️ Cuidado ao injetar scripts externos.</p>
      </div>
    </div>
  );
};

export default CustomHTMLBlockSettings;
