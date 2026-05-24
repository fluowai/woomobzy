import React from 'react';
import {
  PropertyGridBlockConfig,
  LandingPageTheme,
} from '../../types/landingPage';
import { Property } from '../../types';
import { MapPin, Maximize2 } from 'lucide-react';

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
  const selectedProperties = config.properties || [];
  const providedProperties = properties.length > 0 ? properties : selectedProperties;

  // Mock properties para preview no editor
  const mockProperties: Property[] =
    providedProperties.length > 0
      ? providedProperties
      : [
          {
            id: '1',
            title: 'Fazenda Premium',
            description: 'Linda fazenda com infraestrutura completa',
            price: 2500000,
            type: 'Fazenda' as any,
            purpose: 'Venda' as any,
            aptitude: [],
            status: 'Disponível' as any,
            location: {
              city: 'Umuarama',
              neighborhood: 'Rural',
              state: 'PR',
              address: 'Rodovia PR-000',
            },
            features: {
              areaHectares: 150,
              casaSede: true,
              caseiros: 2,
              galpoes: 3,
              currais: true,
              tipoSolo: 'Argiloso',
              usoAtual: ['Pasto', 'Agricultura'],
              temGado: true,
              fontesAgua: ['Rio', 'Represa'],
            },
            images: [
              'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
            ],
            brokerId: '1',
            createdAt: new Date().toISOString(),
          },
          {
            id: '2',
            title: 'Sítio com Nascente',
            description: 'Sítio ideal para lazer e produção',
            price: 850000,
            type: 'Sítio' as any,
            purpose: 'Venda' as any,
            aptitude: [],
            status: 'Disponível' as any,
            location: {
              city: 'Maringá',
              neighborhood: 'Rural',
              state: 'PR',
              address: 'Estrada Municipal',
            },
            features: {
              areaHectares: 45,
              casaSede: true,
              caseiros: 1,
              galpoes: 1,
              currais: false,
              tipoSolo: 'Misto',
              usoAtual: ['Pasto', 'Reflorestamento'],
              temGado: false,
              fontesAgua: ['Nascente'],
            },
            images: [
              'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=800',
            ],
            brokerId: '1',
            createdAt: new Date().toISOString(),
          },
          {
            id: '3',
            title: 'Chácara de Lazer',
            description: 'Perfeita para finais de semana',
            price: 450000,
            type: 'Chácara' as any,
            purpose: 'Venda' as any,
            aptitude: [],
            status: 'Disponível' as any,
            location: {
              city: 'Cianorte',
              neighborhood: 'Rural',
              state: 'PR',
              address: 'Estrada Velha',
            },
            features: {
              areaHectares: 12,
              casaSede: true,
              caseiros: 0,
              galpoes: 1,
              currais: false,
              tipoSolo: 'Arenoso',
              usoAtual: ['Lazer'],
              temGado: false,
              fontesAgua: ['Poço Artesiano'],
            },
            images: [
              'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800',
            ],
            brokerId: '1',
            createdAt: new Date().toISOString(),
          },
        ];

  const displayProperties = sortProperties(
    mockProperties,
    config.sortBy
  ).slice(0, config.maxItems);

  return (
    <div className="py-12">
      <div className="w-full max-w-[1800px] mx-auto">
        <div
          className={`grid gap-${config.gap / 4} md:grid-cols-${Math.min(config.columns, 3)} lg:grid-cols-${config.columns}`}
          style={{ gap: `${config.gap}px` }}
        >
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

function sortProperties(properties: Property[], sortBy: PropertyGridBlockConfig['sortBy']) {
  const sorted = [...properties];

  if (sortBy === 'price') {
    return sorted.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  }

  if (sortBy === 'area') {
    return sorted.sort((a, b) => getPropertyArea(a) - getPropertyArea(b));
  }

  return sorted.sort(
    (a: any, b: any) =>
      new Date(b.createdAt || b.created_at || 0).getTime() -
      new Date(a.createdAt || a.created_at || 0).getTime()
  );
}

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
          {getPropertyType(property)}
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
            {formatLocation(property)}
          </span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center text-gray-600 text-sm">
            <Maximize2 size={16} className="mr-1" />
            <span>{formatArea(property)}</span>
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

          <a
            href={`/property/${property.id}`}
            className="px-4 py-2 rounded-lg font-medium text-white transition-transform hover:scale-105"
            style={{ backgroundColor: theme.primaryColor }}
          >
            Ver Detalhes
          </a>
        </div>
      </div>
    </div>
  );
};

function getPropertyArea(property: Property): number {
  const features = property.features || ({} as any);
  return Number(
    (property as any).total_area_ha ||
      features.areaHectares ||
      features.physical?.area ||
      features.areaM2 ||
      0
  );
}

function formatArea(property: Property): string {
  const features = property.features || ({} as any);
  const areaHa = Number(
    (property as any).total_area_ha ||
      features.areaHectares ||
      features.physical?.area ||
      0
  );
  if (areaHa > 0) return `${areaHa.toLocaleString('pt-BR')} hectares`;

  const areaM2 = Number(features.areaM2 || features.areaConstruida || 0);
  if (areaM2 > 0) return `${areaM2.toLocaleString('pt-BR')} m2`;

  return 'Area nao informada';
}

function getPropertyType(property: Property): string {
  return String((property as any).type || (property as any).property_type || 'Imovel');
}

function formatLocation(property: Property): string {
  const location = property.location || ({} as any);
  const city = location.city || (property as any).city;
  const state = location.state || (property as any).state;
  return [city, state].filter(Boolean).join(', ') || 'Localizacao nao informada';
}

export default PropertyGridBlock;
