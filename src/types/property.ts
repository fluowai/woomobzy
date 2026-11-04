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

export type PropertyStatus =
  | 'Disponível'
  | 'Alugado'
  | 'Vendido'
  | 'Reservado'
  | 'Pendente';

export interface Property {
  id: string;
  organization_id: string;
  title: string;
  description?: string;
  property_type: string;
  status: PropertyStatus;
  purpose?: string;
  price?: number;
  total_area_ha?: number;
  useful_area_ha?: number;
  city?: string;
  state?: string;
  address?: string;
  neighborhood?: string;
  features?: Record<string, unknown>;
  images?: string[];
  owner_info?: Record<string, unknown>;
  broker_id?: string;
  niche?: string;
  created_at: string;
  updated_at?: string;
}

export interface RuralProperty extends Property {
  biome?: string;
  soil_type?: string;
  water_resources?: string[];
  infrastructure?: string[];
}

export interface UrbanProperty extends Property {
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
