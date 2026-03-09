
import React from 'react';
import { Block } from '../../../types';
import { Instagram, Facebook, Mail, Phone, MapPin } from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';

interface FooterBlockProps {
  block: Block;
  isEditing?: boolean;
}

export const FooterBlock: React.FC<FooterBlockProps> = ({ block, isEditing }) => {
  const config = block.config as any;
  const { settings } = useSettings();
  
  const backgroundColor = config.backgroundColor || '#1a1a1a';
  const textColor = config.textColor || '#ffffff';
  const showSocial = config.showSocial !== false;
  const showNewsletter = config.showNewsletter || false;
  const columns = config.columns || 4;

  return (
    <footer 
      className="py-12"
      style={{ backgroundColor, color: textColor }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div 
          className="grid gap-8 mb-8"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
          }}
        >
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-bold mb-4" style={{ color: textColor }}>
              {settings.agencyName}
            </h3>
            <p className="text-sm opacity-60 mb-4">
              {settings.footerText || 'Sua imobiliária de confiança'}
            </p>
            {showSocial && (
              <div className="flex gap-3">
                {settings.socialLinks?.instagram && (
                  <a 
                    href={settings.socialLinks.instagram}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <Instagram size={18} />
                  </a>
                )}
                {settings.socialLinks?.facebook && (
                  <a 
                    href={settings.socialLinks.facebook}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <Facebook size={18} />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider opacity-40 mb-4">
              Navegação
            </h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><a href="/properties" className="hover:opacity-100">Imóveis</a></li>
              <li><a href="/about" className="hover:opacity-100">Sobre</a></li>
              <li><a href="/contact" className="hover:opacity-100">Contato</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider opacity-40 mb-4">
              Contato
            </h4>
            <ul className="space-y-2 text-sm opacity-80">
              {settings.contactPhone && (
                <li className="flex items-center gap-2">
                  <Phone size={14} />
                  {settings.contactPhone}
                </li>
              )}
              {settings.contactEmail && (
                <li className="flex items-center gap-2">
                  <Mail size={14} />
                  {settings.contactEmail}
                </li>
              )}
            </ul>
          </div>

          {/* Newsletter */}
          {showNewsletter && (
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider opacity-40 mb-4">
                Newsletter
              </h4>
              <p className="text-xs opacity-60 mb-3">
                Receba novidades e oportunidades
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Seu e-mail"
                  className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm outline-none"
                />
                <button className="px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-bold hover:bg-opacity-90">
                  OK
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs opacity-40">
          <p>© 2024 {settings.agencyName}. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:opacity-100">Privacidade</a>
            <a href="/terms" className="hover:opacity-100">Termos</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
