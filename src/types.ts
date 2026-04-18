export enum ViewType {
  DASHBOARD = 'DASHBOARD',
  CRM = 'CRM',
  PROPERTIES = 'PROPERTIES',
  MAPS = 'MAPS',
  DUE_DILIGENCE = 'DUE_DILIGENCE',
  PARTNERS = 'PARTNERS',
  OWNERS = 'OWNERS',
  BUYERS = 'BUYERS',
  SETTINGS = 'SETTINGS',
  SUPER_ADMIN = 'SUPER_ADMIN',
  CONVERSATIONS = 'CONVERSATIONS',
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: 'ACTIVE' | 'INACTIVE';
  theme?: any;
}

export interface RuralProperty {
  id: string;
  company_id: string;
  internal_code: string;
  title: string;
  property_type:
    | 'FAZENDA'
    | 'SITIO'
    | 'CHACARA'
    | 'HARAS'
    | 'AREA_AGRICOLA'
    | 'AREA_PECUARIA'
    | 'REFLORESTAMENTO'
    | 'LAZER_RURAL'
    | 'ARRENDAMENTO';
  total_area: number;
  useful_area: number;
  state: string;
  city: string;
  price_total: number;
  price_per_unit?: number;
  status: 'DRAFT' | 'ACTIVE' | 'SOLD' | 'SUSPENDED' | 'ARCHIVED';
  centroid?: { x: number; y: number };
  biome?: string;
  owner_id?: string;
  created_at: string;
}

export interface Lead {
  id: string;
  company_id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  aptitude_interest?: string[];
  min_area?: number;
  max_budget?: number;
  notes?: string;
  classification?: string;
  chat_jid?: string;
  created_at: string;
}

export interface PropertyPolygon {
  id: string;
  property_id: string;
  geom: any; // GeoJSON
  source: string;
  area_ha: number;
}
