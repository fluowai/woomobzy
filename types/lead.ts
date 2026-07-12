import { PropertyAptitude, PropertyType } from './property';

export interface Lead {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  niche?: string;
  region?: string;
  status:
    | 'Novo'
    | 'Qualificacao'
    | 'Visita'
    | 'Simulacao'
    | 'Documentacao'
    | 'Em Atendimento'
    | 'Proposta'
    | 'Fechado'
    | 'Perdido'
    | 'Pessoal';
  classification?: string;
  lead_score?: number;
  ai_profile?: {
    temperature?: 'frio' | 'morno' | 'quente';
    stage?: string;
    intent?: string;
    confidence?: number;
    nextAction?: {
      type?: string;
      title?: string;
      dueAt?: string;
      reason?: string;
    };
    visit?: {
      requested?: boolean;
      scheduledAt?: string;
      propertyHint?: string;
      notes?: string;
    };
    handoffRequired?: boolean;
    handoffReason?: string;
  };
  ai_next_action?: string;
  ai_last_intent?: string;
  ai_last_confidence?: number;
  next_follow_up_at?: string;
  next_visit_at?: string;
  tags?: string[];
  aptitude_interest?: PropertyAptitude[];
  budget?: number;
  preferences?: {
    type?: PropertyType;
    neighborhood?: string;
    minArea?: number;
    states?: string[];
  };
  createdAt: string;
  propertyId?: string;
  notes?: string;
  chat_jid?: string;
  property?: {
    title: string;
    price: number;
    image: string;
  };
  ad_reference?: string;
  organic_channel?: string;
  last_contacted_at?: string;
  campaign?: string;
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

export interface User {
  id: string;
  name: string;
  role: 'ADMIN' | 'BROKER';
  agencyName: string;
  avatar: string;
}
