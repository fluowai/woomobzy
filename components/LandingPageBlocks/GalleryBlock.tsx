import React from 'react';
import { LandingPageTheme } from '../../types/landingPage';

interface GalleryBlockProps {
  config: any;
  theme: LandingPageTheme;
}

const GalleryBlock: React.FC<GalleryBlockProps> = ({ config }) => {
  const { images = [], columns = 3, spacing = 16 } = config;

  if (!images || images.length === 0) {
    return (
      <div className="p-6 sm:p-12 bg-gray-50 border-2 border-dashed border-gray-300 text-center rounded-lg">
        <p className="text-gray-500">Galeria de Fotos</p>
        <p className="text-xs text-gray-400 mt-2">Nenhuma imagem adicionada</p>
      </div>
    );
  }

  const responsiveCols =
    columns <= 1
      ? 'grid-cols-1'
      : columns === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : columns === 3
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

  return (
    <div className={`grid ${responsiveCols}`} style={{ gap: `${spacing}px` }}>
      {images.map((img: any, idx: number) => (
        <div
          key={idx}
          className="relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer"
          style={{ aspectRatio: '4/3' }}
        >
          <img
            src={img.src || img}
            alt={img.alt || `Foto ${idx + 1}`}
            className="w-full h-full object-cover"
          />
          {img.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white p-2 text-sm">
              {img.caption}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default GalleryBlock;
