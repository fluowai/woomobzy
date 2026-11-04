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

export function normalizeText(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function normalizeNiche(value: unknown): 'rural' | 'urbano' | '' {
  const normalized = normalizeText(value);
  if (normalized === 'rural') return 'rural';
  if (['urbano', 'urban', 'traditional', 'tradicional'].includes(normalized))
    return 'urbano';
  return '';
}

export function isRuralType(value: unknown) {
  const normalized = normalizeText(value);
  return RURAL_PROPERTY_TYPES.some(
    (type) => normalizeText(type) === normalized
  );
}

export function isUrbanType(value: unknown) {
  const normalized = normalizeText(value);
  return URBAN_PROPERTY_TYPES.some(
    (type) => normalizeText(type) === normalized
  );
}

export function getPropertyType(property: any) {
  return property?.property_type || property?.type || property?.tipo || '';
}

export function isRuralProperty(property: any) {
  const niche = normalizeNiche(property?.niche);
  if (niche === 'rural') return true;
  if (niche === 'urbano') return false;
  return isRuralType(getPropertyType(property));
}

export function isUrbanProperty(property: any) {
  const niche = normalizeNiche(property?.niche);
  if (niche === 'urbano') return true;
  if (niche === 'rural') return false;
  return isUrbanType(getPropertyType(property));
}

export function ruralTypeSqlList() {
  return RURAL_PROPERTY_TYPES.map((type) => `"${type}"`).join(',');
}

export function urbanTypeSqlList() {
  return URBAN_PROPERTY_TYPES.map((type) => `"${type}"`).join(',');
}
