export type LeadStatus = 
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'PROPOSITION'
  | 'NEGOTIATION'
  | 'CLOSED_WON'
  | 'CLOSED_LOST';

export type LeadSource = 
  | 'WEBSITE'
  | 'WHATSAPP'
  | 'PHONE'
  | 'REFERRAL'
  | 'PORTAL'
  | 'SOCIAL_MEDIA'
  | 'OFFLINE';

export interface Lead {
  id: string;
  company_id: string;
  name: string;
  email?: string;
  phone: string;
  status: LeadStatus;
  source: LeadSource;
  interest_type?: string[];
  min_area?: number;
  max_budget?: number;
  preferred_location?: string[];
  notes?: string;
  assigned_to?: string;
  property_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface LeadInteraction {
  id: string;
  lead_id: string;
  type: 'CALL' | 'EMAIL' | 'WHATSAPP' | 'MEETING' | 'NOTE';
  description: string;
  user_id: string;
  created_at: string;
}
