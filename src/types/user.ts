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
  organization_id: string;
  created_at: string;
  last_login?: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  plan_id?: string;
  status: 'active' | 'inactive' | 'suspended';
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  custom_domain?: string;
  niche?: 'rural' | 'traditional';
  settings?: Record<string, unknown>;
  created_at: string;
}

export interface TeamMember extends User {
  permissions: string[];
  is_active: boolean;
}
