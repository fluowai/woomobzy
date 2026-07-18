import React, { useEffect, useState } from 'react';
import {
  PropertyGridBlockConfig,
  LandingPageTheme,
} from '../../types/landingPage';
import { Property } from '../../types';
import { MapPin, Maximize2, DollarSign } from 'lucide-react';

interface PropertyGridBlockProps {
  config: PropertyGridBlockConfig;
  theme: LandingPageTheme;
  properties?: Property[];
}

const PropertyGridBlock: React.FC<PropertyGridBlockProps> = ({
  config,
  theme,
  properties = [],
}) => {
  const displayProperties = properties.slice(0, config.maxItems);

  const gridColsMap: Record<number, string> = {
    2: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-4',
  };

  return (
    <div className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div
          className={`grid ${gridColsMap[config.columns] || 'grid-cols-1 md:grid-cols-3 lg:grid-cols-3'}`}
          style={{ gap: `${config.gap}px` }}
        >
          {displayProperties.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Nenhum imóvel real disponível para este bloco.
            </div>
          )}
          {displayProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              theme={theme}
              cardStyle={config.cardStyle}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface PropertyCardProps {
  property: Property;
  theme: LandingPageTheme;
  cardStyle: 'modern' | 'classic' | 'minimal';
}

const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  theme,
  cardStyle,
}) => {
  const getCardClasses = () => {
    switch (cardStyle) {
      case 'modern':
        return 'bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow overflow-hidden';
      case 'classic':
        return 'bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors overflow-hidden';
      case 'minimal':
        return 'bg-white rounded-lg hover:bg-gray-50 transition-colors overflow-hidden';
      default:
        return 'bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden';
    }
  };

  return (
    <div className={getCardClasses()}>
      {/* Image */}
      <div className="relative h-48 bg-gray-200">
        {property.images && property.images[0] ? (
          <img
            src={property.images[0]}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Maximize2 size={48} />
          </div>
        )}

        {/* Badge */}
        <div
          className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: theme.primaryColor }}
        >
          {property.type}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3
          className="text-xl font-bold mb-2 line-clamp-2"
          style={{
            color: theme.textColor,
            fontFamily: theme.headingFontFamily || theme.fontFamily,
          }}
        >
          {property.title}
        </h3>

        <div className="flex items-center text-gray-600 text-sm mb-3">
          <MapPin size={16} className="mr-1" />
          <span>
            {property.location.city}, {property.location.state}
          </span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center text-gray-600 text-sm">
            <Maximize2 size={16} className="mr-1" />
            <span>{property.features.areaHectares} hectares</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-500">Valor</p>
            <p
              className="text-2xl font-bold"
              style={{ color: theme.primaryColor }}
            >
              R$ {(property.price / 1000000).toFixed(2)}M
            </p>
          </div>

          <button
            className="px-4 py-2 rounded-lg font-medium text-white transition-transform hover:scale-105"
            style={{ backgroundColor: theme.primaryColor }}
          >
            Ver Detalhes
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyGridBlock;
