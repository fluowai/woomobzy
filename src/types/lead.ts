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
  organization_id: string;
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
  matched_properties?: Array<{
    property_id: string;
    title: string;
    price: number;
    city?: string;
    neighborhood?: string;
    state?: string;
    image?: string;
    link?: string;
    score: number;
    classification?: string;
    engine?: 'urbano' | 'rural';
    reasons: string[];
  }>;
  match_summary?: string;
  matched_at?: string;
  match_profile?: 'urbano' | 'rural' | 'misto' | 'indefinido';
  match_whatsapp_message?: string;
}

export interface LeadInteraction {
  id: string;
  lead_id: string;
  type: 'CALL' | 'EMAIL' | 'WHATSAPP' | 'MEETING' | 'NOTE';
  description: string;
  user_id: string;
  created_at: string;
}
