export const RURAL_PROPERTY_TYPES = [
  'Fazenda',
  'Sitio',
  'Sítio',
  'Chacara',
  'Chácara',
  'Estancia',
  'Estância',
  'Haras',
  'Granja',
  'Agropecuaria',
  'Agropecuária',
  'Terreno Rural',
  'Gleba',
  'Lote Rural',
  'Area Produtiva',
  'Área Produtiva',
  'Rural',
];

export const URBAN_PROPERTY_TYPES = [
  'Apartamento',
  'Casa',
  'Sobrado',
  'Terreno Urbano',
  'Sala Comercial',
  'Galpao Industrial',
  'Galpão Industrial',
  'Loft',
  'Studio',
  'Cobertura',
];

export function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function normalizeNiche(value = '') {
  const normalized = normalizeText(value);
  if (normalized === 'rural') return 'rural';
  if (['urbano', 'urban', 'traditional', 'tradicional'].includes(normalized)) return 'urbano';
  return '';
}

export function isRuralType(value = '') {
  const normalized = normalizeText(value);
  return RURAL_PROPERTY_TYPES.some((type) => normalizeText(type) === normalized);
}

export function isUrbanType(value = '') {
  const normalized = normalizeText(value);
  return URBAN_PROPERTY_TYPES.some((type) => normalizeText(type) === normalized);
}

export function getPropertyType(property = {}) {
  return property.property_type || property.type || property.tipo || '';
}

export function isRuralProperty(property = {}) {
  const niche = normalizeNiche(property.niche);
  if (niche === 'rural') return true;
  if (niche === 'urbano') return false;
  return isRuralType(getPropertyType(property));
}

export function isUrbanProperty(property = {}) {
  const niche = normalizeNiche(property.niche);
  if (niche === 'urbano') return true;
  if (niche === 'rural') return false;
  return isUrbanType(getPropertyType(property));
}

export function sqlList(values) {
  return values.map((type) => `"${type}"`).join(',');
}

export function ruralTypeSqlList() {
  return sqlList(RURAL_PROPERTY_TYPES);
}

export function urbanTypeSqlList() {
  return sqlList(URBAN_PROPERTY_TYPES);
}

export function applyRuralFilter(query) {
  return query.or(
    `niche.eq.rural,and(niche.is.null,property_type.in.(${ruralTypeSqlList()}))`
  );
}

export function applyUrbanFilter(query) {
  return query.or(
    `niche.eq.urbano,niche.eq.traditional,and(niche.is.null,property_type.in.(${urbanTypeSqlList()}))`
  );
}
