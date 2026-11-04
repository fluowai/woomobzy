import React from 'react';
import { Property } from '../../types';
import {
  LandingPageTheme,
  PropertyFeaturedBlockConfig,
} from '../../types/landingPage';
import PropertyGridBlock from './PropertyGridBlock';

interface PropertyFeaturedBlockProps {
  config: PropertyFeaturedBlockConfig;
  theme: LandingPageTheme;
  properties?: Property[];
}

const PropertyFeaturedBlock: React.FC<PropertyFeaturedBlockProps> = ({
  config,
  theme,
  properties = [],
}) => {
  const selected = config.propertyId
    ? properties.find((property) => property.id === config.propertyId) ||
      properties[0]
    : properties[0];

  if (!selected) {
    return (
      <section className="px-4 py-12 text-center text-slate-600">
        <h2 className="text-2xl font-bold text-slate-900">
          Imóvel em destaque
        </h2>
        <p className="mt-2">Nenhum imóvel foi selecionado para esta página.</p>
      </section>
    );
  }

  return (
    <PropertyGridBlock
      config={{
        columns: 1,
        gap: 24,
        showFilters: false,
        maxItems: 1,
        sortBy: 'date',
        cardStyle: 'modern',
      }}
      theme={theme}
      properties={[selected]}
    />
  );
};

export default PropertyFeaturedBlock;
