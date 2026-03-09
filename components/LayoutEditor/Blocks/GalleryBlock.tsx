
import React, { useState } from 'react';
import { Block } from '../../../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface GalleryBlockProps {
  block: Block;
  isEditing?: boolean;
}

export const GalleryBlock: React.FC<GalleryBlockProps> = ({ block, isEditing }) => {
  const config = block.config as any;
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const images = config.images || [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
    'https://images.unsplash.com/photo-1600607686527-6fb886090705'
  ];

  const layout = config.layout || 'grid'; // 'grid' | 'carousel' | 'masonry'

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (layout === 'carousel') {
    return (
      <div className="relative">
        <div className="aspect-video bg-slate-200 rounded-2xl overflow-hidden">
          <img 
            src={images[currentIndex]} 
            alt={`Gallery ${currentIndex + 1}`}
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Navigation */}
        <button
          onClick={prevImage}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={nextImage}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
        >
          <ChevronRight size={20} />
        </button>
        
        {/* Indicators */}
        <div className="flex gap-2 justify-center mt-4">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? 'bg-indigo-600 w-8' : 'bg-slate-300'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  // Grid layout
  const columns = config.columns || 3;
  
  return (
    <div 
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
      }}
    >
      {images.map((image, index) => (
        <div key={index} className="aspect-square bg-slate-200 rounded-xl overflow-hidden">
          <img 
            src={image} 
            alt={`Gallery ${index + 1}`}
            className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
          />
        </div>
      ))}
    </div>
  );
};
