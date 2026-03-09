
import React from 'react';
import { Block, TextBlockConfig } from '../../../types';

interface TextBlockProps {
  block: Block;
  isEditing?: boolean;
}

export const TextBlock: React.FC<TextBlockProps> = ({ block, isEditing }) => {
  const config = block.config as TextBlockConfig;

  return (
    <div
      className="prose max-w-none"
      style={{
        fontSize: config.fontSize || 16,
        fontWeight: config.fontWeight || 400,
        color: config.color || '#000000',
        textAlign: config.alignment || 'left'
      }}
      dangerouslySetInnerHTML={{ __html: config.content || 'Digite seu texto aqui...' }}
    />
  );
};
