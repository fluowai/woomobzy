import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Edit3,
  Trash2,
  Eye,
  MapPin,
  Brain,
  UserCheck,
  Megaphone,
  Check,
  Globe,
} from 'lucide-react';
import { Property } from '../../types';

interface PropertyCardProps {
  property: Property;
  isRural: boolean;
  isPending: boolean;
  portalPublishing: { propertyId: string; portal: string } | null;
  getPropertySummary: (p: Property) => string[];
  getPortalPublishes: (p: Property) => Record<string, any>;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  onPortalPublish: (id: string, portal: string) => void;
  onPortalUnpublish: (id: string, portal: string) => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  isRural,
  isPending,
  portalPublishing,
  getPropertySummary,
  getPortalPublishes,
  onApprove,
  onDelete,
  onPortalPublish,
  onPortalUnpublish,
}) => {
  const navigate = useNavigate();
  const acp = (property.features as any)?.acp;
  const publishes = getPortalPublishes(property);

  return (
    <div className="card card-hover overflow-hidden group animate-slide-up">
      <div className="relative h-56 -mx-6 -mt-6 mb-6 overflow-hidden">
        <img
          src={
            property.images?.[0] ||
            'https://images.unsplash.com/photo-1500382017468-9049fee74a62?auto=format&fit=crop&q=80&w=800'
          }
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div
          className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg ${
            property.status === 'Disponível'
              ? 'bg-emerald-500 text-white'
              : property.status === 'Pendente'
                ? 'bg-accent text-black'
                : 'bg-text-tertiary text-white'
          }`}
        >
          {property.status}
        </div>
      </div>
      <div className="p-5">
        <div className="space-y-4">
          <div>
            <span className="badge badge-primary mb-2">{property.type}</span>
            {(property as any).source === 'orulo' && (
              <span className="badge mb-2 ml-2 bg-slate-900 text-white">
                Órulo
              </span>
            )}
            <h3 className="text-lg font-bold text-text-primary truncate mb-1">
              {property.title}
            </h3>
            <p className="text-sm text-text-tertiary truncate flex items-center gap-1">
              <MapPin size={12} />{' '}
              {property.location?.neighborhood || 'Bairro não informado'},{' '}
              {property.location?.city || 'Cidade'}
            </p>
          </div>
          {acp && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Brain size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    ACP Comercial
                  </span>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-700 shadow-sm">
                  ICP {acp.icp?.fit_score || acp.score || 0}%
                </span>
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                <p className="flex items-start gap-2">
                  <UserCheck
                    size={14}
                    className="mt-0.5 shrink-0 text-indigo-500"
                  />
                  <span>
                    <strong className="text-slate-800">Persona:</strong>{' '}
                    {acp.persona?.name ||
                      acp.icp?.name ||
                      'Comprador qualificado'}
                  </span>
                </p>
                <p>
                  <strong className="text-slate-800">Oferta:</strong>{' '}
                  {acp.offer?.positioning || acp.diagnosis?.best_angle}
                </p>
                {acp.meta_ads?.campaigns?.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {acp.meta_ads.campaigns
                      .slice(0, 2)
                      .map((campaign: any, index: number) => (
                        <span
                          key={`${campaign.name || 'meta'}-${index}`}
                          className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600"
                        >
                          <Megaphone size={11} />{' '}
                          {campaign.angle || campaign.name}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-primary">
              {(property.price || 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </span>
            <div className="flex flex-wrap items-center justify-end gap-2 text-text-tertiary text-xs font-bold uppercase tracking-wider">
              {getPropertySummary(property).map((item, index) => (
                <React.Fragment key={`${property.id}-summary-${item}`}>
                  {index > 0 && (
                    <span className="w-1 h-1 bg-text-tertiary rounded-full" />
                  )}
                  <span>{item}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 border-t border-border-subtle pt-6 mt-2">
            {isPending ? (
              <>
                <button
                  onClick={() => navigate(`${property.id}`)}
                  className="btn-primary flex-1 h-10 text-xs uppercase tracking-widest"
                >
                  <Edit3 size={14} /> Revisar Copy
                </button>
                <button
                  onClick={() => onApprove(property.id)}
                  className="btn-secondary flex-1 h-10 text-xs uppercase tracking-widest"
                >
                  <Check size={14} /> Publicar
                </button>
                <button
                  onClick={() => onDelete(property.id!)}
                  className="p-2 text-text-tertiary hover:text-red-500 transition-colors bg-bg-hover rounded-lg"
                >
                  <Trash2 size={18} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate(`${property.id}`)}
                  className="btn btn-secondary flex-1 h-10 text-xs uppercase tracking-widest font-bold"
                >
                  <Edit3 size={14} /> Editar
                </button>
                <button
                  onClick={() => navigate(`/property/${property.id}`)}
                  className="p-2 text-text-tertiary hover:text-primary transition-colors bg-bg-hover rounded-lg"
                  title="Ver página pública"
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={() => onDelete(property.id!)}
                  className="p-2 text-text-tertiary hover:text-red-500 transition-colors bg-bg-hover rounded-lg"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>
          {property.status !== 'Pendente' && !isRural && (
            <div className="flex items-center gap-2 pt-2 border-t border-border-subtle mt-4">
              <Globe size={12} className="text-text-tertiary shrink-0" />
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
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg transition-all ${isPublished ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'} disabled:opacity-50`}
                  >
                    {isLoading
                      ? '...'
                      : isPublished
                        ? `✔ ${portal === 'vivareal' ? 'VivaReal' : 'Zap'}`
                        : portal === 'vivareal'
                          ? 'VivaReal'
                          : 'Zap'}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
