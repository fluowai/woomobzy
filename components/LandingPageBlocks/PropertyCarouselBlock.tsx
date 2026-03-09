import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { LandingPageTheme } from '../../types/landingPage';

interface PropertyCarouselBlockProps {
  config: any;
  theme: LandingPageTheme;
}

const PropertyCarouselBlock: React.FC<PropertyCarouselBlockProps> = ({ config, theme }) => {
  const { 
    images = [], 
    autoplay = false, 
    autoplayDelay = 4000,
    showThumbnails = true,
    showDots = true 
  } = config;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="p-12 bg-gray-50 border-2 border-dashed border-gray-300 text-center rounded-lg">
        <p className="text-gray-500">Carrossel de Fotos</p>
        <p className="text-xs text-gray-400 mt-2">Nenhuma imagem adicionada</p>
      </div>
    );
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const currentImage = images[currentIndex];
  const imageSrc = typeof currentImage === 'string' ? currentImage : currentImage?.src;
  const imageAlt = typeof currentImage === 'string' ? `Foto ${currentIndex + 1}` : currentImage?.alt;
  const imageCaption = typeof currentImage === 'string' ? '' : currentImage?.caption;

  return (
    <div className="relative">
      {/* Main Carousel */}
      <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {/* Current Image */}
        <img
          src={imageSrc}
          alt={imageAlt}
          className="w-full h-full object-cover"
        />

        {/* Navigation Arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 rounded-full p-3 shadow-lg transition-all hover:scale-110"
          aria-label="Foto anterior"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 rounded-full p-3 shadow-lg transition-all hover:scale-110"
          aria-label="Próxima foto"
        >
          <ChevronRight size={24} />
        </button>

        {/* Lightbox Button */}
        <button
          onClick={() => setLightboxOpen(true)}
          className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-900 rounded-full p-2 shadow-lg transition-all hover:scale-110"
          aria-label="Ver em tela cheia"
        >
          <Maximize2 size={20} />
        </button>

        {/* Caption */}
        {imageCaption && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
            <p className="text-white text-sm md:text-base">{imageCaption}</p>
          </div>
        )}

        {/* Counter */}
        <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      {/* Dots Navigation */}
      {showDots && images.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all rounded-full ${
                index === currentIndex
                  ? 'w-8 h-2 bg-gray-900'
                  : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Ir para foto ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Thumbnails */}
      {showThumbnails && images.length > 1 && (
        <div className="mt-4 grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {images.map((img, index) => {
            const thumbSrc = typeof img === 'string' ? img : img?.src;
            return (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
                  index === currentIndex
                    ? 'ring-2 ring-gray-900 ring-offset-2 scale-105'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={thumbSrc}
                  alt={`Miniatura ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-all"
          >
            <X size={24} />
          </button>

          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-all"
          >
            <ChevronLeft size={32} />
          </button>

          <img
            src={imageSrc}
            alt={imageAlt}
            className="max-w-full max-h-full object-contain"
          />

          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-all"
          >
            <ChevronRight size={32} />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyCarouselBlock;
