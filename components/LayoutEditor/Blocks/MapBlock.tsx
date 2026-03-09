
import React from 'react';
import { Block } from '../../../types';

interface MapBlockProps {
  block: Block;
  isEditing?: boolean;
}

export const MapBlock: React.FC<MapBlockProps> = ({ block, isEditing }) => {
  const config = block.config as any;
  
  const latitude = config.latitude || -23.5505;
  const longitude = config.longitude || -46.6333;
  const zoom = config.zoom || 15;
  const height = config.height || 400;

  // Google Maps embed URL
  const mapUrl = `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${latitude},${longitude}&zoom=${zoom}`;

  return (
    <div>
      {config.title && (
        <h2 className="text-2xl font-bold mb-4">{config.title}</h2>
      )}
      
      <div 
        className="rounded-2xl overflow-hidden border border-slate-200"
        style={{ height }}
      >
        {isEditing ? (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">🗺️</div>
              <p className="text-sm text-slate-600 font-medium">Mapa</p>
              <p className="text-xs text-slate-400 mt-1">
                Lat: {latitude}, Lng: {longitude}
              </p>
            </div>
          </div>
        ) : (
          <iframe
            src={mapUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        )}
      </div>
      
      {config.address && (
        <p className="text-sm text-slate-600 mt-3 text-center">
          📍 {config.address}
        </p>
      )}
    </div>
  );
};
