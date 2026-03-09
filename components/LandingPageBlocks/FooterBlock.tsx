import React from 'react';
import { Phone, Mail, MapPin, Facebook, Instagram, Linkedin,  MessageCircle } from 'lucide-react';

export interface FooterBlockConfig {
  logo?: string;
  companyName?: string;
  description?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
  copyrightText?: string;
  backgroundColor?: string;
  textColor?: string;
}

interface FooterBlockProps {
  config: FooterBlockConfig;
  theme: any;
}

const FooterBlock: React.FC<FooterBlockProps> = ({ config, theme }) => {
  const bg = config.backgroundColor || '#1f2937';
  const color = config.textColor || '#ffffff';
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{ backgroundColor: bg, color }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Company Info */}
          <div>
            {config.logo && (
              <img 
                src={config.logo} 
                alt={config.companyName || 'Logo'} 
                className="h-12 w-auto mb-4"
              />
            )}
            {config.companyName && !config.logo && (
              <h3 className="text-xl font-bold mb-4">{config.companyName}</h3>
            )}
            {config.description && (
              <p className="text-sm opacity-80 mb-4">{config.description}</p>
            )}
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4 text-lg">Contato</h4>
            <div className="space-y-3">
              {config.phone && (
                <a
                  href={`tel:${config.phone}`}
                  className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
                >
                  <Phone size={16} />
                  {config.phone}
                </a>
              )}
              {config.whatsapp && (
                <a
                  href={`https://wa.me/${config.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
                >
                  <MessageCircle size={16} />
                  WhatsApp: {config.whatsapp}
                </a>
              )}
              {config.email && (
                <a
                  href={`mailto:${config.email}`}
                  className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
                >
                  <Mail size={16} />
                  {config.email}
                </a>
              )}
              {config.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{config.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Social Links */}
          {config.socialLinks && (
            <div>
              <h4 className="font-semibold mb-4 text-lg">Redes Sociais</h4>
              <div className="flex gap-3">
                {config.socialLinks.facebook && (
                  <a
                    href={config.socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook size={20} />
                  </a>
                )}
                {config.socialLinks.instagram && (
                  <a
                    href={config.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram size={20} />
                  </a>
                )}
                {config.socialLinks.linkedin && (
                  <a
                    href={config.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    aria-label="LinkedIn"
                  >
                    <Linkedin size={20} />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-white/10 text-center text-sm opacity-70">
          {config.copyrightText || `© ${currentYear} ${config.companyName || 'Todos os direitos reservados'}`}
        </div>
      </div>
    </footer>
  );
};

export default FooterBlock;
