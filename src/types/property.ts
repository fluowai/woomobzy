export type PropertyType = 
  | 'FAZENDA'
  | 'SITIO'
  | 'CHACARA'
  | 'HARAS'
  | 'AREA_AGRICOLA'
  | 'AREA_PECUARIA'
  | 'REFLORESTAMENTO'
  | 'LAZER_RURAL'
  | 'ARRENDAMENTO'
  | 'CASA'
  | 'APARTAMENTO'
  | 'TERRENO'
  | 'COMERCIAL'
  | 'SALAS'
  | 'LOJAS'
  | 'GALPOES'
  | 'SOBRADO'
  | 'FLAT'
  | 'KITNET';

export type PropertyStatus = 'DRAFT' | 'ACTIVE' | 'SOLD' | 'SUSPENDED' | 'ARCHIVED';

export type PropertyCategory = 'RURAL' | 'URBAN';

export interface Property {
  id: string;
  company_id: string;
  internal_code: string;
  title: string;
  description?: string;
  property_type: PropertyType;
  category: PropertyCategory;
  total_area: number;
  useful_area?: number;
  state: string;
  city: string;
  address?: string;
  neighborhood?: string;
  price_total: number;
  price_per_unit?: number;
  status: PropertyStatus;
  images?: string[];
  videos?: string[];
  features?: string[];
  owner_id?: string;
  agent_id?: string;
  centroid?: { x: number; y: number };
  biome?: string;
  created_at: string;
  updated_at?: string;
}

export interface RuralProperty extends Property {
  category: 'RURAL';
  biome?: string;
  soil_type?: string;
  water_resources?: string[];
  infrastructure?: string[];
}

export interface UrbanProperty extends Property {
  category: 'URBAN';
  bedrooms?: number;
  bathrooms?: number;
  parking_spaces?: number;
  building_area?: number;
  year_built?: number;
  amenities?: string[];
}

export interface PropertyPolygon {
  id: string;
  property_id: string;
  geom: unknown;
  source: string;
  area_ha: number;
}
