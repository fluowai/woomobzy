import React from 'react';
import { Site } from '../../types/site';
import { Palette, Link, Phone, Mail, MapPin, Globe } from 'lucide-react';
import MenuEditor from './MenuEditor';
import { SitePage } from '../../types/site';

interface GlobalSettingsProps {
  site: Site;
  pages: SitePage[];
  onUpdate: (updates: Partial<Site>) => void;
}

const GlobalSettings: React.FC<GlobalSettingsProps> = ({ site, pages, onUpdate }) => {
  return (
    <div className="space-y-8 p-6">
      {/* Identidade Visual */}
      <section>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Palette size={20} /> Identidade Visual
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Cor Primária</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={site.globalTheme?.primaryColor || '#2563eb'}
                onChange={(e) => onUpdate({ globalTheme: { ...site.globalTheme, primaryColor: e.target.value } })}
                className="w-10 h-10 rounded cursor-pointer border border-gray-600"
              />
              <input
                type="text"
                value={site.globalTheme?.primaryColor || '#2563eb'}
                onChange={(e) => onUpdate({ globalTheme: { ...site.globalTheme, primaryColor: e.target.value } })}
                className="bg-gray-700 text-white px-3 py-2 rounded text-sm flex-1 border border-gray-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Cor Secundária</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={site.globalTheme?.secondaryColor || '#0d9488'}
                onChange={(e) => onUpdate({ globalTheme: { ...site.globalTheme, secondaryColor: e.target.value } })}
                className="w-10 h-10 rounded cursor-pointer border border-gray-600"
              />
              <input
                type="text"
                value={site.globalTheme?.secondaryColor || '#0d9488'}
                onChange={(e) => onUpdate({ globalTheme: { ...site.globalTheme, secondaryColor: e.target.value } })}
                className="bg-gray-700 text-white px-3 py-2 rounded text-sm flex-1 border border-gray-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Fonte</label>
            <select
              value={site.globalTheme?.fontFamily || 'Inter, sans-serif'}
              onChange={(e) => onUpdate({ globalTheme: { ...site.globalTheme, fontFamily: e.target.value } })}
              className="bg-gray-700 text-white px-3 py-2 rounded text-sm w-full border border-gray-600"
            >
              <option value="Inter, sans-serif">Inter</option>
              <option value="Roboto, sans-serif">Roboto</option>
              <option value="Poppins, sans-serif">Poppins</option>
              <option value="Montserrat, sans-serif">Montserrat</option>
              <option value="Open Sans, sans-serif">Open Sans</option>
              <option value="Lato, sans-serif">Lato</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Arredondamento</label>
            <select
              value={site.globalTheme?.borderRadius || '0.75rem'}
              onChange={(e) => onUpdate({ globalTheme: { ...site.globalTheme, borderRadius: e.target.value } })}
              className="bg-gray-700 text-white px-3 py-2 rounded text-sm w-full border border-gray-600"
            >
              <option value="0px">Sem arredondamento</option>
              <option value="0.5rem">Pequeno</option>
              <option value="0.75rem">Médio</option>
              <option value="1rem">Grande</option>
            </select>
          </div>
        </div>
      </section>

      {/* Logo */}
      <section>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Logo</h3>
        <div className="flex items-center gap-4">
          {site.logoUrl && (
            <img src={site.logoUrl} alt="Logo" className="h-14 object-contain bg-white/10 rounded-lg p-1" />
          )}
          <input
            type="text"
            value={site.logoUrl || ''}
            onChange={(e) => onUpdate({ logoUrl: e.target.value })}
            className="bg-gray-700 text-white px-3 py-2 rounded text-sm flex-1 border border-gray-600"
            placeholder="URL da logo ou upload..."
          />
        </div>
      </section>

      {/* Informações de Contato */}
      <section>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Phone size={20} /> Informações de Contato
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
              <Phone size={12} /> Telefone
            </label>
            <input
              type="text"
              value={site.contactInfo?.phone || ''}
              onChange={(e) => onUpdate({ contactInfo: { ...site.contactInfo, phone: e.target.value } })}
              className="bg-gray-700 text-white px-3 py-2 rounded text-sm w-full border border-gray-600"
              placeholder="(00) 0000-0000"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
              <MessageCircle size={12} /> WhatsApp
            </label>
            <input
              type="text"
              value={site.contactInfo?.whatsapp || ''}
              onChange={(e) => onUpdate({ contactInfo: { ...site.contactInfo, whatsapp: e.target.value } })}
              className="bg-gray-700 text-white px-3 py-2 rounded text-sm w-full border border-gray-600"
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
              <Mail size={12} /> E-mail
            </label>
            <input
              type="email"
              value={site.contactInfo?.email || ''}
              onChange={(e) => onUpdate({ contactInfo: { ...site.contactInfo, email: e.target.value } })}
              className="bg-gray-700 text-white px-3 py-2 rounded text-sm w-full border border-gray-600"
              placeholder="contato@imobiliaria.com.br"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
              <MapPin size={12} /> Endereço
            </label>
            <input
              type="text"
              value={site.contactInfo?.address || ''}
              onChange={(e) => onUpdate({ contactInfo: { ...site.contactInfo, address: e.target.value } })}
              className="bg-gray-700 text-white px-3 py-2 rounded text-sm w-full border border-gray-600"
              placeholder="Rua, nº, bairro..."
            />
          </div>
        </div>
      </section>

      {/* Redes Sociais */}
      <section>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Globe size={20} /> Redes Sociais
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'instagram', label: 'Instagram' },
            { key: 'facebook', label: 'Facebook' },
            { key: 'youtube', label: 'YouTube' },
            { key: 'linkedin', label: 'LinkedIn' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs text-gray-400 mb-1">{label}</label>
              <input
                type="text"
                value={(site.socialLinks as any)?.[key] || ''}
                onChange={(e) => onUpdate({ socialLinks: { ...site.socialLinks, [key]: e.target.value } })}
                className="bg-gray-700 text-white px-3 py-2 rounded text-sm w-full border border-gray-600"
                placeholder={`URL do ${label}`}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Menu de Navegação */}
      <section>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Link size={20} /> Menu de Navegação
        </h2>
        <MenuEditor
          menuConfig={site.menuConfig || []}
          pages={pages}
          onChange={(menuConfig) => onUpdate({ menuConfig })}
        />
      </section>
    </div>
  );
};

const MessageCircle = ({ size }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export default GlobalSettings;
