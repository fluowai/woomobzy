export enum DevelopmentStatus {
  PROJETO = 'Projeto',
  APROVACAO = 'Aprovacao',
  PRE_VENDA = 'Pre-venda',
  VENDAS = 'Em Vendas',
  OBRAS = 'Em Obras',
  ENTREGUE = 'Entregue',
}

export enum LotStatus {
  AVAILABLE = 'Disponivel',
  RESERVED = 'Reservado',
  IN_PROPOSAL = 'Em Proposta',
  SOLD = 'Vendido',
  BLOCKED = 'Bloqueado',
  DELINQUENT = 'Inadimplente',
  SETTLED = 'Quitado',
}

export interface Development {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  status: DevelopmentStatus;
  location: {
    city: string;
    state: string;
    address: string;
    coordinates?: { lat: number; lng: number };
  };
  total_area?: number;
  total_blocks?: number;
  total_lots?: number;
  registration_number?: string;
  infrastructure_status?: number;
  images: string[];
  documents?: string[];
  created_at: string;
}

export interface DevelopmentBlock {
  id: string;
  development_id: string;
  name: string;
  total_lots: number;
}

export interface Lot {
  id: string;
  development_id: string;
  block_id: string;
  number: string;
  area_m2: number;
  price: number;
  status: LotStatus;
  front_m?: number;
  back_m?: number;
  left_m?: number;
  right_m?: number;
  coordinates?: any;
  current_client_id?: string;
  contract_id?: string;
}
