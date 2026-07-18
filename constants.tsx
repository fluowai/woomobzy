import {
  SiteSettings,
} from './types';
import { COMMERCIAL_PRODUCT_NAME } from './utils/branding';


export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  agencyName: COMMERCIAL_PRODUCT_NAME,
  templateId: 'modern',
  primaryColor: '#16A34A',
  secondaryColor: '#052E1A',
  logoUrl: '',
  logoHeight: 80,
  contactPhone: '(11) 99999-9999',
  contactEmail: 'contato@imobiliaria.com',
  socialLinks: {
    instagram: '',
    facebook: '',
    whatsapp: '',
  },
  footerText: 'Sua imobiliária de confiança no mercado.',
};
