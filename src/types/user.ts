export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'AGENT'
  | 'PARTNER'
  | 'OWNER'
  | 'BUYER';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  company_id: string;
  created_at: string;
  last_login?: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  plan: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  custom_domain?: string;
  settings?: Record<string, unknown>;
  created_at: string;
}

export interface TeamMember extends User {
  permissions: string[];
  is_active: boolean;
}
