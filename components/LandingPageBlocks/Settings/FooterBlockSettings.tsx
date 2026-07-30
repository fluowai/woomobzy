import React from 'react';
import { FooterBlockConfig } from '../FooterBlock';

interface FooterBlockSettingsProps {
  config: FooterBlockConfig;
  onUpdate: (config: FooterBlockConfig) => void;
}

const FooterBlockSettings: React.FC<FooterBlockSettingsProps> = ({
  config,
  onUpdate,
}) => {
  const handleChange = (key: keyof FooterBlockConfig, value: any) => {
    onUpdate({ ...config, [key]: value });
  };

  const handleSocialChange = (network: string, value: string) => {
    onUpdate({
      ...config,
      socialLinks: {
        ...(config.socialLinks || {}),
        [network]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Informações da Empresa */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Informações da Empresa</h3>
        
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome da Empresa
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={config.companyName || ''}
            onChange={(e) => handleChange('companyName', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descrição (Sobre)
          </label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={config.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Texto de Direitos Autorais
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={config.copyrightText || ''}
            placeholder="© 2026 Empresa. Todos os direitos reservados."
            onChange={(e) => handleChange('copyrightText', e.target.value)}
          />
        </div>
      </div>

      {/* Contato */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Contato</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            E-mail
          </label>
          <input
            type="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={config.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefone
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={config.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            WhatsApp
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={config.whatsapp || ''}
            onChange={(e) => handleChange('whatsapp', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Endereço Completo
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={config.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
          />
        </div>
      </div>

      {/* Redes Sociais */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Redes Sociais</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Facebook (URL)
          </label>
          <input
            type="url"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={config.socialLinks?.facebook || ''}
            placeholder="https://facebook.com/..."
            onChange={(e) => handleSocialChange('facebook', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Instagram (URL)
          </label>
          <input
            type="url"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={config.socialLinks?.instagram || ''}
            placeholder="https://instagram.com/..."
            onChange={(e) => handleSocialChange('instagram', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            LinkedIn (URL)
          </label>
          <input
            type="url"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={config.socialLinks?.linkedin || ''}
            placeholder="https://linkedin.com/..."
            onChange={(e) => handleSocialChange('linkedin', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default FooterBlockSettings;
