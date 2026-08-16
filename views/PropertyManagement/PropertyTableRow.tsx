import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, Trash2, Globe } from 'lucide-react';
import { Property } from '../../types';

interface PropertyTableRowProps {
  property: Property;
  isRural: boolean;
  portalPublishing: { propertyId: string; portal: string } | null;
  getPropertySummary: (p: Property) => string[];
  getPortalPublishes: (p: Property) => Record<string, any>;
  onDelete: (id: string) => void;
  onPortalPublish: (id: string, portal: string) => void;
  onPortalUnpublish: (id: string, portal: string) => void;
}

const PropertyTableRow: React.FC<PropertyTableRowProps> = ({
  property,
  isRural,
  portalPublishing,
  getPropertySummary,
  getPortalPublishes,
  onDelete,
  onPortalPublish,
  onPortalUnpublish,
}) => {
  const navigate = useNavigate();
  const publishes = getPortalPublishes(property);

  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-3">
          <img
            src={
              property.images?.[0] ||
              'https://via.placeholder.com/400x300?text=Sem+Foto'
            }
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              {property.title}
            </p>
            <p className="text-xs text-slate-400">
              ID: {property.id?.slice(0, 8)} •{' '}
              {(property as any).source === 'orulo'
                ? 'Órulo'
                : getPropertySummary(property).join(' • ')}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-slate-500 whitespace-nowrap">
        {property.location?.neighborhood || 'S/ Bairro'},{' '}
        {property.location?.city || 'S/ Cidade'}
      </td>
      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm font-bold text-slate-900 whitespace-nowrap">
        {(property.price || 0).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })}
      </td>
      <td className="px-4 sm:px-6 py-3 sm:py-4">
        <span
          className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${
            property.status === 'Disponível'
              ? 'bg-emerald-100 text-emerald-700'
              : property.status === 'Pendente'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-slate-100 text-slate-700'
          }`}
        >
          {property.status}
        </span>
      </td>
      <td className="px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => navigate(`${property.id}`)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
            title="Editar"
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={() => onDelete(property.id!)}
            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
            title="Excluir"
          >
            <Trash2 size={16} />
          </button>
          {property.status !== 'Pendente' && !isRural && (
            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-200">
              {['vivareal', 'zap'].map((portal) => {
                const entry = publishes[portal];
                const isPublished = entry?.status === 'published';
                const isLoading =
                  portalPublishing?.propertyId === property.id &&
                  portalPublishing?.portal === portal;
                return (
                  <button
                    key={portal}
                    onClick={() =>
                      isPublished
                        ? onPortalUnpublish(property.id!, portal)
                        : onPortalPublish(property.id!, portal)
                    }
                    disabled={isLoading}
                    className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded transition-all ${isPublished ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:text-slate-600'} disabled:opacity-50`}
                    title={`${isPublished ? 'Remover do' : 'Publicar no'} ${portal === 'vivareal' ? 'VivaReal' : 'Zap'}`}
                  >
                    {isLoading ? (
                      '...'
                    ) : isPublished ? (
                      '✔'
                    ) : (
                      <Globe size={12} />
                    )}
                    <span className="ml-0.5">
                      {portal === 'vivareal' ? 'VR' : 'Zap'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

export default PropertyTableRow;
