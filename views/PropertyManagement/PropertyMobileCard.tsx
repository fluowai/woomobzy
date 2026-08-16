import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, Trash2, Eye } from 'lucide-react';
import { Property } from '../../types';

interface PropertyMobileCardProps {
  property: Property;
  onDelete: (id: string) => void;
}

const PropertyMobileCard: React.FC<PropertyMobileCardProps> = ({
  property,
  onDelete,
}) => {
  const navigate = useNavigate();

  return (
    <article className="p-4">
      <div className="flex gap-3">
        <img
          src={
            property.images?.[0] ||
            'https://via.placeholder.com/400x300?text=Sem+Foto'
          }
          className="h-20 w-24 rounded-xl object-cover shrink-0"
          alt={property.title}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
              {property.title}
            </h3>
            <span
              className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${
                property.status === 'Disponível'
                  ? 'bg-emerald-100 text-emerald-700'
                  : property.status === 'Pendente'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-slate-100 text-slate-700'
              }`}
            >
              {property.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {property.location?.neighborhood || 'S/ Bairro'},{' '}
            {property.location?.city || 'S/ Cidade'}
          </p>
          <p className="mt-2 text-base font-bold text-primary">
            {(property.price || 0).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          onClick={() => navigate(`${property.id}`)}
          className="h-10 rounded-xl bg-slate-50 text-xs font-bold text-slate-600 flex items-center justify-center gap-1"
        >
          <Edit3 size={14} /> Editar
        </button>
        <button
          onClick={() => navigate(`/property/${property.id}`)}
          className="h-10 rounded-xl bg-slate-50 text-xs font-bold text-slate-600 flex items-center justify-center gap-1"
        >
          <Eye size={14} /> Ver
        </button>
        <button
          onClick={() => onDelete(property.id!)}
          className="h-10 rounded-xl bg-red-50 text-xs font-bold text-red-600 flex items-center justify-center gap-1"
        >
          <Trash2 size={14} /> Excluir
        </button>
      </div>
    </article>
  );
};

export default PropertyMobileCard;
