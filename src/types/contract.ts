export type ContractType = 
  | 'PURCHASE'
  | 'SALE'
  | 'RENTAL'
  | 'LEASE'
  | 'PARTNERSHIP'
  | 'MANDATE';

export type ContractStatus = 
  | 'DRAFT'
  | 'PENDING_SIGNATURES'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELLED';

export interface Contract {
  id: string;
  company_id: string;
  type: ContractType;
  status: ContractStatus;
  title: string;
  property_id: string;
  owner_id: string;
  buyer_id?: string;
  agent_id?: string;
  price: number;
  start_date?: string;
  end_date?: string;
  terms?: string;
  documents?: string[];
  signatures?: ContractSignature[];
  created_at: string;
  updated_at?: string;
}

export interface ContractSignature {
  user_id: string;
  signed_at?: string;
  signature_url?: string;
  ip_address?: string;
}
