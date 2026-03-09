
import React from 'react';
import { Block } from '../../../types';
import { Phone, Mail, Instagram, MapPin } from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';

interface BrokerCardBlockProps {
  block: Block;
  isEditing?: boolean;
}

export const BrokerCardBlock: React.FC<BrokerCardBlockProps> = ({ block, isEditing }) => {
  const config = block.config as any;
  const { settings } = useSettings();
  
  // Usar dados do broker das settings ou do config do bloco
  const broker = config.useBrokerFromSettings 
    ? settings.homeContent?.broker 
    : config.broker;

  const name = broker?.name || 'Nome do Corretor';
  const creci = broker?.creci || 'CRECI 00000';
  const photoUrl = broker?.photoUrl || '';
  const phone = broker?.phone || settings.contactPhone;
  const specialty = broker?.specialty || 'Imóveis de Luxo';
  const instagram = broker?.instagram || settings.socialLinks?.instagram;

  const layout = config.layout || 'card'; // 'card' | 'inline' | 'minimal'

  if (layout === 'inline') {
    return (
      <div className="flex items-center gap-6 bg-white rounded-2xl p-6 border border-slate-100">
        <div className="w-24 h-24 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl text-slate-400">
              👤
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-slate-900">{name}</h3>
          <p className="text-sm text-slate-500 mb-3">{creci} • {specialty}</p>
          
          <div className="flex gap-3">
            {phone && (
              <a
                href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
              >
                <Phone size={16} />
                WhatsApp
              </a>
            )}
            {instagram && (
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Instagram size={16} />
                Instagram
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Card layout (default)
  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm max-w-sm mx-auto text-center">
      <div className="w-32 h-32 rounded-full bg-slate-200 overflow-hidden mx-auto mb-6">
        {photoUrl ? (
          <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-slate-400">
            👤
          </div>
        )}
      </div>
      
      <h3 className="text-2xl font-bold text-slate-900 mb-1">{name}</h3>
      <p className="text-sm text-slate-500 mb-2">{creci}</p>
      <p className="text-sm text-indigo-600 font-medium mb-6">{specialty}</p>
      
      <div className="space-y-2">
        {phone && (
          <a
            href={`https://wa.me/${phone.replace(/\D/g, '')}`}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
          >
            <Phone size={18} />
            Falar no WhatsApp
          </a>
        )}
        {instagram && (
          <a
            href={instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <Instagram size={18} />
            Seguir no Instagram
          </a>
        )}
      </div>
    </div>
  );
};
