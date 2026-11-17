import React from 'react';

interface WooTechLogoProps {
  variant?: 'light' | 'dark'; // 'dark' = for dark backgrounds (white text), 'light' = for white/light card backgrounds (dark text)
  subtitle?: 'crm-erp' | 'crm' | 'none';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

export const WooTechLogo: React.FC<WooTechLogoProps> = ({
  variant = 'dark',
  subtitle = 'crm-erp',
  size = 'md',
  className = '',
  showText = true,
}) => {
  const isDark = variant === 'dark';

  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const subSizes = {
    sm: 'text-[8px] tracking-[0.2em]',
    md: 'text-[9.5px] tracking-[0.22em]',
    lg: 'text-[11px] tracking-[0.25em]',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* WooTech Stylized Orange Icon */}
      <div className={`relative flex items-center justify-center shrink-0 ${iconSizes[size]}`}>
        <svg
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_2px_10px_rgba(255,106,0,0.4)]"
        >
          {/* Main geometric 'W' in vibrant gradient orange */}
          <defs>
            <linearGradient id="wooOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff7a1a" />
              <stop offset="100%" stopColor="#ff5500" />
            </linearGradient>
            <linearGradient id="wooPixelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffaa44" />
              <stop offset="100%" stopColor="#ff6a00" />
            </linearGradient>
          </defs>

          {/* Left leg */}
          <path
            d="M5 14L13.5 34H18.5L22 24.5L17.5 14H12.5L9.5 22L7.2 14H5Z"
            fill="url(#wooOrangeGrad)"
          />
          {/* Center-right body of W */}
          <path
            d="M22 24.5L25.5 34H30.5L39 14H34L30.5 24.5L27 14H22.5L20 20L22 24.5Z"
            fill="url(#wooOrangeGrad)"
          />

          {/* Pixel constellation dots on upper right corner */}
          <rect x="33" y="6" width="3.5" height="3.5" rx="0.8" fill="url(#wooPixelGrad)" />
          <rect x="37.5" y="6" width="3.5" height="3.5" rx="0.8" fill="url(#wooPixelGrad)" />
          <rect x="35" y="2" width="3.5" height="3.5" rx="0.8" fill="url(#wooPixelGrad)" />
          <rect x="35" y="10.5" width="3.5" height="3.5" rx="0.8" fill="url(#wooPixelGrad)" />
        </svg>
      </div>

      {/* Typography */}
      {showText && (
        <div className="flex flex-col justify-center leading-none">
          <div className="flex items-center">
            <span
              className={`font-black tracking-wider uppercase font-sans ${textSizes[size]} ${
                isDark ? 'text-white' : 'text-zinc-950'
              }`}
            >
              WOOTECH
            </span>
          </div>
          {subtitle !== 'none' && (
            <span
              className={`font-black uppercase text-[#ff6a00] font-sans mt-0.5 ${subSizes[size]}`}
            >
              {subtitle === 'crm-erp' ? 'CRM / ERP IMOBILIÁRIO' : 'CRM IMOBILIÁRIO'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default WooTechLogo;
