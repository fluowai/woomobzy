import React from 'react';
import { MapPin } from 'lucide-react';

export interface MapBlockConfig {
  address: string;
  title?: string;
  description?: string;
  zoom?: number;
  height?: number;
  showCard?: boolean;
}

interface MapBlockProps {
  config: MapBlockConfig;
  theme: any;
}

const MapBlock: React.FC<MapBlockProps> = ({ config, theme }) => {
  const height = config.height || 400;
  const encodedAddress = encodeURIComponent(config.address);
  // Using OpenStreetMap embed for public usage without API key for simplicity
  // In production, Google Maps Embed API or similar would be better
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=-48.0,-26.0,-47.0,-25.0&layer=mapnik&marker=${encodedAddress}`; 
  // Note: The bounding box above is random. For a real address search without API key, we might just link to Google Maps or use a static image.
  // A robust "no-key" solution is simply an iframe to Google Maps searching for the address.
  const googleMapsEmbedUrl = `https://maps.google.com/maps?q=${encodedAddress}&t=&z=${config.zoom || 15}&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="relative w-full" style={{ height: `${height}px` }}>
      <iframe
        width="100%"
        height="100%"
        src={googleMapsEmbedUrl}
        frameBorder="0"
        scrolling="no"
        marginHeight={0}
        marginWidth={0}
        title="Map"
        className="w-full h-full"
        style={{ filter: theme.mode === 'dark' ? 'grayscale(1) invert(1)' : 'none' }}
      ></iframe>
      
      {config.showCard && (
        <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg max-w-xs z-10">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-full">
              <MapPin size={20} />
            </div>
            <div>
              {config.title && <h4 className="font-bold text-gray-900">{config.title}</h4>}
              <p className="text-sm text-gray-600 mt-1">{config.address}</p>
              {config.description && <p className="text-xs text-gray-500 mt-2">{config.description}</p>}
              
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                Abrir no Google Maps →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapBlock;
