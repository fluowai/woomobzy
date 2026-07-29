import React, { useMemo, useState } from 'react';
import { Property } from '../../types';
import { LandingPageTheme } from '../../types/landingPage';
import PropertyGridBlock from './PropertyGridBlock';

interface PropertySearchBlockProps {
  config: Record<string, unknown>;
  theme: LandingPageTheme;
  properties?: Property[];
}

const normalize = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const PropertySearchBlock: React.FC<PropertySearchBlockProps> = ({
  config,
  theme,
  properties = [],
}) => {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');

  const types = useMemo(
    () =>
      Array.from(
        new Set(properties.map((property) => property.type).filter(Boolean))
      ).sort(),
    [properties]
  );

  const filtered = useMemo(() => {
    const normalizedQuery = normalize(query);
    return properties.filter((property) => {
      const location = `${property.location?.city || ''} ${property.location?.state || ''}`;
      const matchesText =
        !normalizedQuery ||
        normalize(`${property.title} ${location}`).includes(normalizedQuery);
      return matchesText && (!type || property.type === type);
    });
  }, [properties, query, type]);

  return (
    <section className="px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-[1fr_240px]">
          <label className="sr-only" htmlFor="landing-property-search">
            Buscar imóveis
          </label>
          <input
            id="landing-property-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busque por imóvel, cidade ou estado"
            className="min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2"
          />
          <label className="sr-only" htmlFor="landing-property-type">
            Tipo de imóvel
          </label>
          <select
            id="landing-property-type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2"
          >
            <option value="">Todos os tipos</option>
            {types.map((propertyType) => (
              <option key={propertyType} value={propertyType}>
                {propertyType}
              </option>
            ))}
          </select>
        </div>

        {filtered.length ? (
          <PropertyGridBlock
            config={{
              columns: Number(config.columns) || 3,
              gap: Number(config.gap) || 24,
              showFilters: false,
              maxItems: Number(config.resultsPerPage) || 12,
              sortBy: 'date',
              cardStyle: 'modern',
            }}
            theme={theme}
            properties={filtered}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center">
            <p className="font-semibold text-slate-900">
              Nenhum imóvel encontrado
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Ajuste os filtros para ver outras oportunidades.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default PropertySearchBlock;
