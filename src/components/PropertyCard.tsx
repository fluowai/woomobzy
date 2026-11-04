import React, { memo } from 'react';

interface PropertyCardProps {
  id: string;
  title: string;
  price: number;
  image?: string;
  city: string;
  state: string;
  onClick?: () => void;
}

const PropertyCard: React.FC<PropertyCardProps> = memo(
  ({ id, title, price, image, city, state, onClick }) => {
    const formatPrice = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    };

    return (
      <div
        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
        onClick={onClick}
      >
        <div className="aspect-video bg-gray-200 relative">
          {image ? (
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              Sem imagem
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-lg truncate">{title}</h3>
          <p className="text-gray-600 text-sm">
            {city}, {state}
          </p>
          <p className="text-indigo-600 font-bold mt-2">{formatPrice(price)}</p>
        </div>
      </div>
    );
  }
);

PropertyCard.displayName = 'PropertyCard';

export default PropertyCard;
