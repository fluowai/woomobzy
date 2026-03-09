
import React from 'react';
import { Block, HeroBlockConfig } from '../../../types';

interface HeroBlockProps {
  block: Block;
  isEditing?: boolean;
}

export const HeroBlock: React.FC<HeroBlockProps> = ({ block, isEditing }) => {
  const config = block.config as HeroBlockConfig;

  return (
    <div 
      className="relative overflow-hidden flex items-center justify-center"
      style={{ 
        height: config.height || 600,
        backgroundImage: `url(${config.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black"
        style={{ opacity: config.overlayOpacity || 0.5 }}
      />
      
      {/* Content */}
      <div 
        className="relative z-10 max-w-4xl px-6 text-center"
        style={{ 
          textAlign: config.alignment,
          color: config.textColor || '#ffffff'
        }}
      >
        <h1 
          className="font-black mb-4 leading-tight"
          style={{ fontSize: 'clamp(32px, 5vw, 72px)' }}
        >
          {config.title || 'Título do Hero'}
        </h1>
        
        {config.subtitle && (
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            {config.subtitle}
          </p>
        )}
        
        {config.ctaText && (
          <a
            href={config.ctaLink || '#'}
            className="inline-block px-8 py-4 bg-white text-slate-900 font-bold rounded-xl hover:scale-105 transition-transform"
            onClick={(e) => isEditing && e.preventDefault()}
          >
            {config.ctaText}
          </a>
        )}
      </div>
    </div>
  );
};
