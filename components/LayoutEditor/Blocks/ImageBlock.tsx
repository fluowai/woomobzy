
import React from 'react';
import { Block, ImageBlockConfig } from '../../../types';

interface ImageBlockProps {
  block: Block;
  isEditing?: boolean;
}

export const ImageBlock: React.FC<ImageBlockProps> = ({ block, isEditing }) => {
  const config = block.config as ImageBlockConfig;

  const imageElement = (
    <img
      src={config.src || 'https://via.placeholder.com/800x400'}
      alt={config.alt || 'Imagem'}
      style={{
        width: config.width || '100%',
        height: config.height || 'auto',
        objectFit: config.objectFit || 'cover'
      }}
      className="rounded-lg"
    />
  );

  if (config.link && !isEditing) {
    return (
      <a href={config.link} target="_blank" rel="noopener noreferrer">
        {imageElement}
      </a>
    );
  }

  return imageElement;
};
