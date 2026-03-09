
import React from 'react';
import { Block, PropertyGridBlockConfig } from '../../../types';
import { Property } from '../../../types';
import { MapPin, Maximize } from 'lucide-react';

interface PropertyGridBlockProps {
  block: Block;
  isEditing?: boolean;
}

export const PropertyGridBlock: React.FC<PropertyGridBlockProps> = ({ block, isEditing }) => {
  const config = block.config as PropertyGridBlockConfig;

  // Mock properties para preview
  const mockProperties: Partial<Property>[] = [
    {
      id: '1',
      title: 'Fazenda Produtiva',
      price: 4500000,
      images: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef'],
      location: { city: 'Sorriso', neighborhood: 'Centro', state: 'MT', address: '' },
      features: { areaHectares: 1200 } as any
    },
    {
      id: '2',
      title: 'Haras de Luxo',
      price: 8500000,
      images: ['https://images.unsplash.com/photo-1534329535361-1f6a01149a4a'],
      location: { city: 'Tatuí', neighborhood: 'Rural', state: 'SP', address: '' },
      features: { areaHectares: 50 } as any
    },
    {
      id: '3',
      title: 'Sítio Café Gourmet',
      price: 3200000,
      images: ['https://images.unsplash.com/photo-1505330622279-bf7d7fc918f4'],
      location: { city: 'Três Pontas', neighborhood: 'Sul de Minas', state: 'MG', address: '' },
      features: { areaHectares: 150 } as any
    }
  ];

  const displayProperties = mockProperties.slice(0, config.maxItems || 6);

  return (
    <div>
      {config.showFilters && (
        <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500 text-center">Filtros de busca aparecerão aqui</p>
        </div>
      )}
      
      <div 
        className="grid gap-6"
        style={{
          gridTemplateColumns: `repeat(${config.columns || 3}, minmax(0, 1fr))`,
          gap: config.gap || 24
        }}
      >
        {displayProperties.map((property) => (
          <div key={property.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-slate-100">
            <div className="relative h-48 bg-slate-200">
              <img 
                src={property.images?.[0]} 
                alt={property.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4">
              <h3 className="font-bold text-lg mb-2">{property.title}</h3>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                <MapPin size={14} />
                <span>{property.location?.city}, {property.location?.state}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  <Maximize size={12} className="inline mr-1" />
                  {property.features?.areaHectares} ha
                </span>
                <span className="font-bold text-indigo-600">
                  {property.price?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
