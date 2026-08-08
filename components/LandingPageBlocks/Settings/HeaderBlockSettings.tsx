import React from 'react';
import { HeaderBlockConfig } from '../HeaderBlock';

interface HeaderBlockSettingsProps {
  config: HeaderBlockConfig;
  onUpdate: (config: HeaderBlockConfig) => void;
}

const HeaderBlockSettings: React.FC<HeaderBlockSettingsProps> = ({
  config,
  onUpdate,
}) => {
  const handleChange = (key: keyof HeaderBlockConfig, value: any) => {
    onUpdate({ ...config, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Brand */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
          Identidade
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome da Empresa
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={config.brandName || ''}
            onChange={(e) => handleChange('brandName', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Slogan / Tagline
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={config.tagline || ''}
            onChange={(e) => handleChange('tagline', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL do Logotipo
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={config.logo || ''}
            placeholder="https://..."
            onChange={(e) => handleChange('logo', e.target.value)}
          />
        </div>
      </div>

      {/* Contatos */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
          Contatos Rápidos
        </h3>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="rounded text-blue-600 focus:ring-blue-500"
              checked={config.showWhatsApp || false}
              onChange={(e) => handleChange('showWhatsApp', e.target.checked)}
            />
            <span className="text-sm font-medium text-gray-700">
              Mostrar Botão WhatsApp
            </span>
          </label>
          {config.showWhatsApp && (
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mt-1"
              value={config.whatsappNumber || ''}
              placeholder="Ex: 5511999999999"
              onChange={(e) => handleChange('whatsappNumber', e.target.value)}
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="rounded text-blue-600 focus:ring-blue-500"
              checked={config.showPhone || false}
              onChange={(e) => handleChange('showPhone', e.target.checked)}
            />
            <span className="text-sm font-medium text-gray-700">
              Mostrar Telefone Fixo
            </span>
          </label>
          {config.showPhone && (
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mt-1"
              value={config.phoneNumber || ''}
              placeholder="Ex: (11) 3333-4444"
              onChange={(e) => handleChange('phoneNumber', e.target.value)}
            />
          )}
        </div>
      </div>

      {/* Layout */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
          Estilo
        </h3>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="rounded text-blue-600 focus:ring-blue-500"
            checked={config.sticky || false}
            onChange={(e) => handleChange('sticky', e.target.checked)}
          />
          <span className="text-sm font-medium text-gray-700">
            Fixar no topo (Sticky)
          </span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="rounded text-blue-600 focus:ring-blue-500"
            checked={config.transparent || false}
            onChange={(e) => handleChange('transparent', e.target.checked)}
          />
          <span className="text-sm font-medium text-gray-700">
            Fundo Transparente
          </span>
        </label>
      </div>
    </div>
  );
};

export default HeaderBlockSettings;
