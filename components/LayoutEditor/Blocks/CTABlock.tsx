
import React from 'react';
import { Block, CTABlockConfig } from '../../../types';

interface CTABlockProps {
  block: Block;
  isEditing?: boolean;
}

export const CTABlock: React.FC<CTABlockProps> = ({ block, isEditing }) => {
  const config = block.config as CTABlockConfig;

  return (
    <div 
      className="rounded-2xl p-12 text-center"
      style={{
        backgroundColor: config.backgroundColor || '#4F46E5',
        color: config.textColor || '#ffffff'
      }}
    >
      <h2 className="text-4xl font-bold mb-4">
        {config.title || 'Pronto para começar?'}
      </h2>
      
      {config.description && (
        <p className="text-xl mb-8 opacity-90">
          {config.description}
        </p>
      )}
      
      <a
        href={config.buttonLink || '#'}
        onClick={(e) => isEditing && e.preventDefault()}
        className="inline-block px-8 py-4 bg-white text-slate-900 font-bold rounded-xl hover:scale-105 transition-transform"
      >
        {config.buttonText || 'Saiba Mais'}
      </a>
    </div>
  );
};
