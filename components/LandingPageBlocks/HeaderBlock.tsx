import React from 'react';
import { Phone, Mail, MessageCircle } from 'lucide-react';

export interface HeaderBlockConfig {
  logo?: string;
  brandName?: string;
  tagline?: string;
  showWhatsApp?: boolean;
  whatsappNumber?: string;
  showPhone?: boolean;
  phoneNumber?: string;
  sticky?: boolean;
  transparent?: boolean;
  backgroundColor?: string;
  textColor?: string;
}

interface HeaderBlockProps {
  config: HeaderBlockConfig;
  theme: any;
}

const HeaderBlock: React.FC<HeaderBlockProps> = ({ config, theme }) => {
  const bg = config.backgroundColor || theme.primaryColor || '#ffffff';
  const color = config.textColor || (config.transparent ? '#ffffff' : '#1f2937');
  
  return (
    <header
      className={`${config.sticky ? 'sticky top-0 z-50' : ''} ${config.transparent ? 'absolute w-full' : ''}`}
      style={{
        backgroundColor: config.transparent ? 'transparent' : bg,
        borderBottom: config.transparent ? 'none' : '1px solid rgba(0,0,0,0.1)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            {config.logo && (
              <img 
                src={config.logo} 
                alt="Logo" 
                className="h-10 md:h-12 w-auto"
              />
            )}
            <div>
              {config.brandName && (
                <div 
                  className="text-lg md:text-xl font-bold"
                  style={{ color }}
                >
                  {config.brandName}
                </div>
              )}
              {config.tagline && (
                <div 
                  className="text-xs md:text-sm opacity-80"
                  style={{ color }}
                >
                  {config.tagline}
                </div>
              )}
            </div>
          </div>

          {/* Contact Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {config.showPhone && config.phoneNumber && (
              <a
                href={`tel:${config.phoneNumber}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-black/5 transition-colors"
                style={{ color }}
              >
                <Phone size={18} />
                <span className="hidden md:inline text-sm font-medium">
                  {config.phoneNumber}
                </span>
              </a>
            )}
            
            {config.showWhatsApp && config.whatsappNumber && (
              <a
                href={`https://wa.me/${config.whatsappNumber.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
              >
                <MessageCircle size={18} />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderBlock;
