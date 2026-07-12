import { LayoutConfig } from './layout';

export interface SiteSettings {
  id?: string;
  agencyName: string;
  companyName?: string;
  isLive?: boolean;
  templateId: 'modern' | 'classic' | 'minimal';
  primaryColor: string;
  secondaryColor: string;
  headerColor?: string;
  logoUrl: string;
  logoHeight?: number;
  fontFamily?: string;
  baseFontSize?: number;
  headingFontSize?: number;
  contactPhone: string;
  contactEmail: string;
  contactWhatsappTemplate?: string;
  socialLinks: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
    youtube?: string;
    linkedin?: string;
  };
  footerText: string;
  tracking_pixels?: {
    facebook?: { enabled: boolean; pixelId: string; testMode?: boolean };
    google_analytics?: { enabled: boolean; measurementId: string; testMode?: boolean };
    google_ads?: { enabled: boolean; conversionId: string; conversionLabel?: string; testMode?: boolean };
  };
  homeContent?: {
    heroTitle?: string;
    heroSubtitle?: string;
    featuredTitle?: string;
    featuredSubtitle?: string;
    featuredDescription?: string;
    badgeText?: string;
    heroFontSize?: number;
    broker?: {
      name?: string;
      photoUrl?: string;
      creci?: string;
      specialty?: string;
      phone?: string;
      instagram?: string;
    };
  };
  integrations?: {
    groq?: { apiKey: string; model?: string };
    gemini?: { apiKey: string };
    openai?: { apiKey: string; model?: string };
    namoBana?: { apiKey: string };
    asaas?: { apiKey: string; environment?: 'sandbox' | 'production' };
    zapsign?: { apiKey: string };
    orulo?: { enabled?: boolean };
    evolutionApi?: { apiKey: string; url?: string; enabled?: boolean; baseUrl?: string; token?: string; instanceName?: string };
    vivareal?: { enabled?: boolean; apiKey?: string; partnerId?: string };
    zap?: { enabled?: boolean; apiKey?: string; partnerId?: string };
    quintoandar?: { enabled?: boolean; apiKey?: string; secret?: string };
    imovelweb?: { enabled?: boolean; apiKey?: string };
  };
  layout_config?: LayoutConfig;
  custom_css?: string;
  custom_js?: string;
}

export type PortalName = 'vivareal' | 'zap' | 'quintoandar' | 'imovelweb';

export interface PortalPublishStatus {
  listingId?: string;
  url?: string;
  status: 'pending' | 'published' | 'failed' | 'unpublished';
  publishedAt?: string;
  syncedAt?: string;
  error?: string;
}

export interface SiteMenuItem {
  id: string;
  label: string;
  type: 'page' | 'custom';
  pageId?: string;
  url?: string;
  order: number;
}

export interface Site {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
  logoUrl?: string;
  faviconUrl?: string;
  globalTheme?: Record<string, any>;
  globalHeader?: any[];
  globalFooter?: any[];
  menuConfig?: SiteMenuItem[];
  contactInfo?: Record<string, any>;
  socialLinks?: Record<string, any>;
  customCss?: string;
  customJs?: string;
  customHead?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SitePage {
  id: string;
  siteId: string;
  title: string;
  slug: string;
  sortOrder: number;
  blocks: any[];
  themeOverrides?: Record<string, any>;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  ogImage?: string;
  status: 'draft' | 'published' | 'archived';
  isHome: boolean;
  customCss?: string;
  customJs?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SiteTemplatePage {
  title: string;
  slug: string;
  isHome: boolean;
  blocks: any[];
}

export interface SiteTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  category: string;
  globalTheme: Record<string, any>;
  menuConfig: SiteMenuItem[];
  pages: SiteTemplatePage[];
}

export type UpdateSiteInput = Partial<Site>;

export interface CreateSitePageInput {
  siteId: string;
  title: string;
  slug?: string;
  sortOrder?: number;
  blocks?: any[];
  themeOverrides?: Record<string, any>;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  ogImage?: string;
  status?: 'draft' | 'published' | 'archived';
  isHome?: boolean;
  customCss?: string;
  customJs?: string;
}

export type UpdateSitePageInput = Partial<Omit<CreateSitePageInput, 'siteId'>>;
