import React from 'react';
import { LandingPageTheme } from '../../types/landingPage';

interface ImageBlockProps {
  config: any;
  theme: LandingPageTheme;
}

const ImageBlock: React.FC<ImageBlockProps> = ({ config, theme }) => {
  const { src = '', alt = 'Imagem', width = '100%', height = 'auto', objectFit = 'cover', link = '' } = config;

  if (!src) {
    return (
      <div className="p-12 bg-gray-100 border-2 border-dashed border-gray-300 text-center rounded-lg">
        <p className="text-gray-500">Bloco de Imagem</p>
        <p className="text-xs text-gray-400 mt-2">Clique para adicionar uma imagem</p>
      </div>
    );
  }

  const imageElement = (
    <img
      src={src}
      alt={alt}
      className="rounded-lg shadow-md"
      style={{
        width,
        height,
        objectFit: objectFit as any
      }}
    />
  );

  if (link) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" className="block">
        {imageElement}
      </a>
    );
  }

  return imageElement;
};

export default ImageBlock;
