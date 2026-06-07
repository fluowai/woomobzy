import { Block, LandingPageTheme, BlockStyles } from '../types/landingPage';

export type SiteStatus = 'active' | 'inactive';

export interface SiteMenuItem {
  id: string;
  label: string;
  type: 'page' | 'custom' | 'dropdown';
  pageId?: string;
  url?: string;
  target?: '_self' | '_blank';
  children?: SiteMenuItem[];
  order: number;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  businessHours?: string;
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  youtube?: string;
  linkedin?: string;
  twitter?: string;
  tiktok?: string;
}

export interface Site {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
  logoUrl?: string;
  faviconUrl?: string;
  globalTheme: Partial<LandingPageTheme>;
  globalHeader: Block[];
  globalFooter: Block[];
  menuConfig: SiteMenuItem[];
  contactInfo: ContactInfo;
  socialLinks: SocialLinks;
  customCss?: string;
  customJs?: string;
  customHead?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SitePage {
  id: string;
  siteId: string;
  title: string;
  slug: string;
  sortOrder: number;
  blocks: Block[];
  themeOverrides: Partial<LandingPageTheme>;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  ogImage?: string;
  status: 'draft' | 'published';
  isHome: boolean;
  customCss?: string;
  customJs?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SiteTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: 'rural' | 'urban' | 'universal';
  pages: Array<{
    title: string;
    slug: string;
    isHome: boolean;
    blocks: Block[];
  }>;
  globalTheme: Partial<LandingPageTheme>;
  menuConfig: SiteMenuItem[];
  contactInfo?: ContactInfo;
  socialLinks?: SocialLinks;
}

export type CreateSiteInput = Partial<Omit<Site, 'id' | 'createdAt' | 'updatedAt'>>;

export type UpdateSiteInput = Partial<Omit<Site, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>>;

export type CreateSitePageInput = Partial<Omit<SitePage, 'id' | 'createdAt' | 'updatedAt'>>;

export type UpdateSitePageInput = Partial<Omit<SitePage, 'id' | 'siteId' | 'createdAt' | 'updatedAt'>>;
