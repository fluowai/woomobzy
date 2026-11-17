import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trees, Building2, Crown } from 'lucide-react';

interface DashboardModeSwitcherProps {
  currentMode: 'rural' | 'urban' | 'megaadmin';
  onChangeMode?: (mode: 'rural' | 'urban' | 'megaadmin') => void;
}

export const DashboardModeSwitcher: React.FC<DashboardModeSwitcherProps> = ({
  currentMode,
  onChangeMode,
}) => {
  const navigate = useNavigate();

  const handleSelect = (mode: 'rural' | 'urban' | 'megaadmin') => {
    if (onChangeMode) {
      onChangeMode(mode);
    } else {
      if (mode === 'rural') navigate('/rural');
      else if (mode === 'urban') navigate('/urban');
      else if (mode === 'megaadmin') navigate('/megaadmin');
    }
  };

  const modes = [
    {
      id: 'rural' as const,
      title: 'Rural',
      subtitle: 'Grandes áreas e propriedades',
      icon: Trees,
      iconColor: 'text-[#ff6a00]',
      bgImage: '/templates/rural/hero_rural.png',
      // fallback sunset landscape
      gradient: 'from-[#2a1708] to-[#12161f]',
    },
    {
      id: 'urban' as const,
      title: 'Urbano',
      subtitle: 'Imóveis na cidade',
      icon: Building2,
      iconColor: 'text-zinc-300',
      bgImage: '/templates/urban/urban_sea_view.png',
      gradient: 'from-[#141b29] to-[#0d1017]',
    },
    {
      id: 'megaadmin' as const,
      title: 'Dono do Sistema',
      subtitle: 'Visão geral da operação',
      icon: Crown,
      iconColor: 'text-amber-400',
      bgImage: '/templates/urban/urban_penthouse.png',
      gradient: 'from-[#2d2208] to-[#11141d]',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {modes.map((item) => {
        const isActive = currentMode === item.id;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            onClick={() => handleSelect(item.id)}
            className={`group relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 cursor-pointer ${
              isActive
                ? 'border-2 border-[#ff6a00] bg-gradient-to-r from-[#20150d] via-[#1a1c24] to-[#11141d] shadow-[0_0_25px_rgba(255,106,0,0.25)]'
                : 'border border-white/10 bg-[#12151e]/80 hover:border-white/20 hover:bg-[#161a26]'
            }`}
          >
            {/* Background Image Thumbnail with overlay */}
            <div className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden opacity-30 group-hover:opacity-45 transition-opacity">
              <img
                src={item.bgImage}
                alt={item.title}
                className="h-full w-full object-cover object-center filter contrast-125"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#12151e] via-[#12151e]/80 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex items-center gap-3.5">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all ${
                  isActive
                    ? 'bg-[#ff6a00] text-white shadow-lg shadow-orange-500/30'
                    : 'bg-white/5 text-zinc-400 group-hover:bg-white/10 group-hover:text-white'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-white' : item.iconColor} />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-black text-white tracking-wide">
                    {item.title}
                  </h4>
                  {isActive && (
                    <span className="h-2 w-2 rounded-full bg-[#ff6a00] animate-pulse" />
                  )}
                </div>
                <p className="text-xs font-medium text-zinc-400 mt-0.5">
                  {item.subtitle}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default DashboardModeSwitcher;
